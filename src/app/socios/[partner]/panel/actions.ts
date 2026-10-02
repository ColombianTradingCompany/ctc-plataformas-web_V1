"use server";

import { createPartnerSessionClient } from "@/lib/supabase/server";

export type PartnerPwResult = { ok: true } | { ok: false; error: string };

/** Self-service password change for a signed-in partner (single-factor tier). */
export async function changePartnerPassword(newPassword: string, confirm: string): Promise<PartnerPwResult> {
  const session = await createPartnerSessionClient();
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

/**
 * El LATIDO de la sesión del socio (V5.145, owner: «que dure al menos 10 horas sin cerrarse»). La llama `SesionViva`
 * cada cierto tiempo mientras hay una pantalla del socio abierta. No hace nada por sí misma: lo que importa es que la
 * petición PASA POR EL PROXY, que renueva el token de acceso (vence a la hora) y deja la cookie fresca. Devuelve si la
 * sesión sigue viva, para que la pantalla avise ANTES de que el evaluador pierda lo digitado.
 */
export async function latidoDeSocio(): Promise<{ viva: boolean }> {
  const session = await createPartnerSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return { viva: !!user };
}
