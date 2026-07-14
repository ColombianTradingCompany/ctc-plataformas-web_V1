"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

// Kaffetal Club passports: a producer activates their Pasaporte redeeming the
// Número de Pasaporte BCP emitted for them. club_member_codes is
// service-role-only and producer_profiles.club_member_since is
// guard-protected, so the whole exchange has to happen here -- a producer JWT
// can neither read codes nor set its own membership column.

export type RedeemClubCodeResult = { ok: true } | { ok: false; message: string };

export async function redeemClubCode(rawCode: string): Promise<RedeemClubCodeResult> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, message: "Inicie sesión de nuevo para activar su Pasaporte." };

  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, message: "Escriba su Número de Pasaporte." };

  const service = createServiceRoleClient();

  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") {
    return { ok: false, message: "Solo las cuentas de productor pueden activar un Pasaporte del Kaffetal Club." };
  }

  const { data: row } = await service
    .from("club_member_codes")
    .select("id, kind, campaign, redeemed_by, revoked_at, assigned_to")
    .eq("code", code)
    .maybeSingle();

  if (!row || row.revoked_at) {
    return { ok: false, message: "Número de Pasaporte no válido. Verifíquelo o escríbanos por Retroalimentación y ayuda." };
  }
  if (row.redeemed_by) {
    // Re-entering your own already-active passport is a no-op success.
    return row.redeemed_by === user.id ? { ok: true } : { ok: false, message: "Este Pasaporte ya fue activado." };
  }
  // A passport emitted to a specific producer is personal -- the "verified"
  // half of the número de pasaporte. Unassigned (campaign) codes are open.
  if (row.assigned_to && row.assigned_to !== user.id) {
    return { ok: false, message: "Este Pasaporte fue emitido a nombre de otro productor." };
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
  if (!claimed?.length) return { ok: false, message: "Este Pasaporte ya fue activado." };

  // upsert, not update -- an account that never saved "Información general"
  // has no producer_profiles row yet (same reason InfoModal saves upsert).
  const { error } = await service
    .from("producer_profiles")
    .upsert({ profile_id: user.id, club_member_since: now }, { onConflict: "profile_id" });
  if (error) return { ok: false, message: "No pudimos activar su Pasaporte. Intente de nuevo." };

  await service.from("audit_log").insert({
    entity_type: "club_membership",
    entity_id: user.id,
    action: "code_redeemed",
    performed_by: user.id,
    notes: row.campaign ? `Pasaporte ${code} · Edición ${row.campaign}` : `Pasaporte ${code}`,
  });

  // Welcome note lands in "Retroalimentación y ayuda" (author_role defaults to 'bcp').
  await service.from("producer_comm_log").insert({
    producer_id: user.id,
    context_label: null,
    note: `¡Bienvenido al Kaffetal Club! Su Pasaporte${row.campaign ? ` «${row.campaign}»` : ""} quedó activo: desde ahora puede firmar contratos de compra con CTC y sus lotes galardonados participan en el catálogo activo y en el mercado de Cherry Picked (Europa).`,
  });

  return { ok: true };
}

// "Solicitar mi Pasaporte": the passport can be requested -- the request lands
// as a note in the producer's own Retroalimentación feed (author 'producer'),
// which BCP sees in /bcp/productores and answers by emitting the passport from
// /bcp/club once the producer earns a galardón.
export type RequestPassportResult = { ok: true; already: boolean } | { ok: false; message: string };

const PASSPORT_REQUEST_NOTE = "Solicitó su Pasaporte del Kaffetal Club.";

export async function requestClubPassport(): Promise<RequestPassportResult> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, message: "Inicie sesión de nuevo para solicitar su Pasaporte." };

  const service = createServiceRoleClient();

  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "producer") {
    return { ok: false, message: "Solo las cuentas de productor pueden solicitar un Pasaporte." };
  }

  const { data: pp } = await service.from("producer_profiles").select("club_member_since").eq("profile_id", user.id).maybeSingle();
  if (pp?.club_member_since) return { ok: false, message: "Su Pasaporte ya está activo." };

  // One standing request is enough -- don't stack duplicates in the feed.
  const { data: existing } = await service
    .from("producer_comm_log")
    .select("id")
    .eq("producer_id", user.id)
    .eq("author_role", "producer")
    .eq("note", PASSPORT_REQUEST_NOTE)
    .limit(1);
  if (existing?.length) return { ok: true, already: true };

  const { error } = await service.from("producer_comm_log").insert({
    producer_id: user.id,
    context_label: null,
    note: PASSPORT_REQUEST_NOTE,
    author_role: "producer",
  });
  if (error) return { ok: false, message: "No se pudo registrar la solicitud. Intente de nuevo." };

  return { ok: true, already: false };
}
