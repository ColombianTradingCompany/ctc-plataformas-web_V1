"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { CONSOLE_ORDER, type PanelConsoleKey } from "@/lib/panel/consoles";
import type { ConsoleLevel } from "@/lib/panel/panelUsers";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { buildPanelInviteEmail, buildPanelResetEmail } from "@/lib/email/panelEmails";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Owner gate for collaborator management. Defense in depth alongside the
// read-path check in requireConsoleAccess. A bcp_admin with no panel_users row
// is grandfathered as owner (predates the table); otherwise must be an ACTIVE owner.
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
  if (!isOwner) throw new Error("Solo un owner puede gestionar usuarios del panel.");

  return user.id;
}

function generateTempPassword(): string {
  // url-safe, ~16 chars; the collaborator changes it on first entry.
  return "Ctc-" + randomBytes(12).toString("base64url");
}

function sanitizeConsoles(input: Partial<Record<PanelConsoleKey, ConsoleLevel | "">>): Partial<Record<PanelConsoleKey, ConsoleLevel>> {
  const out: Partial<Record<PanelConsoleKey, ConsoleLevel>> = {};
  for (const k of CONSOLE_ORDER) {
    const lvl = input[k];
    if (lvl === "admin" || lvl === "viewer") out[k] = lvl;
  }
  return out;
}

export async function invitePanelUser(input: {
  email: string;
  displayName: string;
  /** Real inbox for invites/OTPs. Empty = deliver to the login email itself. */
  deliveryEmail: string;
  consoles: Partial<Record<PanelConsoleKey, ConsoleLevel | "">>;
}): Promise<ActionResult> {
  const ownerId = await requireOwner();
  const service = createServiceRoleClient();

  const email = input.email.trim().toLowerCase();
  const deliveryEmail = input.deliveryEmail.trim().toLowerCase() || null;
  const displayName = input.displayName.trim();
  if (!email || !email.includes("@")) return { ok: false, error: "Correo inválido." };
  if (deliveryEmail && !deliveryEmail.includes("@")) return { ok: false, error: "Correo de entrega inválido." };
  if (deliveryEmail === email) {
    return { ok: false, error: "El correo de entrega es el mismo usuario — déjalo vacío en ese caso." };
  }

  const consoles = sanitizeConsoles(input.consoles);
  if (Object.keys(consoles).length === 0) return { ok: false, error: "Concede al menos una consola." };

  // Guard against reusing a PUBLIC-account email for an internal credential.
  // profiles.role is single-valued, so turning a producer/buyer into a bcp_admin
  // would strip their public role and orphan their fincas/lots/orders. Internal
  // credentials must live on their own email — detect this early with a clear
  // message instead of the opaque "already registered" from the admin API.
  const { data: existing } = await service.from("profiles").select("id, role").ilike("email", email).maybeSingle();
  if (existing) {
    if (existing.role === "producer") {
      return { ok: false, error: "Ese correo ya es una cuenta de productor (Kaffetal Regal). Las credenciales internas deben usar un correo distinto — no se puede convertir una cuenta pública en interna." };
    }
    if (existing.role === "buyer") {
      return { ok: false, error: "Ese correo ya es una cuenta de comprador (Cherry Picked). Las credenciales internas deben usar un correo distinto — no se puede convertir una cuenta pública en interna." };
    }
    return { ok: false, error: "Ese correo ya es una cuenta interna. Gestiona sus consolas desde la lista de abajo." };
  }

  // Create the auth user, pre-confirmed, with a temp password (same mechanism as
  // scripts/seed-bcp-admin.mjs). The pre-check above covers accounts that carry a
  // profiles row; this still fails cleanly for any other pre-existing auth email.
  const tempPassword = generateTempPassword();
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "No se pudo crear la cuenta.";
    return { ok: false, error: /already been registered|already exists/i.test(msg) ? "Ya existe una cuenta con ese correo." : msg };
  }
  const newId = created.user.id;

  // handle_new_user defaults the account to 'buyer' + a stray buyer_profiles row;
  // promote to bcp_admin and remove that row (mirrors the seed script).
  await service.from("profiles").update({ role: "bcp_admin", full_name: displayName || email }).eq("id", newId);
  await service.from("buyer_profiles").delete().eq("profile_id", newId);

  const { error: insErr } = await service.from("panel_users").insert({
    profile_id: newId,
    email,
    delivery_email: deliveryEmail,
    display_name: displayName || null,
    is_owner: false,
    consoles,
    status: "invited",
    must_change_password: true,
    invited_by: ownerId,
  });
  if (insErr) return { ok: false, error: insErr.message };

  const { subject, text } = buildPanelInviteEmail(email, displayName || null, tempPassword, consoles, deliveryEmail);
  const res = await sendTransactionalEmail(deliveryEmail || email, subject, text);
  await service
    .from("panel_users")
    .update({
      invite_email_sent_at: res.ok ? new Date().toISOString() : null,
      invite_email_error: res.ok ? null : res.error,
    })
    .eq("profile_id", newId);

  await service.from("audit_log").insert({
    entity_type: "panel_user",
    entity_id: newId,
    action: "invited",
    new_status: "invited",
    performed_by: ownerId,
    notes: `Consolas: ${Object.entries(consoles).map(([k, v]) => `${k}:${v}`).join(", ")}`,
  });

  revalidatePath("/bcp/usuarios");
  return res.ok ? { ok: true } : { ok: false, error: `Cuenta creada, pero el correo falló: ${res.error}` };
}

export async function suspendPanelUser(profileId: string): Promise<ActionResult> {
  const ownerId = await requireOwner();
  if (profileId === ownerId) return { ok: false, error: "No puedes suspender tu propia cuenta." };

  const service = createServiceRoleClient();
  const { data: target } = await service.from("panel_users").select("is_owner, status").eq("profile_id", profileId).single();
  if (!target) return { ok: false, error: "Usuario no encontrado." };

  if (target.is_owner) {
    const { count } = await service
      .from("panel_users")
      .select("profile_id", { count: "exact", head: true })
      .eq("is_owner", true)
      .eq("status", "active");
    if ((count ?? 0) <= 1) return { ok: false, error: "No puedes suspender al último owner activo." };
  }

  await service.from("panel_users").update({ status: "suspended", suspended_at: new Date().toISOString() }).eq("profile_id", profileId);
  await service.from("audit_log").insert({
    entity_type: "panel_user",
    entity_id: profileId,
    action: "suspended",
    previous_status: target.status,
    new_status: "suspended",
    performed_by: ownerId,
  });

  revalidatePath("/bcp/usuarios");
  return { ok: true };
}

export async function reactivatePanelUser(profileId: string): Promise<ActionResult> {
  const ownerId = await requireOwner();
  const service = createServiceRoleClient();
  const { data: target } = await service.from("panel_users").select("status").eq("profile_id", profileId).single();
  if (!target) return { ok: false, error: "Usuario no encontrado." };

  await service
    .from("panel_users")
    .update({ status: "active", suspended_at: null, activated_at: new Date().toISOString() })
    .eq("profile_id", profileId);
  await service.from("audit_log").insert({
    entity_type: "panel_user",
    entity_id: profileId,
    action: "reactivated",
    previous_status: target.status,
    new_status: "active",
    performed_by: ownerId,
  });

  revalidatePath("/bcp/usuarios");
  return { ok: true };
}

// Regenerate the temp password and resend the invite. Only for collaborators who
// haven't logged in yet (status='invited') — never resets an active user's password.
export async function resendPanelInvite(profileId: string): Promise<ActionResult> {
  await requireOwner();
  const service = createServiceRoleClient();
  const { data: target } = await service
    .from("panel_users")
    .select("email, delivery_email, display_name, consoles, status, invite_email_sent_at")
    .eq("profile_id", profileId)
    .single();
  if (!target) return { ok: false, error: "Usuario no encontrado." };
  if (target.status !== "invited") return { ok: false, error: "Solo se puede reenviar la invitación a cuentas que aún no han ingresado." };

  const tempPassword = generateTempPassword();
  const { error: updErr } = await service.auth.admin.updateUserById(profileId, { password: tempPassword });
  if (updErr) return { ok: false, error: updErr.message };
  await service.from("panel_users").update({ must_change_password: true }).eq("profile_id", profileId);

  const { subject, text } = buildPanelInviteEmail(
    target.email,
    target.display_name,
    tempPassword,
    target.consoles as Partial<Record<PanelConsoleKey, ConsoleLevel>>,
    target.delivery_email
  );
  const res = await sendTransactionalEmail(target.delivery_email || target.email, subject, text);
  await service
    .from("panel_users")
    .update({
      invite_email_sent_at: res.ok ? new Date().toISOString() : target.invite_email_sent_at,
      invite_email_error: res.ok ? null : res.error,
    })
    .eq("profile_id", profileId);

  revalidatePath("/bcp/usuarios");
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

// Owner-driven password reset for a collaborator who is locked out. Regenerates a
// temp password, forces a change on next login, and delivers it to the user's
// delivery inbox. Never shown on screen. Audit-logged.
export async function resetPanelUserPassword(profileId: string): Promise<ActionResult> {
  const ownerId = await requireOwner();
  const service = createServiceRoleClient();
  const { data: target } = await service
    .from("panel_users")
    .select("email, delivery_email, display_name, status")
    .eq("profile_id", profileId)
    .single();
  if (!target) return { ok: false, error: "Usuario no encontrado." };
  if (target.status === "suspended") return { ok: false, error: "Reactiva la cuenta antes de restablecer su contraseña." };
  if (target.status === "invited") return { ok: false, error: "Esta cuenta aún no ha ingresado — usa \"Reenviar invitación\"." };

  const tempPassword = generateTempPassword();
  const { error: updErr } = await service.auth.admin.updateUserById(profileId, { password: tempPassword });
  if (updErr) return { ok: false, error: updErr.message };
  await service.from("panel_users").update({ must_change_password: true }).eq("profile_id", profileId);

  const { subject, text } = buildPanelResetEmail(target.email, target.display_name, tempPassword, target.delivery_email);
  const res = await sendTransactionalEmail(target.delivery_email || target.email, subject, text);

  await service.from("audit_log").insert({
    entity_type: "panel_user",
    entity_id: profileId,
    action: "password_reset",
    performed_by: ownerId,
    notes: res.ok ? "Nueva contraseña temporal enviada." : `Contraseña restablecida, pero el correo falló: ${res.error}`,
  });

  revalidatePath("/bcp/usuarios");
  return res.ok ? { ok: true } : { ok: false, error: `Contraseña restablecida, pero el correo falló: ${res.error}` };
}

// Fix or set where a collaborator's codes land (e.g. a typo at invite time, or
// they changed their personal inbox). Empty clears it back to the login email.
export async function updateDeliveryEmail(profileId: string, deliveryEmail: string): Promise<ActionResult> {
  const ownerId = await requireOwner();
  const service = createServiceRoleClient();
  const { data: target } = await service.from("panel_users").select("email, delivery_email").eq("profile_id", profileId).single();
  if (!target) return { ok: false, error: "Usuario no encontrado." };

  const cleaned = deliveryEmail.trim().toLowerCase() || null;
  if (cleaned && !cleaned.includes("@")) return { ok: false, error: "Correo de entrega inválido." };
  if (cleaned === target.email) return { ok: false, error: "El correo de entrega es el mismo usuario — déjalo vacío en ese caso." };

  await service.from("panel_users").update({ delivery_email: cleaned }).eq("profile_id", profileId);
  await service.from("audit_log").insert({
    entity_type: "panel_user",
    entity_id: profileId,
    action: "delivery_email_changed",
    performed_by: ownerId,
    notes: `${target.delivery_email ?? "(login)"} → ${cleaned ?? "(login)"}`,
  });

  revalidatePath("/bcp/usuarios");
  return { ok: true };
}
