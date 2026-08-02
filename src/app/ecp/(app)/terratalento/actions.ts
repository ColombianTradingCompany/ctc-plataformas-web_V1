"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// ── Terratalento · acciones del tablero de match (ECP) ──────────────────────
// CTC empareja cada Jornada con sus recolectores: llama, confirma (sin pasar
// los cupos) o descarta. Todo con audit_log, como el resto de la consola.

export type ActionResult = { ok: true } | { ok: false; error: string };

const ESTADOS_POSTULACION = ["postulado", "llamado", "confirmado", "descartado"] as const;

export async function setPostulacionEstado(postulacionId: string, estado: string): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  if (!ESTADOS_POSTULACION.includes(estado as (typeof ESTADOS_POSTULACION)[number])) {
    return { ok: false, error: "Estado inválido." };
  }
  const service = createServiceRoleClient();

  const { data: post } = await service
    .from("terratalento_postulaciones")
    .select("id, estado, jornada_id")
    .eq("id", postulacionId)
    .maybeSingle();
  if (!post) return { ok: false, error: "Postulación no encontrada." };
  if (post.estado === "retirado") return { ok: false, error: "El recolector retiró esta postulación." };
  if (post.estado === estado) return { ok: true };

  if (estado === "confirmado") {
    const [{ data: jornada }, { count: confirmados }] = await Promise.all([
      service.from("terratalento_jornadas").select("cupos").eq("id", post.jornada_id).maybeSingle(),
      service
        .from("terratalento_postulaciones")
        .select("id", { count: "exact", head: true })
        .eq("jornada_id", post.jornada_id)
        .eq("estado", "confirmado"),
    ]);
    if (jornada && (confirmados ?? 0) >= Number(jornada.cupos)) {
      return { ok: false, error: "Los cupos de esta jornada ya están completos." };
    }
  }

  const { error } = await service.from("terratalento_postulaciones").update({ estado }).eq("id", postulacionId);
  if (error) return { ok: false, error: "No se pudo actualizar la postulación." };

  await service.from("audit_log").insert({
    entity_type: "terratalento_postulacion",
    entity_id: postulacionId,
    action: "estado_changed",
    new_status: estado,
    performed_by: adminId,
  });
  revalidatePath("/ecp/terratalento");
  return { ok: true };
}

const ESTADOS_JORNADA = ["abierta", "en_gestion", "cerrada", "cancelada"] as const;

export async function setJornadaEstadoAdmin(jornadaId: string, estado: string): Promise<ActionResult> {
  const adminId = await requireActiveAdmin();
  if (!ESTADOS_JORNADA.includes(estado as (typeof ESTADOS_JORNADA)[number])) {
    return { ok: false, error: "Estado inválido." };
  }
  const service = createServiceRoleClient();
  const { error } = await service.from("terratalento_jornadas").update({ estado }).eq("id", jornadaId);
  if (error) return { ok: false, error: "No se pudo actualizar la jornada." };

  await service.from("audit_log").insert({
    entity_type: "terratalento_jornada",
    entity_id: jornadaId,
    action: "estado_changed",
    new_status: estado,
    performed_by: adminId,
  });
  revalidatePath("/ecp/terratalento");
  return { ok: true };
}
