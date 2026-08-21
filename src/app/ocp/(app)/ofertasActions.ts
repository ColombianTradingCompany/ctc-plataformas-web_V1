"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { officialAverages, type EvaluationRow } from "@/lib/evaluations";
import { currentSeason, seasonKey, seasonLabel, type Season } from "@/lib/arena/seasons";
import { esGradoValido, type GradoId } from "@/lib/grados/definicion";

// ── Ofertas: CTCx confirma el trato, el productor decide (V5.18) ────────────
// El circuito comercial del galardón. CTCx EMITE la oferta desde aquí —
// referenciando la combinación Grado + Puntaje + Variedad + Proceso, congelada
// como snapshot — y el productor la acepta o la rechaza desde «Contratos y
// Compras». EL CONTRATO NACE DE LA ACEPTACIÓN (src/lib/ofertas/
// producerActions.ts), no de la emisión ni del veredicto: V5.18 retiró el
// contrato automático que el galardón creaba desde 2026-07-17.
//
// Tres clases de oferta, una por destino comercial del grado:
//   · temporada — red | blue | gold: la compra base con su escalera de
//     liberación de 3 meses.
//   · black — la consideración de compra directa (Black Stock): la abre
//     decideBlackNegotiation('comprar'), no esta pantalla — la negociación
//     sigue siendo el CRM de CTC; la oferta es su desenlace.
//   · subasta — tyrian: «el podio de los mejores, al mejor postor». La puja
//     del comprador NO está construida (fuera de alcance V5.18): CTC corre la
//     subasta fuera y registra aquí el mejor postor como oferta; aceptar crea
//     el contrato, igual que las demás.
//
// Regla de temporada (owner): solo lotes galardonados EN esta temporada o en
// la pasada (seasonKey, diferencia ≤ 1). El encuadre viaja congelado en la
// oferta (season_label + lote_de_temporada_pasada) porque harvest_seasons es
// service-role-only y el productor no podría derivarlo.

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/ocp/ofertas", "/ocp/contratos", "/ocp/ctc-selection", "/bcp"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

export type OfferKind = "temporada" | "black" | "subasta";

/** El grado que cada clase de oferta admite — la puerta es por CLASE. */
function kindAllowsGrade(kind: OfferKind, grade: GradoId): boolean {
  if (kind === "temporada") return grade === "red" || grade === "blue" || grade === "gold";
  if (kind === "black") return grade === "black";
  return grade === "tyrian";
}

/**
 * Emite una oferta sobre un lote galardonado. Reutilizable por la pantalla de
 * Ofertas (temporada · subasta) y por decideBlackNegotiation (black).
 */
export async function emitOffer(lotId: string, kind: OfferKind, formData: FormData): Promise<Result> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const price = Number(formData.get("price_per_kg"));
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Escriba el precio ofrecido por kg (COP)." };
  const quantityRaw = formData.get("quantity_kg");
  const quantity = quantityRaw ? Number(quantityRaw) : null;
  if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
    return { ok: false, error: "La cantidad, si se indica, debe ser mayor que 0 kg." };
  }
  const notes = String(formData.get("notes") || "").trim() || null;

  const { data: lot } = await service
    .from("lots")
    .select("id, name, stage, grade, producer_id, season_id, ficha_variedad, ficha_proceso")
    .eq("id", lotId)
    .maybeSingle();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "galardonado") return { ok: false, error: "Solo un lote galardonado puede recibir una oferta." };
  if (!lot.grade || !esGradoValido(lot.grade)) return { ok: false, error: "El lote no tiene un Grado CTC válido." };
  if (!kindAllowsGrade(kind, lot.grade)) {
    return { ok: false, error: `Un lote ${lot.grade} no entra en una oferta de clase «${kind}».` };
  }

  // «De esta temporada o la pasada» — la temporada del GALARDÓN es la de la
  // inscripción que lo evaluó (fallback: la de registro del lote). Un lote sin
  // temporada registrada no se bloquea: es un hueco de datos, no un lote viejo.
  const [{ data: ins }, vigente] = await Promise.all([
    service.from("arena_inscriptions").select("season_id").eq("lot_id", lotId).maybeSingle(),
    currentSeason(service),
  ]);
  const gradingSeasonId = ins?.season_id ?? lot.season_id ?? null;
  let lotePasado = false;
  if (gradingSeasonId && vigente) {
    const { data: gs } = await service
      .from("harvest_seasons")
      .select("id, kind, year, arena_starts_at, arena_ends_at")
      .eq("id", gradingSeasonId)
      .maybeSingle();
    if (gs) {
      const diff = seasonKey(vigente as Season) - seasonKey(gs as Season);
      if (diff > 1) {
        return { ok: false, error: `Ese lote se galardonó hace ${diff} temporadas (${seasonLabel(gs as Season)}) — solo se ofertan lotes de esta temporada o la pasada.` };
      }
      lotePasado = diff === 1;
    }
  }

  // Una sola oferta abierta por lote (el índice parcial lo garantiza; esto da
  // el error legible). Y un lote con contrato vivo no se re-oferta.
  const [{ data: abierta }, { data: contratoVivo }] = await Promise.all([
    service.from("lot_offers").select("id").eq("lot_id", lotId).eq("status", "emitida").maybeSingle(),
    service.from("purchase_contracts").select("id").eq("lot_id", lotId).in("status", ["pending_signature", "active", "reconditioning"]).maybeSingle(),
  ]);
  if (abierta) return { ok: false, error: "Este lote ya tiene una oferta abierta — retírela antes de emitir otra." };
  if (contratoVivo) return { ok: false, error: "Este lote ya tiene un contrato vivo." };

  // El puntaje del snapshot: el promedio oficial (evaluaciones aceptadas).
  const { data: evalRows } = await service
    .from("lot_evaluations")
    .select("status, sca_total, factor_rendimiento")
    .eq("lot_id", lotId);
  const media = officialAverages(((evalRows as EvaluationRow[] | null) ?? []));

  const { error } = await service.from("lot_offers").insert({
    lot_id: lotId,
    producer_id: lot.producer_id,
    season_id: vigente?.id ?? null,
    season_label: seasonLabel(vigente),
    lote_de_temporada_pasada: lotePasado,
    kind,
    status: "emitida",
    grade_snapshot: lot.grade,
    score_snapshot: media.scaAverage,
    variety_snapshot: lot.ficha_variedad || null,
    process_snapshot: lot.ficha_proceso || null,
    price_per_kg: price,
    quantity_kg: quantity,
    notes,
    emitted_by: adminId,
  });
  if (error) return { ok: false, error: "No se pudo emitir la oferta." };

  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: lotId,
    action: "offer_emitted",
    new_status: "emitida",
    performed_by: adminId,
    notes: `${kind} · ${lot.grade} · $${price}/kg${quantity ? ` · ${quantity} kg` : ""}`,
  });
  const donde = kind === "subasta" ? "Subastas Tyrian" : kind === "black" ? "Ofertas Black" : "Ofertas de Temporada";
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `CTC le envió una oferta por su lote galardonado (${lot.grade}). Revísela en «Contratos y Compras» → ${donde} — usted decide si la acepta o la rechaza.`,
    created_by: adminId,
  });

  revalidateAll();
  return { ok: true };
}

/** Retira una oferta abierta (emitida y sin responder). */
export async function retireOffer(offerId: string): Promise<Result> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data: offer } = await service.from("lot_offers").select("id, status, lot_id").eq("id", offerId).maybeSingle();
  if (!offer) return { ok: false, error: "Oferta no encontrada." };
  if (offer.status !== "emitida") return { ok: false, error: "Solo una oferta abierta puede retirarse." };
  await service.from("lot_offers").update({ status: "retirada", responded_at: new Date().toISOString() }).eq("id", offerId);
  await service.from("audit_log").insert({
    entity_type: "lot_offer",
    entity_id: offer.lot_id,
    action: "offer_retired",
    previous_status: "emitida",
    new_status: "retirada",
    performed_by: adminId,
  });
  revalidateAll();
  return { ok: true };
}
