"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

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
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  // Owner = sin fila en panel_users (grandfathered) o con is_owner.
  const { data: pu } = await service.from("panel_users").select("is_owner").eq("profile_id", adminId).maybeSingle();
  if (pu && !pu.is_owner) return { ok: false, error: "Solo el owner puede cambiar el Admin Lock." };

  const hash = await readHash(service);
  if (!hash || sha256(current) !== hash) return { ok: false, error: "La contraseña actual no coincide." };
  const clean = next.trim();
  if (clean.length < 3) return { ok: false, error: "La nueva contraseña necesita al menos 3 caracteres." };

  await service
    .from("platform_settings")
    .update({ value: { hash: sha256(clean) }, updated_at: new Date().toISOString(), updated_by: adminId })
    .eq("key", KEY);
  await service.from("audit_log").insert({
    entity_type: "platform_setting",
    entity_id: adminId, // no hay entidad natural — se registra quién lo cambió
    action: "admin_lock_changed",
    performed_by: adminId,
  });
  revalidatePath("/ecp/usuarios");
  return { ok: true };
}

export type RevealedIdentity = { lotId: string; lotName: string; producerName: string | null };

/**
 * "Mirar bajo el capó" de una sesión a ciegas: con la contraseña del candado,
 * devuelve la identidad de cada taza. Las identidades NUNCA viajan al cliente
 * en el render — solo salen de aquí, tras verificar la contraseña.
 */
export async function revealSessionIdentities(
  sessionId: string,
  password: string
): Promise<{ ok: true; identities: RevealedIdentity[] } | { ok: false; error: string }> {
  const gate = await verifyAdminLock(password);
  if (!gate.ok) return gate;
  const service = createServiceRoleClient();
  const { data: roster } = await service
    .from("arena_session_lots")
    .select("lot_id, lots(id, name, producer_id)")
    .eq("arena_session_id", sessionId);
  const lots = (roster ?? []).map((r) => (Array.isArray(r.lots) ? r.lots[0] : r.lots) as { id: string; name: string; producer_id: string } | null);
  const producerIds = [...new Set(lots.filter(Boolean).map((l) => l!.producer_id))];
  const { data: pps } = producerIds.length
    ? await service.from("profiles").select("id, full_name").in("id", producerIds)
    : { data: [] };
  const nameById = new Map(((pps as { id: string; full_name: string | null }[] | null) ?? []).map((p) => [p.id, p.full_name]));
  return {
    ok: true,
    identities: lots
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((l) => ({ lotId: l.id, lotName: l.name, producerName: nameById.get(l.producer_id) ?? null })),
  };
}
