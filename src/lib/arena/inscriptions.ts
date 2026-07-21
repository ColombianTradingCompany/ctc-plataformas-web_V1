import type { SupabaseClient } from "@supabase/supabase-js";

// ── Inscripción de Arena ─────────────────────────────────────────────────────
// Participating in the Arena costs COP 80.000 per lot (2026-07-16). Payment
// happens OUT OF BAND (Nequi transfer) — the platform only records BCP's
// confirmation.
//
// Since the 2026-07-17 restructuring the inscription row IS the paid track of
// a lot: it is created at POSTULATION (an Apto lot's producer asks to compete)
// and carries the whole pipeline in `phase`:
//   postulacion → sondeo → fila → sesion → competido | retirado
// `status` keeps its original meaning (payment): pendiente → pagado | exento.
// Discounts come exclusively from campaign entry codes (free % per campaign) —
// the old fixed 0/25/50/75/100 tramos are gone.

export const ARENA_FEE_COP = 80000;

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
  | "arena"
  | "sesion"
  | "competido"
  | "retirado";

export const PHASE_LABEL: Record<InscriptionPhase, string> = {
  postulacion: "Postulado",
  sondeo: "Sondeo preliminar",
  fila: "En fila",
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

/** Formats COP for the panel/producer copy: 80000 → "$80.000". */
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
