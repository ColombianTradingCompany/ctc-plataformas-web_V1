"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { corroborar, pedirEvidencia, reabrir, retirar } from "@/lib/registro/certificados";

// ── Las certificaciones de una finca, desde el OCP (V5.78) ───────────────────
// Cuatro movimientos, todos `emite` (el productor los ve en su feed y por correo): pedir evidencia
// (arranca los recordatorios semanales), corroborar (contrastada con el registro público; respalda el
// Pasaporte), retirar (sale del Pasaporte, el registro queda) y reabrir. La lógica y los rastros viven
// en `src/lib/registro/certificados.ts`, compartida con el cron.

function despues() {
  revalidatePath("/ocp/kr");
}

export async function pedirEvidenciaCertificado(certId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const r = await pedirEvidencia(createServiceRoleClient(), certId, String(formData.get("nota") ?? "").trim(), permiso.userId);
  if (r.ok) despues();
  return r;
}

export async function corroborarCertificado(certId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const r = await corroborar(createServiceRoleClient(), certId, permiso.userId);
  if (r.ok) despues();
  return r;
}

export async function retirarCertificado(certId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const r = await retirar(createServiceRoleClient(), certId, String(formData.get("motivo") ?? "").trim(), permiso.userId);
  if (r.ok) despues();
  return r;
}

export async function reabrirCertificado(certId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const r = await reabrir(createServiceRoleClient(), certId, permiso.userId);
  if (r.ok) despues();
  return r;
}
