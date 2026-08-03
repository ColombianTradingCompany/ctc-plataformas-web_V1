"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { tienePlusActivo } from "./plusGrants";
import {
  toToolsConfig,
  toolsForSurface,
  type ToolId,
  type ToolsConfig,
  type ToolSurface,
} from "./catalog";

// ── Acceso a las herramientas embebidas (2026-07-20) ─────────────────────────
// El reparto por superficie y el nivel (Default/Plus) se administran desde la
// consola interna y viven en platform_settings.tools_config — tabla
// service-role-only, así que NADA de esto se resuelve en el cliente: la
// superficie pide su lista con una server action y recibe ya filtrada la que
// le corresponde a ESE usuario.
//
// QUÉ DA EL NIVEL "PLUS" (regla del owner, 2026-08-02): una ACTIVACIÓN
// explícita en tools_plus_grants — el productor, el comprador o el experto del
// DC la solicita desde su plataforma y el ECP la aprueba o rechaza (a futuro,
// con pago). Ver src/lib/tools/plusGrants.ts. La regla derivada anterior
// (Pasaporte del Club / escalón pintón) quedó RETIRADA.

const KEY = "tools_config";

async function readConfig(service: ReturnType<typeof createServiceRoleClient>): Promise<ToolsConfig> {
  const { data } = await service.from("platform_settings").select("value").eq("key", KEY).maybeSingle();
  return toToolsConfig(data?.value);
}

/** La configuración completa — solo para la consola interna. */
export async function getToolsConfig(): Promise<ToolsConfig> {
  await requireActiveAdmin();
  return readConfig(createServiceRoleClient());
}

/** Guarda la configuración completa desde el tablero de disponibilidad. */
export async function saveToolsConfig(config: ToolsConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const clean = toToolsConfig(config); // normaliza: nunca se guarda basura
  const { error } = await service
    .from("platform_settings")
    .upsert({ key: KEY, value: clean, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: "key" });
  if (error) return { ok: false, error: "No se pudo guardar la configuración." };
  await service.from("audit_log").insert({
    entity_type: "platform_setting",
    entity_id: adminId,
    action: "tools_config_changed",
    performed_by: adminId,
  });
  for (const p of ["/ecp/herramientas", "/kaffetal-regal", "/cherry-picked", "/herramientas", "/directorio"]) revalidatePath(p);
  return { ok: true };
}

export type ToolAccess = {
  /** Los ids que este usuario puede abrir en esta superficie. */
  ids: ToolId[];
  /** ¿Tiene el nivel Plus? (para explicar lo que le falta, no para ocultar) */
  isPlus: boolean;
  /** Cuántas herramientas Plus existen en la superficie y no está viendo. */
  lockedCount: number;
};

/**
 * La lista que le toca al usuario actual en una superficie. Sin sesión devuelve
 * solo las Default: las páginas públicas de KR/CP también muestran herramientas.
 */
export async function loadToolAccess(surface: ToolSurface): Promise<ToolAccess> {
  const service = createServiceRoleClient();
  const config = await readConfig(service);

  // Plus por ACTIVACIÓN (owner, 2026-08-02): ya no se deriva del Club ni del
  // escalón de membresía — el usuario lo SOLICITA desde su plataforma y el ECP
  // lo activa (tools_plus_grants). kr→producer, cp→buyer, dc→dc; la superficie
  // web acepta cualquier activación (la cookie compartida la reconoce sola).
  let isPlus = false;
  try {
    const session = await createSessionClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user) {
      const audiencia = surface === "kr" ? "producer" : surface === "cp" ? "buyer" : surface === "dc" ? "dc" : undefined;
      isPlus = await tienePlusActivo(user.id, audiencia);
    }
  } catch {
    // Sin sesión válida se queda en Default — nunca es motivo para romper la página.
  }

  const ids = toolsForSurface(config, surface, isPlus);
  const all = toolsForSurface(config, surface, true);
  return { ids, isPlus, lockedCount: all.length - ids.length };
}
