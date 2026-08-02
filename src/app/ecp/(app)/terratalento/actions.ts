"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { sendLlamadoEmail } from "@/lib/email/terratalentoEmails";

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

  // La notificación del llamado: en "llamado" y "confirmado" el recolector
  // recibe correo. El cambio de estado NUNCA se bloquea por el envío — el
  // resultado se persiste en la fila (patrón leads) y el ECP puede reintentar.
  if (estado === "llamado" || estado === "confirmado") {
    await notificarPostulacion(service, postulacionId, estado);
  }

  revalidatePath("/ecp/terratalento");
  return { ok: true };
}

// Arma el correo desde la fila (recolector + jornada + finca) y persiste el
// resultado. Compartido por el envío automático y el reintento manual.
async function notificarPostulacion(
  service: ReturnType<typeof createServiceRoleClient>,
  postulacionId: string,
  tipo: "llamado" | "confirmado"
): Promise<{ ok: boolean }> {
  const { data: post } = await service
    .from("terratalento_postulaciones")
    .select(
      "id, recolector_id, terratalento_jornadas(fecha_inicio, fecha_fin, pago, condiciones, fincas(name, municipio)), terratalento_recolectores(nombre)"
    )
    .eq("id", postulacionId)
    .maybeSingle();
  type Row = {
    recolector_id: string;
    terratalento_jornadas: {
      fecha_inicio: string;
      fecha_fin: string | null;
      pago: string | null;
      condiciones: string | null;
      fincas: { name: string; municipio: string | null } | null;
    } | null;
    terratalento_recolectores: { nombre: string } | null;
  };
  const row = post as unknown as Row | null;
  if (!row?.terratalento_jornadas) return { ok: false };

  const { data: profile } = await service.from("profiles").select("email").eq("id", row.recolector_id).maybeSingle();
  if (!profile?.email) {
    await service
      .from("terratalento_postulaciones")
      .update({ notificacion_error: "La cuenta del recolector no tiene correo." })
      .eq("id", postulacionId);
    return { ok: false };
  }

  const result = await sendLlamadoEmail({
    nombre: row.terratalento_recolectores?.nombre ?? "recolector",
    email: String(profile.email),
    tipo,
    fincaNombre: row.terratalento_jornadas.fincas?.name ?? "una finca de la red",
    municipio: row.terratalento_jornadas.fincas?.municipio ?? "",
    fechaInicio: row.terratalento_jornadas.fecha_inicio,
    fechaFin: row.terratalento_jornadas.fecha_fin,
    pago: row.terratalento_jornadas.pago,
    condiciones: row.terratalento_jornadas.condiciones,
  });
  await service
    .from("terratalento_postulaciones")
    .update(
      result.ok
        ? { notificado_at: new Date().toISOString(), notificacion_error: null }
        : { notificacion_error: result.error }
    )
    .eq("id", postulacionId);
  return { ok: result.ok };
}

/** Reintento manual del correo del llamado (el estado actual decide el texto). */
export async function reenviarNotificacionLlamado(postulacionId: string): Promise<ActionResult> {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data: post } = await service
    .from("terratalento_postulaciones")
    .select("estado")
    .eq("id", postulacionId)
    .maybeSingle();
  if (!post || !["llamado", "confirmado"].includes(String(post.estado))) {
    return { ok: false, error: "Solo se notifica a postulaciones llamadas o confirmadas." };
  }
  const res = await notificarPostulacion(service, postulacionId, post.estado as "llamado" | "confirmado");
  revalidatePath("/ecp/terratalento");
  return res.ok ? { ok: true } : { ok: false, error: "El envío volvió a fallar — el detalle quedó en la fila." };
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
