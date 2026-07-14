"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") throw new Error("No autorizado.");

  return user.id;
}

// No I/O/0/1 so a code survives being read over the phone or handwritten.
// 32 chars exactly -> byte % 32 has no modulo bias.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % 32];
  return `KC-${s.slice(0, 4)}-${s.slice(4)}`;
}

export async function emitClubCode(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const note = String(formData.get("note") ?? "").trim() || null;

  // Retry on the (astronomically unlikely) unique collision instead of failing.
  let inserted: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    const code = generateCode();
    const { data, error } = await service
      .from("club_member_codes")
      .insert({ code, note, created_by: adminId })
      .select("id, code")
      .single();
    if (!error) inserted = data;
    else if (error.code !== "23505") throw new Error("No se pudo emitir el código: " + error.message);
  }
  if (!inserted) throw new Error("No se pudo emitir el código. Intente de nuevo.");

  await service.from("audit_log").insert({
    entity_type: "club_member_code",
    entity_id: inserted.id,
    action: "emitted",
    performed_by: adminId,
    notes: note ? `${inserted.code} · ${note}` : inserted.code,
  });

  revalidatePath("/bcp/club");
}

export async function revokeClubCode(codeId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  // Only unredeemed codes can be revoked -- a redeemed one is already history;
  // to remove the member, use revokeClubMembership instead.
  const { data: revoked } = await service
    .from("club_member_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId)
    .is("redeemed_by", null)
    .is("revoked_at", null)
    .select("id, code");
  if (!revoked?.length) throw new Error("Este código ya fue canjeado o revocado.");

  await service.from("audit_log").insert({
    entity_type: "club_member_code",
    entity_id: codeId,
    action: "revoked",
    performed_by: adminId,
    notes: revoked[0].code,
  });

  revalidatePath("/bcp/club");
}

export async function revokeClubMembership(producerId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { error } = await service
    .from("producer_profiles")
    .update({ club_member_since: null })
    .eq("profile_id", producerId);
  if (error) throw new Error("No se pudo retirar la membresía.");

  await service.from("audit_log").insert({
    entity_type: "club_membership",
    entity_id: producerId,
    action: "membership_revoked",
    performed_by: adminId,
  });

  revalidatePath("/bcp/club");
  revalidatePath("/bcp/productores");
}
