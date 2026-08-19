"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { membresiasDe } from "@/lib/identidad/matriz";
import { type ContextoAcceso } from "./accesoHerramienta";

// ── Herramientas del Café · los permisos, contra la base ────────────────────
// La REGLA vive en `accesoHerramienta.ts`, que es puro y comprobable sin
// levantar nada. Este archivo solo le da de comer: reúne de la base lo que la
// regla necesita y guarda lo que el owner decide.
//
// `tool_user_grants` es service-role-only (RLS encendida, cero políticas), el
// patrón de la casa para lo que ninguna superficie pública debe leer: todo
// pasa por aquí, y aquí se comprueba identidad antes de tocar nada.

export type ResultadoGrant = { ok: true } | { ok: false; error: string };

async function usuarioSesion() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}

/**
 * El contexto de acceso de la sesión actual, listo para `puedeAbrir()`.
 *
 * Una sola pasada a la base por petición: las membresías salen de la matriz
 * —que es la fuente única de quién es qué— y los permisos de las dos tablas,
 * la nueva y la heredada.
 */
export async function contextoDeAcceso(): Promise<ContextoAcceso> {
  const user = await usuarioSesion();
  if (!user) {
    return {
      autenticado: false,
      esProductor: false,
      esComprador: false,
      esDirectorio: false,
      permisosPorHerramienta: [],
      comodinPlusHeredado: false,
    };
  }

  const service = createServiceRoleClient();
  const [m, { data: propios }, { data: comodin }] = await Promise.all([
    membresiasDe(user.id),
    service.from("tool_user_grants").select("tool_id, expires_at").eq("user_id", user.id),
    service
      .from("tools_plus_grants")
      .select("id")
      .eq("profile_id", user.id)
      .eq("status", "activo")
      .limit(1),
  ]);

  // La caducidad se filtra AQUÍ y no con un `.lt()` en la consulta: `null`
  // significa «no caduca», y un filtro por fecha en SQL descartaría esas filas
  // salvo que se escriba el `or(...is.null)` — que es justo el tipo de detalle
  // que se olvida y quita permisos en silencio.
  const ahora = Date.now();
  const vigentes = ((propios as { tool_id: string; expires_at: string | null }[] | null) ?? [])
    .filter((g) => !g.expires_at || new Date(g.expires_at).getTime() > ahora)
    .map((g) => g.tool_id);

  return {
    autenticado: true,
    esProductor: m.productor,
    esComprador: m.compradorReal,
    esDirectorio: m.directorio,
    permisosPorHerramienta: vigentes,
    comodinPlusHeredado: (comodin?.length ?? 0) > 0,
  };
}

/** Conceder una herramienta a una persona. Owner/admin. */
export async function concederHerramienta(
  userId: string,
  toolId: string,
  source: "manual" | "payment" = "manual"
): Promise<ResultadoGrant> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const [{ data: persona }, { data: tool }] = await Promise.all([
    service.from("profiles").select("id").eq("id", userId).maybeSingle(),
    service.from("tools").select("id, tier").eq("id", toolId).maybeSingle(),
  ]);
  if (!persona) return { ok: false, error: "Esa cuenta no existe." };
  if (!tool) return { ok: false, error: "Esa herramienta no existe." };

  const { error } = await service
    .from("tool_user_grants")
    .upsert(
      { user_id: userId, tool_id: toolId, granted_by: adminId, source, granted_at: new Date().toISOString() },
      { onConflict: "user_id,tool_id" }
    );
  if (error) return { ok: false, error: "No se pudo conceder el permiso." };

  await service.from("audit_log").insert({
    entity_type: "tool_user_grant",
    entity_id: userId,
    action: "granted",
    new_status: toolId,
    performed_by: adminId,
    notes: source,
  });

  revalidatePath("/ecp/herramientas");
  return { ok: true };
}

/** Retirar el permiso. La persona vuelve a ver la herramienta bloqueada. */
export async function revocarHerramienta(userId: string, toolId: string): Promise<ResultadoGrant> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { error } = await service
    .from("tool_user_grants")
    .delete()
    .eq("user_id", userId)
    .eq("tool_id", toolId);
  if (error) return { ok: false, error: "No se pudo retirar el permiso." };

  await service.from("audit_log").insert({
    entity_type: "tool_user_grant",
    entity_id: userId,
    action: "revoked",
    new_status: toolId,
    performed_by: adminId,
  });

  revalidatePath("/ecp/herramientas");
  return { ok: true };
}

/**
 * Quién sigue dependiendo del comodín heredado.
 *
 * Es la lista de trabajo de la migración pendiente: cuando esté vacía —o
 * cuando cada una de esas personas tenga sus permisos por herramienta—,
 * `tools_plus_grants` se puede retirar sin quitarle el acceso a nadie.
 */
export async function quienDependeDelComodin(): Promise<{ profileId: string; audiencia: string }[]> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data } = await service
    .from("tools_plus_grants")
    .select("profile_id, audiencia")
    .eq("status", "activo");
  return ((data as { profile_id: string; audiencia: string }[] | null) ?? []).map((r) => ({
    profileId: r.profile_id,
    audiencia: r.audiencia,
  }));
}
