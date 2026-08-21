import type { createServiceRoleClient } from "@/lib/supabase/server";

// ── La membresía del Kaffetal Club, en UN solo sitio (V5.17) ────────────────
// Desde 2026-07-17 el Pasaporte se otorga AUTOMÁTICAMENTE, nunca por código.
// Lo que cambió en V5.17 es el MOMENTO: antes lo daba competir en una jornada
// de Arena (finalizeJornada); ahora lo da el GALARDÓN — completar la
// evaluación por Q-Grader en bache, que es el camino base de todos los lotes.
// La Arena quedó como vitrina opcional y ya no reparte membresías.
//
// La función es idempotente a dos niveles: el Set `yaOtorgados` evita el doble
// upsert dentro de una misma corrida (varios lotes del mismo productor), y la
// consulta de `club_member_since` respeta una membresía ya existente — jamás
// se re-fecha un Pasaporte.
export async function grantClubMembershipOnce(
  service: ReturnType<typeof createServiceRoleClient>,
  producerId: string,
  adminId: string,
  yaOtorgados: Set<string>
): Promise<void> {
  if (yaOtorgados.has(producerId)) return;
  yaOtorgados.add(producerId);
  const { data: pp } = await service.from("producer_profiles").select("club_member_since").eq("profile_id", producerId).maybeSingle();
  if (pp?.club_member_since) return;
  await service.from("producer_profiles").upsert(
    { profile_id: producerId, club_member_since: new Date().toISOString() },
    { onConflict: "profile_id" }
  );
  await service.from("audit_log").insert({
    entity_type: "club_membership",
    entity_id: producerId,
    action: "granted_by_galardon",
    performed_by: adminId,
    notes: "Su lote fue galardonado — Pasaporte del Kaffetal Club otorgado.",
  });
  await service.from("producer_comm_log").insert({
    producer_id: producerId,
    context_label: null,
    note: "¡Bienvenido al Kaffetal Club! Su lote fue galardonado, así que su Pasaporte quedó activo: ya puede firmar contratos de compra con CTC y sus lotes participan en el catálogo de Cherry Picked.",
    created_by: adminId,
  });
}
