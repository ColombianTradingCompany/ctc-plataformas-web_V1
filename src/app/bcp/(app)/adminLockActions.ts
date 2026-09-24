"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura, requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// ── Admin Lock (2026-07-20, pedido del owner) ────────────────────────────────
// Una contraseña SUAVE que desbloquea información estructuralmente oculta por
// diseño del flujo — el primer uso: las identidades de los cafés de una sesión
// de Arena a ciegas. NO protege nada delicado (quien llega aquí ya pasó el 2FA
// del panel); por eso un sha256 sencillo basta. Se cambia desde ECP → Usuarios
// y Credenciales → Admin Lock. Semilla inicial: "123" (definida por el owner).

type Result = { ok: true } | { ok: false; error: string };

const KEY = "admin_lock";

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

async function readHash(service: ReturnType<typeof createServiceRoleClient>): Promise<string | null> {
  const { data } = await service.from("platform_settings").select("value").eq("key", KEY).maybeSingle();
  const v = data?.value as { hash?: string } | null;
  return v?.hash ?? null;
}

/** ¿La contraseña abre el candado? (cualquier admin activo puede intentarlo) */
export async function verifyAdminLock(password: string): Promise<Result> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const hash = await readHash(service);
  if (!hash) return { ok: false, error: "El Admin Lock no está configurado." };
  if (sha256(password) !== hash) return { ok: false, error: "Contraseña incorrecta." };
  return { ok: true };
}

/** Cambia la contraseña del candado — solo el owner, y con la actual en mano. */
export async function setAdminLockPassword(current: string, next: string): Promise<Result> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  // Owner = sin fila en panel_users (grandfathered) o con is_owner.
  const { data: pu } = await service.from("panel_users").select("is_owner").eq("profile_id", adminId).maybeSingle();
  if (pu && !pu.is_owner) return { ok: false, error: "Solo el owner puede cambiar el Admin Lock." };

  const hash = await readHash(service);
  // Primera vez (fila ausente / sin hash aún): el owner establece el candado sin
  // "actual en mano" — no existe contraseña previa que exigir. Si ya hay hash, se
  // exige que la actual coincida.
  if (hash && sha256(current) !== hash) return { ok: false, error: "La contraseña actual no coincide." };
  const clean = next.trim();
  if (clean.length < 3) return { ok: false, error: "La nueva contraseña necesita al menos 3 caracteres." };

  // upsert, no update: en un entorno sin la semilla, .update() no afecta filas y
  // el candado nunca se puede establecer (véase saveToolsConfig, mismo patrón).
  const { error } = await service
    .from("platform_settings")
    .upsert(
      { key: KEY, value: { hash: sha256(clean) }, updated_at: new Date().toISOString(), updated_by: adminId },
      { onConflict: "key" }
    );
  if (error) return { ok: false, error: "No se pudo guardar el Admin Lock." };
  await service.from("audit_log").insert({
    entity_type: "platform_setting",
    entity_id: adminId, // no hay entidad natural — se registra quién lo cambió
    action: "admin_lock_changed",
    performed_by: adminId,
  });
  revalidatePath("/bcp/usuarios");
  return { ok: true };
}

// `revealSessionIdentities` («mirar bajo el capó» de una sesión a ciegas) se retiró en la V5.77 con la
// jornada de la Arena: las sesiones de segunda apreciación no son a ciegas. El candado sigue vivo para lo que venga.
