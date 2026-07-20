"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { ARENA_FEE_COP, formatCop, dueFor } from "@/lib/arena/inscriptions";
import { claimCampaignCode, insertEntryCode, peekCampaignCode } from "@/lib/arena/entryCodes";
import { currentSeason, lotSeasonCount, MAX_SEASONS_PER_LOT } from "@/lib/arena/seasons";

// ── Postulación a la Kaffetal Regal Arena (lado productor) ──────────────────
// arena_inscriptions y arena_entry_codes son service-role-only en escritura,
// así que la postulación vive aquí (mismo patrón que club/actions.ts: cliente
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

export async function postularLote(lotId: string, campaignCode?: string): Promise<PostularResult> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();

  const { data: lot } = await service
    .from("lots")
    .select("id, name, stage, producer_id")
    .eq("id", lotId)
    .maybeSingle();
  if (!lot || lot.producer_id !== auth.userId) return { ok: false, message: "Lote no encontrado." };
  if (lot.stage !== "apto") {
    return { ok: false, message: "Solo un lote declarado Apto por CTC puede postularse a la Arena." };
  }
  const { data: existing } = await service.from("arena_inscriptions").select("id").eq("lot_id", lotId).maybeSingle();
  if (existing) return { ok: false, message: "Este lote ya está postulado." };
  // Regla: un lote participa en máximo 2 temporadas.
  if ((await lotSeasonCount(service, lotId)) >= MAX_SEASONS_PER_LOT) {
    return { ok: false, message: `Este lote ya participó en sus ${MAX_SEASONS_PER_LOT} temporadas permitidas.` };
  }
  const season = await currentSeason(service);

  // El código: uno de campaña (con su descuento) o el KRA- automático a precio pleno.
  let codeRow;
  if (campaignCode?.trim()) {
    codeRow = await claimCampaignCode(service, campaignCode, auth.userId, lotId);
    if (!codeRow) return { ok: false, message: "El código de campaña no es válido o ya fue usado." };
  } else {
    try {
      codeRow = await insertEntryCode(service, {
        kind: "lote",
        prefix: "KRA",
        discountPct: 0,
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
  });
  if (error) {
    // UNIQUE(lot_id) — carrera con otra postulación simultánea.
    return { ok: false, message: "Este lote ya está postulado." };
  }

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
    note: `Su lote quedó postulado a la Kaffetal Regal Arena. Código de inscripción: ${codeRow.code}${codeRow.discount_pct > 0 ? ` (descuento ${codeRow.discount_pct}%)` : ""} · valor a pagar: ${formatCop(due)}. Use el código como referencia del pago.`,
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
