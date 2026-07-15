"use server";

import { createSessionClient } from "@/lib/supabase/server";

export type PartnerPwResult = { ok: true } | { ok: false; error: string };

/** Self-service password change for a signed-in partner (single-factor tier). */
export async function changePartnerPassword(newPassword: string, confirm: string): Promise<PartnerPwResult> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "partner") return { ok: false, error: "No autorizado." };

  if (newPassword !== confirm) return { ok: false, error: "Las contraseñas no coinciden." };
  if (newPassword.length < 10) return { ok: false, error: "Usa al menos 10 caracteres." };

  const { error } = await session.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
