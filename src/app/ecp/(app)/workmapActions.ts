"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { toWorkMapConfig, DEFAULT_WORK_MAP, type WorkMapConfig } from "@/lib/workmap/schema";

// ── Mapa de Trabajo · persistencia ───────────────────────────────────────────
// El mapa vive en platform_settings.work_map (jsonb, service-role-only). Es UNA
// configuración global compartida. Verlo lo puede cualquier operador de consola;
// guardarlo es solo del owner (es configuración de la plataforma). Mismo patrón
// que src/lib/tools/toolAccess.ts (getToolsConfig/saveToolsConfig).

const KEY = "work_map";

/** La config guardada, o la semilla curada si aún no se ha guardado ninguna. */
export async function getWorkMap(): Promise<WorkMapConfig> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data } = await service.from("platform_settings").select("value").eq("key", KEY).maybeSingle();
  return data?.value ? toWorkMapConfig(data.value) : DEFAULT_WORK_MAP;
}

/** Guarda el mapa completo — solo el owner. Normaliza antes de escribir. */
export async function saveWorkMap(config: WorkMapConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  // Owner = con is_owner (o grandfathered sin fila en panel_users).
  const { data: pu } = await service.from("panel_users").select("is_owner").eq("profile_id", adminId).maybeSingle();
  if (pu && !pu.is_owner) return { ok: false, error: "Solo el owner puede guardar el Mapa de Trabajo." };

  const clean = toWorkMapConfig(config); // nunca se guarda basura
  const { error } = await service
    .from("platform_settings")
    .upsert({ key: KEY, value: clean, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: "key" });
  if (error) return { ok: false, error: "No se pudo guardar el mapa." };
  await service.from("audit_log").insert({
    entity_type: "platform_setting",
    entity_id: adminId,
    action: "work_map_changed",
    performed_by: adminId,
  });
  revalidatePath("/ecp/mapa");
  return { ok: true };
}
