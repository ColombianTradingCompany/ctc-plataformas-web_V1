import type { SupabaseClient } from "@supabase/supabase-js";
import { TARIFA_EVALUACION_COP } from "@/lib/trato/terminos";

// ── La solicitud de evaluación (nació como «inscripción de Arena») ───────────
// La fila de `arena_inscriptions` ES la solicitud de evaluación de un lote (PLAN_CIRCUITO_DEL_LOTE §3,
// CONSERVAR: «se le cambia el nombre en el vocabulario, no en la base»). Nace cuando el productor de un
// lote Apto la pide (o CTCx en su nombre) y lleva el tramo pagado en `phase`:
//   postulacion (solicitada: factura, pago y muestra) → fila (a evaluar) → sondeo (en un bache) → galardonado | retirado
// `status` es el pago: pendiente → pagado | exento. El descuento sale de la subvención que CTCx decide
// (`subvencion_id`) o de un código de campaña (KRX-); el pago se confirma a mano sobre la factura de cobro.

// V5.80: la tarifa vive en `src/lib/trato/terminos.ts` ($200.000, respuesta 2 del owner). Los dos nombres
// de abajo se conservan porque los usan pantallas y acciones ya desplegadas; son el MISMO número.
export const ARENA_FEE_COP = TARIFA_EVALUACION_COP;
export const EVALUATION_FEE_COP = ARENA_FEE_COP;

/** Un bache de sondeo admite máximo 30 lotes (regla del owner, 2026-07-20). */
export const MAX_BATCH_LOTS = 30;

/** COP a pagar tras aplicar el descuento del código (0–100%). */
export function dueFor(pct: number, amountCop: number = ARENA_FEE_COP): number {
  return amountCop - Math.round((amountCop * pct) / 100);
}

export type InscriptionStatus = "pendiente" | "pagado" | "exento";

// El tramo pagado, fase por fase. 'fila' es SÓLO la sala de espera del sondeo
// (paga+muestra confirmadas, esperando bache); una vez el sondeo aprueba, el
// lote pasa a 'arena' — sale de Nominados y aparece en el módulo Arena, listo
// para bloquearse en una sesión. Antes 'aprobado' se quedaba en 'fila', lo que
// mezclaba "esperando sondeo" con "listo para sesión" (corregido 2026-07-21).
export type InscriptionPhase =
  | "postulacion"
  | "sondeo"
  | "fila"
  // Terminal del camino base desde V5.17: la evaluación del bache galardonó.
  | "galardonado"
  // Reservadas para la vitrina de la Arena (overlay post-galardón).
  | "arena"
  | "sesion"
  | "competido"
  | "retirado";

export const PHASE_LABEL: Record<InscriptionPhase, string> = {
  postulacion: "Postulado",
  sondeo: "Sondeo preliminar",
  fila: "En fila",
  galardonado: "Galardonado",
  arena: "Clasificado a Arena",
  sesion: "Sesión asignada",
  competido: "Compitió",
  retirado: "Retirado",
};

export type SondeoResult = "aprobado" | "rechazado";

export type ArenaInscription = {
  id: string;
  lot_id: string;
  producer_id: string;
  amount_cop: number;
  discount_pct: number;
  discount_cop: number;
  amount_due_cop: number;
  status: InscriptionStatus;
  payment_ref: string | null;
  notes: string | null;
  confirmed_at: string | null;
  // Paid-track pipeline (2026-07-17)
  phase: InscriptionPhase;
  postulated_at: string;
  postulated_by: string | null; // null = the producer postulated it themselves
  entry_code: string | null; // denormalized active code (KRA-/KRX-), visible to the producer via select-own RLS
  entry_code_id: string | null;
  sondeo_batch_id: string | null;
  sondeo_sample_ready_at: string | null;
  sondeo_result: SondeoResult | null;
  sondeo_result_notes: string | null;
  sondeo_score: number | null;
  /** LISTA de planillas B2/B3 del laboratorio (jsonb; legado: objeto suelto — toLabEvaluationList lo normaliza). */
  sondeo_evaluation: unknown;
  sondeo_result_storage_path: string | null;
  sondeo_result_filename: string | null;
  season_id: string | null;
  // V5.80 · la solicitud (fase 3): la nota del productor, la factura de cobro, la subvención decidida, contra entrega.
  nota_solicitud: string | null;
  factura_ref: string | null;
  factura_emitida_at: string | null;
  factura_emitida_by: string | null;
  subvencion_id: string | null;
  pago_contra_entrega: boolean;
  mejoras_doc: string | null;
  mejoras_generated_at: string | null;
  cashback_cop: number | null;
  cashback_status: "pendiente" | "pagado" | null;
  cashback_paid_at: string | null;
  cashback_ref: string | null;
};

export function isSettled(status: InscriptionStatus | null | undefined): boolean {
  return status === "pagado" || status === "exento";
}

/** Formats COP for the panel/producer copy: 200000 → "$200.000". */
export function formatCop(v: number): string {
  return "$" + v.toLocaleString("es-CO");
}

/** True when this lot may enter the Arena (its inscription is paid or exempt). */
export async function lotInscriptionSettled(
  service: SupabaseClient,
  lotId: string
): Promise<boolean> {
  const { data } = await service.from("arena_inscriptions").select("status").eq("lot_id", lotId).maybeSingle();
  return isSettled(data?.status as InscriptionStatus | undefined);
}

/**
 * Avanza postulacion → fila cuando pago Y muestra están confirmados (folio 7, paso 10: «recibe café Y pago →
 * Lotes a Evaluar»). La llaman las tres puertas que pueden cerrar la última condición —confirmar el pago,
 * asumir el costo, recibir la muestra— para que ninguna tenga que saber de las otras. (Era `maybeAdvanceToFila`
 * en `nominadosActions.ts`; V5.80 la saca aquí porque el recibo ya no vive solo allí.)
 */
export async function avanzarAFilaSiCompleta(service: SupabaseClient, lotId: string): Promise<void> {
  const [{ data: ins }, { data: lot }] = await Promise.all([
    service.from("arena_inscriptions").select("id, status, phase").eq("lot_id", lotId).maybeSingle(),
    service.from("lots").select("sample_2kg_confirmed_at").eq("id", lotId).maybeSingle(),
  ]);
  if (!ins || ins.phase !== "postulacion") return;
  if (isSettled(ins.status as InscriptionStatus) && lot?.sample_2kg_confirmed_at) {
    await service.from("arena_inscriptions").update({ phase: "fila" }).eq("id", ins.id);
  }
}
