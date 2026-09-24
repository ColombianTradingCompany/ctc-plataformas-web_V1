"use server";

import { createSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { DECLARACIONES } from "@/lib/trato/terminos";
import { formatCop } from "@/lib/arena/inscriptions";

// ── La respuesta del productor a una oferta (V5.18 · con declaración desde la V5.83) ────────
// lot_offers es de solo lectura para el productor (RLS select-own); TODA
// escritura pasa por aquí con service role — el mismo patrón de
// src/lib/arena/producerActions.ts (cliente de sesión para la identidad +
// cliente service-role para la escritura). Devuelve resultado, nunca lanza.
//
// ACEPTAR ES DONDE NACE EL CONTRATO — y desde la V5.83 (folio 8, paso 15; fase 6 del PLAN_CIRCUITO_DEL_LOTE)
// nace LLENO: el precio es el de la oferta, la cantidad es la que el productor DECLARA (≥ el mínimo del grado,
// ≤ el máximo de una directa), por trimestre o por 30 días, aceptando los términos de retiro, mora y ruptura
// (`terms_version`). CTCx ya no teclea nada al firmar: solo firma. Rechazar cierra la oferta con la nota del
// productor — y no crea nada. Una oferta con ventana (directa) vencida no se puede aceptar.

export type RespuestaOferta = { ok: true } | { ok: false; message: string };

export type DeclaracionDelProductor = {
  /** Lo que compromete, kg de CPS. */
  lockedKg: number;
  declaracion: (typeof DECLARACIONES)[number];
  /** Marcó la casilla de las condiciones de retiro, mora y ruptura. */
  aceptaTerminos: boolean;
};

async function requireProducer(): Promise<{ userId: string } | { error: string }> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: "Inicie sesión de nuevo." };
  const service = createServiceRoleClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") return { error: "Solo las cuentas de productor pueden responder ofertas." };
  return { userId: user.id };
}

export async function respondToOffer(
  offerId: string,
  respuesta: "aceptar" | "rechazar",
  note?: string,
  declaracion?: DeclaracionDelProductor
): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();

  const { data: offer } = await service
    .from("lot_offers")
    .select(
      "id, lot_id, producer_id, status, kind, grade_snapshot, season_id, price_per_kg, quantity_kg, terms_version, min_kg, max_kg, compra_inicial_kg, reference_price_source, reference_price_snapshot, pvc_edition_id, modificador_pct, expira_at, lots(name)"
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!offer || offer.producer_id !== auth.userId) return { ok: false, message: "Oferta no encontrada." };
  if (offer.status !== "emitida") return { ok: false, message: "Esta oferta ya fue respondida o retirada." };

  const lot = (Array.isArray(offer.lots) ? offer.lots[0] : offer.lots) as { name: string } | null;
  const cleanNote = note?.trim() || null;
  const now = new Date().toISOString();

  if (respuesta === "rechazar") {
    await service
      .from("lot_offers")
      .update({ status: "rechazada", responded_at: now, response_note: cleanNote })
      .eq("id", offerId);
    await service.from("audit_log").insert({
      entity_type: "lot_offer",
      entity_id: offer.lot_id,
      action: "offer_rejected",
      previous_status: "emitida",
      new_status: "rechazada",
      performed_by: auth.userId,
      notes: cleanNote?.slice(0, 300) ?? null,
    });
    return { ok: true };
  }

  // Una directa vence: pasada su ventana ya no se acepta (queda «expirada», con rastro).
  if (offer.expira_at && new Date(offer.expira_at).getTime() < Date.now()) {
    await service.from("lot_offers").update({ status: "expirada", responded_at: now }).eq("id", offerId);
    await service.from("audit_log").insert({ entity_type: "lot_offer", entity_id: offer.lot_id, action: "offer_expired", previous_status: "emitida", new_status: "expirada", performed_by: auth.userId });
    return { ok: false, message: `Esta oferta venció el ${new Date(offer.expira_at).toLocaleDateString("es-CO")}. CTC puede emitir otra.` };
  }

  // V5.83 · la DECLARACIÓN: obligatoria para toda oferta con términos (temporada · directa · excepción).
  const minKg = offer.min_kg != null ? Number(offer.min_kg) : null;
  const maxKg = offer.max_kg != null ? Number(offer.max_kg) : null;
  let lockedKg: number | null = offer.quantity_kg != null ? Number(offer.quantity_kg) : null;
  let declarado: DeclaracionDelProductor["declaracion"] | null = null;
  if (offer.terms_version) {
    if (!declaracion) return { ok: false, message: "Esta oferta se acepta con su declaración: cuánto compromete, por trimestre o por 30 días, y las condiciones." };
    const kg = Number(declaracion.lockedKg);
    if (!Number.isFinite(kg) || kg <= 0) return { ok: false, message: "Escriba cuántos kilos de CPS compromete." };
    if (minKg != null && kg < minKg) return { ok: false, message: `El mínimo para este grado es ${minKg} kg de CPS.` };
    if (maxKg != null && kg > maxKg) return { ok: false, message: `Esta oferta admite hasta ${maxKg} kg.` };
    if (!DECLARACIONES.includes(declaracion.declaracion)) return { ok: false, message: "Elija si declara por trimestre o por 30 días." };
    if (!declaracion.aceptaTerminos) return { ok: false, message: "Para aceptar hay que marcar las condiciones de retiro, mora y ruptura." };
    lockedKg = kg;
    declarado = declaracion.declaracion;
  }

  // Aceptar ⇒ el contrato nace aquí, LLENO, pendiente de la firma de CTC.
  const { data: contract, error } = await service
    .from("purchase_contracts")
    .insert({
      lot_id: offer.lot_id,
      status: "pending_signature",
      grade_snapshot: offer.grade_snapshot,
      season_id: offer.season_id,
      offer_id: offer.id,
      price_per_kg_locked: Number(offer.price_per_kg),
      quantity_frozen_kg: lockedKg,
      reference_price_source: offer.reference_price_source ?? null,
      reference_price_snapshot: offer.reference_price_snapshot != null ? Number(offer.reference_price_snapshot) : null,
      freeze_months: declarado === "30_dias" ? 1 : 3,
      terms_version: offer.terms_version ?? null,
      declaracion: declarado,
      compra_inicial_kg: offer.compra_inicial_kg != null ? Number(offer.compra_inicial_kg) : null,
      pvc_edition_id: offer.pvc_edition_id ?? null,
      modificador_pct: offer.modificador_pct != null ? Number(offer.modificador_pct) : null,
    })
    .select("id")
    .single();
  if (error || !contract) return { ok: false, message: "No se pudo crear el contrato. Intente de nuevo." };

  await service
    .from("lot_offers")
    .update({
      status: "aceptada",
      responded_at: now,
      response_note: cleanNote,
      contract_id: contract.id,
      ...(declarado ? { locked_kg: lockedKg, declaracion: declarado, terms_accepted_at: now } : {}),
    })
    .eq("id", offerId);
  const declaradoTxt = declarado ? ` · declaró ${lockedKg} kg (${declarado === "trimestre" ? "trimestre" : "30 días"}) · términos ${offer.terms_version}` : "";
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contract.id,
    action: "created",
    new_status: "pending_signature",
    performed_by: auth.userId,
    notes: `Nace de la oferta ${offer.kind} aceptada por el productor · ${formatCop(Number(offer.price_per_kg))}/kg${lockedKg ? ` · ${lockedKg} kg` : ""}${declaradoTxt}.`,
  });
  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: offer.lot_id,
    action: "offer_accepted",
    previous_status: "emitida",
    new_status: "aceptada",
    performed_by: auth.userId,
    notes: declaradoTxt.trim() || null,
  });
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: offer.lot_id,
    note: declarado
      ? `Usted aceptó la oferta de CTC y declaró ${lockedKg} kg de CPS por ${declarado === "trimestre" ? "el trimestre" : "30 días"} a ${formatCop(Number(offer.price_per_kg))}/kg. El contrato quedó creado con ese precio y esa cantidad, pendiente solo de la firma de CTC${offer.compra_inicial_kg ? `; CTC compra de inmediato ${Number(offer.compra_inicial_kg)} kg` : ""}. Lo verá en «Contratos y Compras» → Contratos de Temporada.`
      : "Usted aceptó la oferta de CTC. El contrato quedó creado con el precio de la oferta, pendiente de la firma de CTC — lo verá avanzar en «Contratos y Compras» → Contratos de Temporada.",
    created_by: auth.userId,
  });

  return { ok: true };
}
