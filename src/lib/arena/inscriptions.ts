import type { SupabaseClient } from "@supabase/supabase-js";

// ── Inscripción de Arena ─────────────────────────────────────────────────────
// Participating in the Arena costs COP 80.000 per lot (2026-07-16). It is the
// stick/carrot: CTC may discount it or fully exempt a producer. Payment happens
// OUT OF BAND (bank transfer) — the platform only records BCP's confirmation.
//
// "Settled" (pagado | exento) is the single condition that:
//   1. unlocks a lot into the Arena (confirmSampleReceived → fila_arena), and
//   2. qualifies a producer for a standard Pasaporte — since 2026-07-16 the
//      passport is the PAID ENTRY TICKET, not the post-galardón reward.
// Campaign passports (KCX-) remain the free/marketing path and skip this.

export const ARENA_FEE_COP = 80000;

export type InscriptionStatus = "pendiente" | "pagado" | "exento";

export type ArenaInscription = {
  id: string;
  lot_id: string;
  producer_id: string;
  amount_cop: number;
  discount_cop: number;
  amount_due_cop: number;
  status: InscriptionStatus;
  payment_ref: string | null;
  notes: string | null;
  confirmed_at: string | null;
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

/** True when the producer has at least one settled inscription (passport gate). */
export async function producerHasSettledInscription(
  service: SupabaseClient,
  producerId: string
): Promise<boolean> {
  const { data } = await service
    .from("arena_inscriptions")
    .select("id")
    .eq("producer_id", producerId)
    .in("status", ["pagado", "exento"])
    .limit(1);
  return Boolean(data?.length);
}
