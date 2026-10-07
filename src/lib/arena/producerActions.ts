"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { EXISTENCIA_REQUERIDA, existenciaValida, guardarExistencia } from "@/lib/kaffetal/existencia";
import { ARENA_FEE_COP, formatCop, dueFor } from "@/lib/arena/inscriptions";
import { claimCampaignCode, insertEntryCode, peekCampaignCode } from "@/lib/arena/entryCodes";
import { currentSeason, lotSeasonCount, MAX_SEASONS_PER_LOT } from "@/lib/arena/seasons";
import { campanaPorDefecto } from "@/lib/arena/subvencionServidor";
import { cargarCarrilDePago } from "@/lib/arena/carrilServidor";
import { CARRIL_SIN_CONFIGURAR, type CarrilDePago } from "@/lib/arena/payment";

// ── Postulación a la Kaffetal Regal Arena (lado productor) ──────────────────
// arena_inscriptions y arena_entry_codes son service-role-only en escritura,
// así que la postulación vive aquí (mismo patrón del resto de actions: cliente
// de sesión para la identidad + cliente service-role para la escritura).
// Todas devuelven resultado — nunca lanzan.

export type PostularResult =
  | { ok: true; entryCode: string; discountPct: number; dueCop: number }
  | { ok: false; message: string };

async function requireProducer(): Promise<{ userId: string } | { error: string }> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: "Inicie sesión de nuevo." };
  const service = createServiceRoleClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") return { error: "Solo las cuentas de productor pueden postular lotes." };
  return { userId: user.id };
}

/** V5.80 (folio 7, paso 7): el productor puede pedir un descuento por NOTA; CTCx decide la subvención al corroborar.
 *  V5.181 (owner): la existencia del lote es OBLIGATORIA al solicitar (se envía la muestra): la que ya tenga registrada vale, y si
 *  la escribe aquí la corrige. */
export async function postularLote(lotId: string, campaignCode?: string, notaSolicitud?: string, existenciaKg?: number): Promise<PostularResult> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();

  const { data: lot } = await service
    .from("lots")
    .select("id, name, stage, producer_id, existencia_cps_kg")
    .eq("id", lotId)
    .maybeSingle();
  if (!lot || lot.producer_id !== auth.userId) return { ok: false, message: "Lote no encontrado." };
  if (lot.stage !== "apto") {
    return { ok: false, message: "Solo un lote declarado Apto por CTC puede solicitar evaluación." };
  }
  const existencia = existenciaKg != null ? existenciaValida(existenciaKg) : lot.existencia_cps_kg != null ? Number(lot.existencia_cps_kg) : null;
  if (existencia == null) return { ok: false, message: EXISTENCIA_REQUERIDA };
  const { data: existing } = await service.from("arena_inscriptions").select("id").eq("lot_id", lotId).maybeSingle();
  if (existing) return { ok: false, message: "Este lote ya está postulado." };
  // Regla: un lote participa en máximo 2 temporadas.
  if ((await lotSeasonCount(service, lotId)) >= MAX_SEASONS_PER_LOT) {
    return { ok: false, message: `Este lote ya participó en sus ${MAX_SEASONS_PER_LOT} temporadas permitidas.` };
  }
  const season = await currentSeason(service);

  // El código: uno de campaña (con su descuento) o —V5.95, owner 2026-09-30— el de la campaña por defecto de KR (30 %):
  // quien solicita por el panel nunca paga la tarifa plena; CTCx puede subir la subvención al corroborar.
  let codeRow;
  let subvencionId: string | null = null;
  if (campaignCode?.trim()) {
    codeRow = await claimCampaignCode(service, campaignCode, auth.userId, lotId);
    if (!codeRow) return { ok: false, message: "El código de campaña no es válido o ya fue usado." };
    subvencionId = codeRow.campaign_id ?? null;
  } else {
    try {
      const campana = await campanaPorDefecto(service);
      subvencionId = campana.id;
      codeRow = await insertEntryCode(service, {
        kind: "campana",
        prefix: "KRX",
        discountPct: campana.discount_pct,
        campaignId: campana.id,
        lotId,
        assignedTo: auth.userId,
      });
      await service.from("arena_entry_codes").update({ redeemed_at: new Date().toISOString() }).eq("id", codeRow.id);
    } catch {
      return { ok: false, message: "No se pudo generar el código de inscripción. Intente de nuevo." };
    }
  }

  const { error } = await service.from("arena_inscriptions").insert({
    lot_id: lotId,
    producer_id: auth.userId,
    amount_cop: ARENA_FEE_COP,
    discount_pct: codeRow.discount_pct,
    status: "pendiente",
    phase: "postulacion",
    postulated_by: null, // null = el productor mismo
    entry_code: codeRow.code,
    entry_code_id: codeRow.id,
    season_id: season?.id ?? null,
    subvencion_id: subvencionId,
    nota_solicitud: notaSolicitud?.trim().slice(0, 600) || null,
  });
  if (error) {
    // UNIQUE(lot_id) — carrera con otra postulación simultánea.
    return { ok: false, message: "Este lote ya está postulado." };
  }
  // V5.181: la existencia confirmada (o corregida) al solicitar.
  await guardarExistencia(service, { lotId, kg: existencia, porQuien: auth.userId, origen: "solicitud" });

  const due = dueFor(codeRow.discount_pct);
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "postulated",
    new_status: "postulacion",
    performed_by: auth.userId,
    notes: `Código ${codeRow.code} · descuento ${codeRow.discount_pct}% · a pagar ${formatCop(due)}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `Su solicitud de evaluación quedó registrada. Código: ${codeRow.code}${codeRow.discount_pct > 0 ? ` (subvención ${codeRow.discount_pct}%)` : ""} · tarifa: ${formatCop(due)}. CTC la corroborará (puede subir la subvención si pidió un descuento) y le emitirá la factura de cobro; con ella paga y envía la muestra de 2 kg contra entrega.`,
  });

  return { ok: true, entryCode: codeRow.code, discountPct: codeRow.discount_pct, dueCop: due };
}

export type PeekCodeResult =
  | { ok: true; discountPct: number; campaignName: string | null; dueCop: number }
  | { ok: false; message: string };

/** La revelación en vivo del descuento cuando el productor escribe un código. */
export async function peekCampaignCodeAction(rawCode: string): Promise<PeekCodeResult> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();
  const peek = await peekCampaignCode(service, rawCode, auth.userId);
  if (!peek.valid) return { ok: false, message: peek.message };
  return { ok: true, discountPct: peek.discountPct, campaignName: peek.campaignName, dueCop: dueFor(peek.discountPct) };
}

export type AplicarCodigoResult =
  | { ok: true; entryCode: string; discountPct: number; dueCop: number }
  | { ok: false; message: string };

/**
 * Cambia el código de una postulación YA hecha por uno de campaña — solo
 * mientras el pago siga pendiente (el descuento se congela al confirmarse).
 * El código anterior queda revocado (gastado).
 */
export async function aplicarCodigoCampana(lotId: string, rawCode: string): Promise<AplicarCodigoResult> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, status, entry_code_id, producer_id, lots(name)")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins || ins.producer_id !== auth.userId) return { ok: false, message: "Postulación no encontrada." };
  if (ins.status !== "pendiente") {
    return { ok: false, message: "El pago ya fue confirmado — el código quedó bloqueado." };
  }

  const codeRow = await claimCampaignCode(service, rawCode, auth.userId, lotId);
  if (!codeRow) return { ok: false, message: "El código de campaña no es válido o ya fue usado." };

  if (ins.entry_code_id) {
    await service.from("arena_entry_codes").update({ revoked_at: new Date().toISOString() }).eq("id", ins.entry_code_id);
  }
  await service
    .from("arena_inscriptions")
    .update({ discount_pct: codeRow.discount_pct, entry_code: codeRow.code, entry_code_id: codeRow.id })
    .eq("id", ins.id);

  const due = dueFor(codeRow.discount_pct);
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "code_applied",
    performed_by: auth.userId,
    notes: `Código ${codeRow.code} · descuento ${codeRow.discount_pct}% · a pagar ${formatCop(due)}`,
  });

  return { ok: true, entryCode: codeRow.code, discountPct: codeRow.discount_pct, dueCop: due };
}

/** V5.129 (owner): DÓNDE se paga la evaluación. Lo configura CTCx en el OCP (`platform_settings`, service-role-only), así que
 *  el productor lo recibe por aquí. No es secreto, pero solo se le entrega a una cuenta de productor con sesión. */
export async function carrilDePagoAction(): Promise<CarrilDePago> {
  const quien = await requireProducer();
  if ("error" in quien) return CARRIL_SIN_CONFIGURAR;
  return cargarCarrilDePago(createServiceRoleClient());
}
