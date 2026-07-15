"use server";

import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

/**
 * Self-service password change for the forced-change step (first login after an
 * invite, or after an owner reset). Runs as the signed-in user via the session
 * client; only the must_change_password flag clear + audit row use service role.
 */
export async function changeOwnPassword(newPassword: string, confirm: string): Promise<ChangePasswordResult> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") return { ok: false, error: "No autorizado." };

  if (newPassword !== confirm) return { ok: false, error: "Las contraseñas no coinciden." };
  if (newPassword.length < 10) return { ok: false, error: "Usa al menos 10 caracteres." };
  if (user.email && newPassword.toLowerCase().includes(user.email.split("@")[0].toLowerCase())) {
    return { ok: false, error: "La contraseña no debe contener tu usuario." };
  }

  const { error: updErr } = await session.auth.updateUser({ password: newPassword });
  if (updErr) return { ok: false, error: updErr.message };

  const service = createServiceRoleClient();
  await service.from("panel_users").update({ must_change_password: false }).eq("profile_id", user.id);
  await service.from("audit_log").insert({
    entity_type: "panel_user",
    entity_id: user.id,
    action: "password_changed",
    performed_by: user.id,
  });

  return { ok: true };
}
