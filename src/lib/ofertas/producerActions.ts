"use server";

import { createSessionClient, createServiceRoleClient } from "@/lib/supabase/server";

// ── La respuesta del productor a una oferta (V5.18) ─────────────────────────
// lot_offers es de solo lectura para el productor (RLS select-own); TODA
// escritura pasa por aquí con service role — el mismo patrón de
// src/lib/arena/producerActions.ts (cliente de sesión para la identidad +
// cliente service-role para la escritura). Devuelve resultado, nunca lanza.
//
// ACEPTAR ES DONDE NACE EL CONTRATO: pending_signature con el grado y la
// temporada CONGELADOS en la oferta. CTC pone precio de referencia y firma
// después con el signContract de siempre (su compuerta del Club se satisface
// sola: la membresía llegó con el galardón, V5.17). Rechazar cierra la oferta
// con la nota del productor — y no crea nada.

export type RespuestaOferta = { ok: true } | { ok: false; message: string };

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
  note?: string
): Promise<RespuestaOferta> {
  const auth = await requireProducer();
  if ("error" in auth) return { ok: false, message: auth.error };
  const service = createServiceRoleClient();

  const { data: offer } = await service
    .from("lot_offers")
    .select("id, lot_id, producer_id, status, kind, grade_snapshot, season_id, price_per_kg, quantity_kg, lots(name)")
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

  // Aceptar ⇒ el contrato nace aquí, pendiente de firma de CTC.
  const { data: contract, error } = await service
    .from("purchase_contracts")
    .insert({
      lot_id: offer.lot_id,
      status: "pending_signature",
      grade_snapshot: offer.grade_snapshot,
      season_id: offer.season_id,
    })
    .select("id")
    .single();
  if (error || !contract) return { ok: false, message: "No se pudo crear el contrato. Intente de nuevo." };

  await service
    .from("lot_offers")
    .update({ status: "aceptada", responded_at: now, response_note: cleanNote, contract_id: contract.id })
    .eq("id", offerId);
  await service.from("audit_log").insert({
    entity_type: "purchase_contract",
    entity_id: contract.id,
    action: "created",
    new_status: "pending_signature",
    performed_by: auth.userId,
    notes: `Nace de la oferta ${offer.kind} aceptada por el productor · $${offer.price_per_kg}/kg${offer.quantity_kg ? ` · ${offer.quantity_kg} kg` : ""}.`,
  });
  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: offer.lot_id,
    action: "offer_accepted",
    previous_status: "emitida",
    new_status: "aceptada",
    performed_by: auth.userId,
  });
  await service.from("producer_comm_log").insert({
    producer_id: auth.userId,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: offer.lot_id,
    note: "Usted aceptó la oferta de CTC. El contrato quedó creado, pendiente de la firma de CTC — lo verá avanzar en «Contratos y Compras» → Contratos de Temporada.",
    created_by: auth.userId,
  });

  return { ok: true };
}
