"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { isPartnerSlug, type PartnerSlug } from "@/lib/partners/partners";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { buildPartnerInviteEmail, buildPartnerResetEmail } from "@/lib/email/partnerEmails";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Same owner gate as collaborator management: partner credentials are identity
// work, so only a founder/owner issues or revokes them.
async function requireOwner(): Promise<string> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") throw new Error("No autorizado.");
  const service = createServiceRoleClient();
  const { data: pu } = await service.from("panel_users").select("is_owner, status").eq("profile_id", user.id).maybeSingle();
  const isOwner = pu ? pu.is_owner && pu.status === "active" : true;
  if (!isOwner) throw new Error("Solo un owner puede gestionar credenciales de socios.");
  return user.id;
}

function generateTempPassword(): string {
  return "Ctc-" + randomBytes(12).toString("base64url");
}

export async function invitePartner(input: {
  email: string;
  orgName: string;
  contactName: string;
  node: string;
}): Promise<ActionResult> {
  const ownerId = await requireOwner();
  const service = createServiceRoleClient();

  const email = input.email.trim().toLowerCase();
  const orgName = input.orgName.trim();
  const contactName = input.contactName.trim();
  if (!email || !email.includes("@")) return { ok: false, error: "Correo inválido." };
  if (!orgName) return { ok: false, error: "La organización es obligatoria." };
  if (!isPartnerSlug(input.node)) return { ok: false, error: "Nodo inválido." };
  const node = input.node as PartnerSlug;

  // Same identity rule as internal collaborators: a public (or internal) account
  // email can't be converted — profiles.role is single-valued.
  const { data: existing } = await service.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (existing) {
    const label =
      existing.role === "producer" ? "una cuenta de productor (Kaffetal Regal)"
      : existing.role === "buyer" ? "una cuenta de comprador (Cherry Picked)"
      : existing.role === "partner" ? "una credencial de socio"
      : "una cuenta interna";
    return { ok: false, error: `Ese correo ya es ${label}. Usa un correo distinto para esta credencial.` };
  }

  const tempPassword = generateTempPassword();
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) return { ok: false, error: createErr?.message ?? "No se pudo crear la cuenta." };
  const newId = created.user.id;

  // handle_new_user defaults to buyer + a stray buyer_profiles row; promote to
  // partner and clean up (same pattern as the internal-collaborator invite).
  await service.from("profiles").update({ role: "partner", full_name: contactName || orgName }).eq("id", newId);
  await service.from("buyer_profiles").delete().eq("profile_id", newId);

  const { error: insErr } = await service.from("partner_accounts").insert({
    profile_id: newId,
    email,
    org_name: orgName,
    contact_name: contactName || null,
    node_type: node,
    status: "invited",
    invited_by: ownerId,
  });
  if (insErr) return { ok: false, error: insErr.message };

  const { subject, text } = buildPartnerInviteEmail(email, contactName || null, orgName, node, tempPassword);
  const res = await sendTransactionalEmail(email, subject, text);
  await service
    .from("partner_accounts")
    .update({ invite_email_sent_at: res.ok ? new Date().toISOString() : null, invite_email_error: res.ok ? null : res.error })
    .eq("profile_id", newId);

  await service.from("audit_log").insert({
    entity_type: "partner_account",
    entity_id: newId,
    action: "invited",
    new_status: "invited",
    performed_by: ownerId,
    notes: `${orgName} · ${node}`,
  });

  revalidatePath("/ecp/socios");
  return res.ok ? { ok: true } : { ok: false, error: `Credencial creada, pero el correo falló: ${res.error}` };
}

export async function setPartnerStatus(profileId: string, to: "suspended" | "active"): Promise<ActionResult> {
  const ownerId = await requireOwner();
  const service = createServiceRoleClient();
  const { data: target } = await service.from("partner_accounts").select("status, org_name").eq("profile_id", profileId).single();
  if (!target) return { ok: false, error: "Credencial no encontrada." };

  await service
    .from("partner_accounts")
    .update(to === "suspended" ? { status: "suspended", suspended_at: new Date().toISOString() } : { status: "active", suspended_at: null })
    .eq("profile_id", profileId);
  await service.from("audit_log").insert({
    entity_type: "partner_account",
    entity_id: profileId,
    action: to === "suspended" ? "suspended" : "reactivated",
    previous_status: target.status,
    new_status: to,
    performed_by: ownerId,
  });

  revalidatePath("/ecp/socios");
  return { ok: true };
}

// Resend invite (invited-only) or owner reset (active): both regenerate the temp
// password and re-deliver — the password is never shown on screen.
export async function resendPartnerCredential(profileId: string): Promise<ActionResult> {
  const ownerId = await requireOwner();
  const service = createServiceRoleClient();
  const { data: target } = await service
    .from("partner_accounts")
    .select("email, contact_name, org_name, node_type, status")
    .eq("profile_id", profileId)
    .single();
  if (!target) return { ok: false, error: "Credencial no encontrada." };
  if (target.status === "suspended") return { ok: false, error: "Reactiva la credencial primero." };

  const tempPassword = generateTempPassword();
  const { error: updErr } = await service.auth.admin.updateUserById(profileId, { password: tempPassword });
  if (updErr) return { ok: false, error: updErr.message };

  const node = target.node_type as PartnerSlug;
  const { subject, text } =
    target.status === "invited"
      ? buildPartnerInviteEmail(target.email, target.contact_name, target.org_name, node, tempPassword)
      : buildPartnerResetEmail(target.email, target.contact_name, node, tempPassword);
  const res = await sendTransactionalEmail(target.email, subject, text);
  await service
    .from("partner_accounts")
    .update({ invite_email_sent_at: res.ok ? new Date().toISOString() : null, invite_email_error: res.ok ? null : res.error })
    .eq("profile_id", profileId);

  await service.from("audit_log").insert({
    entity_type: "partner_account",
    entity_id: profileId,
    action: target.status === "invited" ? "invite_resent" : "password_reset",
    performed_by: ownerId,
  });

  revalidatePath("/ecp/socios");
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
