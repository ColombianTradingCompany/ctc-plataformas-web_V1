"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// ── Herramientas Plus · solicitudes y activaciones (owner, 2026-08-02) ───────
// El nivel Plus dejó de DERIVARSE (Pasaporte del Club / escalón pintón): ahora
// es una ACTIVACIÓN explícita. El productor, el comprador o el experto del DC
// la solicita desde su plataforma; la solicitud cae al sub-tablero del ECP →
// Herramientas del café, donde CTC la activa o la rechaza (a futuro, con pago).
// Tabla tools_plus_grants, service-role-only; una fila por identidad+audiencia.

export type PlusAudiencia = "producer" | "buyer" | "dc";
export type PlusStatus = "pendiente" | "activo" | "rechazado" | null;

export type ActionResult = { ok: true } | { ok: false; error: string };

async function sessionUser() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}

/** ¿La sesión actual TIENE la membresía que respalda esa audiencia? */
async function esElegible(profileId: string, audiencia: PlusAudiencia): Promise<boolean> {
  const service = createServiceRoleClient();
  if (audiencia === "producer") {
    const { data } = await service.from("profiles").select("role").eq("id", profileId).maybeSingle();
    return data?.role === "producer";
  }
  if (audiencia === "buyer") {
    const { data } = await service.from("profiles").select("role").eq("id", profileId).maybeSingle();
    return data?.role === "buyer";
  }
  const { data } = await service.from("directorio_profiles").select("profile_id").eq("profile_id", profileId).maybeSingle();
  return !!data;
}

/** Estado de mi solicitud Plus para una audiencia (null = nunca solicitada). */
export async function miEstadoPlus(audiencia: PlusAudiencia): Promise<PlusStatus> {
  const user = await sessionUser();
  if (!user) return null;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("tools_plus_grants")
    .select("status")
    .eq("profile_id", user.id)
    .eq("audiencia", audiencia)
    .maybeSingle();
  return (data?.status as PlusStatus) ?? null;
}

/** Solicitar Herramientas Plus desde la plataforma propia. */
export async function solicitarPlus(audiencia: PlusAudiencia): Promise<ActionResult> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo." };
  if (!["producer", "buyer", "dc"].includes(audiencia)) return { ok: false, error: "Audiencia inválida." };
  if (!(await esElegible(user.id, audiencia))) {
    return { ok: false, error: "Esta solicitud se hace desde la plataforma donde tienes tu cuenta activa." };
  }
  const service = createServiceRoleClient();

  const { data: existing } = await service
    .from("tools_plus_grants")
    .select("id, status")
    .eq("profile_id", user.id)
    .eq("audiencia", audiencia)
    .maybeSingle();
  if (existing?.status === "activo") return { ok: true };
  if (existing?.status === "pendiente") return { ok: true }; // idempotente
  if (existing) {
    // Rechazada antes: volver a solicitar reabre la petición.
    const { error } = await service
      .from("tools_plus_grants")
      .update({ status: "pendiente", requested_at: new Date().toISOString(), decided_at: null, decided_by: null })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "No se pudo registrar la solicitud." };
    return { ok: true };
  }
  const { error } = await service.from("tools_plus_grants").insert({ profile_id: user.id, audiencia });
  if (error) return { ok: false, error: "No se pudo registrar la solicitud." };
  return { ok: true };
}

/** ¿Esta identidad tiene ALGÚN Plus activo? (la superficie web lo usa) */
export async function tienePlusActivo(profileId: string, audiencia?: PlusAudiencia): Promise<boolean> {
  const service = createServiceRoleClient();
  let q = service.from("tools_plus_grants").select("id", { count: "exact", head: true }).eq("profile_id", profileId).eq("status", "activo");
  if (audiencia) q = q.eq("audiencia", audiencia);
  const { count } = await q;
  return (count ?? 0) > 0;
}

// ── Lado ECP ─────────────────────────────────────────────────────────────────

export type SolicitudPlus = {
  id: string;
  profileId: string;
  audiencia: PlusAudiencia;
  status: string;
  nombre: string;
  email: string;
  requestedAt: string;
  decidedAt: string | null;
};

export async function listarSolicitudesPlus(): Promise<SolicitudPlus[]> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data: rows } = await service
    .from("tools_plus_grants")
    .select("id, profile_id, audiencia, status, requested_at, decided_at")
    .order("requested_at", { ascending: false });
  const grants = (rows ?? []) as { id: string; profile_id: string; audiencia: PlusAudiencia; status: string; requested_at: string; decided_at: string | null }[];
  if (!grants.length) return [];
  const { data: profs } = await service
    .from("profiles")
    .select("id, full_name, email")
    .in("id", [...new Set(grants.map((g) => g.profile_id))]);
  const byId = new Map(((profs ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [p.id, p]));
  return grants.map((g) => ({
    id: g.id,
    profileId: g.profile_id,
    audiencia: g.audiencia,
    status: g.status,
    nombre: byId.get(g.profile_id)?.full_name ?? "—",
    email: byId.get(g.profile_id)?.email ?? "—",
    requestedAt: g.requested_at,
    decidedAt: g.decided_at,
  }));
}

export async function decidirPlus(grantId: string, decision: "activo" | "rechazado" | "pendiente"): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  if (!["activo", "rechazado", "pendiente"].includes(decision)) return { ok: false, error: "Decisión inválida." };
  const service = createServiceRoleClient();
  const { error } = await service
    .from("tools_plus_grants")
    .update({ status: decision, decided_at: decision === "pendiente" ? null : new Date().toISOString(), decided_by: decision === "pendiente" ? null : adminId })
    .eq("id", grantId);
  if (error) return { ok: false, error: "No se pudo actualizar la solicitud." };
  await service.from("audit_log").insert({
    entity_type: "tools_plus_grant",
    entity_id: grantId,
    action: "decidido",
    new_status: decision,
    performed_by: adminId,
  });
  for (const p of ["/ecp/herramientas", "/kaffetal-regal", "/cherry-picked-green", "/directorio", "/herramientas"]) revalidatePath(p);
  return { ok: true };
}
