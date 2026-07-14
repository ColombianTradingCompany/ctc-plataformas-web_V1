"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

// Kaffetal Club: a producer redeems a BCP-emitted member code to activate
// membership. club_member_codes is service-role-only and
// producer_profiles.club_member_since is guard-protected, so the whole
// exchange has to happen here -- a producer JWT can neither read codes nor
// set its own membership column.

export type RedeemClubCodeResult = { ok: true } | { ok: false; message: string };

export async function redeemClubCode(rawCode: string): Promise<RedeemClubCodeResult> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, message: "Inicie sesión de nuevo para canjear su código." };

  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, message: "Escriba su código de miembro." };

  const service = createServiceRoleClient();

  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") {
    return { ok: false, message: "Solo las cuentas de productor pueden unirse al Kaffetal Club." };
  }

  const { data: row } = await service
    .from("club_member_codes")
    .select("id, redeemed_by, revoked_at")
    .eq("code", code)
    .maybeSingle();

  if (!row || row.revoked_at) {
    return { ok: false, message: "Código no válido. Verifíquelo o escríbanos por Retroalimentación y ayuda." };
  }
  if (row.redeemed_by) {
    // Redeeming your own already-redeemed code is a no-op success, not an error.
    return row.redeemed_by === user.id ? { ok: true } : { ok: false, message: "Este código ya fue utilizado." };
  }

  const now = new Date().toISOString();
  // Claim the code conditioned on it still being unredeemed, so two
  // concurrent redemptions of the same code can't both win.
  const { data: claimed } = await service
    .from("club_member_codes")
    .update({ redeemed_by: user.id, redeemed_at: now })
    .eq("id", row.id)
    .is("redeemed_by", null)
    .select("id");
  if (!claimed?.length) return { ok: false, message: "Este código ya fue utilizado." };

  // upsert, not update -- an account that never saved "Información general"
  // has no producer_profiles row yet (same reason InfoModal saves upsert).
  const { error } = await service
    .from("producer_profiles")
    .upsert({ profile_id: user.id, club_member_since: now }, { onConflict: "profile_id" });
  if (error) return { ok: false, message: "No pudimos activar su membresía. Intente de nuevo." };

  await service.from("audit_log").insert({
    entity_type: "club_membership",
    entity_id: user.id,
    action: "code_redeemed",
    performed_by: user.id,
    notes: `Código ${code}`,
  });

  // Welcome note lands in "Retroalimentación y ayuda" (author_role defaults to 'bcp').
  await service.from("producer_comm_log").insert({
    producer_id: user.id,
    context_label: null,
    note: "¡Bienvenido al Kaffetal Club! Su membresía quedó activa: desde ahora sus lotes galardonados pueden firmar contrato con CTC y participar en el catálogo activo de Cherry Picked.",
  });

  return { ok: true };
}
