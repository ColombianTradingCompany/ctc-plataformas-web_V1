"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/panel/ActionForm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { computeFactor, labEvaluationHasData, protocoloDelPunto, puntoDeLaPlanilla, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { decidirPorPunto, puntoDeFila } from "@/lib/arena/homologacion";
import { ATRIBUTOS_SCA } from "@/lib/fichas/tipos";

// ── Kaffetal Regal Arena · sesiones de SEGUNDA APRECIACIÓN (V5.77, owner 2026-09-24) ──
// La Arena se queda en «BCP · Ecosistema de Valor» y se rehace para su nueva función
// (`docs/PLAN_CIRCUITO_DEL_LOTE.md` §6, nota del owner): ya no es la gala con jornada en
// vivo, jueces, descartes y ganador —eso se retiró entero: runner, planillas de taza,
// `arena_scores`, invitaciones a la vitrina, fases `arena·sesion·competido`—. Ahora una
// sesión es un NOMBRE (sin temporada ni fecha), se llena con cafés GALARDONADOS y a cada
// uno se le puede hacer una apreciación más con la planilla (B2 · B3), que se ADJUNTA al
// lote como una `lot_evaluations` (source `bcp_arena`, aceptada). El grado del lote lo
// rige UNA sola evaluación (`rige_grado`), por defecto la inicial del Q-Grader; aquí se
// puede elegir otra, y esa elección es lo ÚNICO que reescribe `lots.grade` fuera del
// veredicto. Las temporadas (`harvest_seasons`) siguen aquí hasta mudarse al OCP.
//
// Todas las acciones devuelven resultado — nunca lanzan (lección V12).

const PATHS = ["/bcp/arena", "/ocp/kr", "/bcp"];
function revalidar(sessionId?: string) {
  for (const p of PATHS) revalidatePath(p);
  if (sessionId) revalidatePath(`/bcp/arena/${sessionId}`);
}

export async function createHarvestSeason(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();

  const { error } = await service.from("harvest_seasons").insert({
    kind: String(formData.get("kind")),
    year: Number(formData.get("year")),
    arena_starts_at: String(formData.get("arena_starts_at") || "") || null,
    arena_ends_at: String(formData.get("arena_ends_at") || "") || null,
  });
  if (error) return { ok: false, error: `No se pudo crear la temporada: ${error.message}` };

  revalidatePath("/bcp/arena/temporadas");
  revalidatePath("/bcp/arena");
  return { ok: true };
}

/** Una sesión nueva: solo un nombre. Redirige a la sesión para llenarla. */
export async function createArenaSession(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { ok: false, error: "Dele un nombre a la sesión (mínimo 3 caracteres)." };

  const { data: session, error } = await service
    .from("arena_sessions")
    .insert({ name, created_by: adminId })
    .select("id")
    .single();
  if (error || !session) return { ok: false, error: `No se pudo crear la sesión${error ? `: ${error.message}` : "."}` };

  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: session.id,
    action: "created",
    performed_by: adminId,
    notes: name,
  });
  revalidar();
  redirect(`/bcp/arena/${session.id}`);
}

/** Elimina una sesión y su lista de cafés. Las apreciaciones ya adjuntadas a los lotes se QUEDAN: son del lote, no de la sesión. */
export async function deleteArenaSession(sessionId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: sess } = await service.from("arena_sessions").select("id, name").eq("id", sessionId).maybeSingle();
  if (!sess) return { ok: false, error: "Sesión no encontrada." };

  await service.from("arena_scores").delete().eq("arena_session_id", sessionId); // legado de la jornada, por si quedara algo
  await service.from("arena_session_lots").delete().eq("arena_session_id", sessionId);
  const { error } = await service.from("arena_sessions").delete().eq("id", sessionId);
  if (error) return { ok: false, error: "No se pudo eliminar la sesión." };

  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: sessionId,
    action: "session_deleted",
    performed_by: adminId,
    notes: sess.name ?? null,
  });
  revalidar(sessionId);
  return { ok: true };
}

/** Mete un café GALARDONADO en la sesión. */
export async function addLotToSession(sessionId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const lotId = String(formData.get("lot_id") ?? "");
  const [{ data: sess }, { data: lot }] = await Promise.all([
    service.from("arena_sessions").select("id").eq("id", sessionId).maybeSingle(),
    service.from("lots").select("id, name, stage").eq("id", lotId).maybeSingle(),
  ]);
  if (!sess) return { ok: false, error: "Sesión no encontrada." };
  if (!lot) return { ok: false, error: "Elija un café." };
  if (lot.stage !== "galardonado") return { ok: false, error: "A una sesión solo entran cafés GALARDONADOS." };

  const { error } = await service.from("arena_session_lots").insert({ arena_session_id: sessionId, lot_id: lotId });
  if (error) return { ok: false, error: "Ese café ya está en la sesión." };
  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: sessionId,
    action: "lot_added",
    performed_by: adminId,
    notes: lot.name,
  });
  revalidar(sessionId);
  return { ok: true };
}

export async function removeLotFromSession(sessionId: string, lotId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  await service.from("arena_session_lots").delete().eq("arena_session_id", sessionId).eq("lot_id", lotId);
  revalidar(sessionId);
  return { ok: true };
}

/**
 * Una apreciación MÁS de un café de la sesión: la planilla B2 · B3 se adjunta al lote como `lot_evaluations`
 * (`bcp_arena`, aceptada, `rige_grado = false`). No toca el grado: para eso está `elegirEvaluacionQueRige`.
 */
export async function registrarApreciacion(sessionId: string, lotId: string, evaluation: LabEvaluation): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const [{ data: sess }, { data: roster }, { data: lot }] = await Promise.all([
    service.from("arena_sessions").select("id, name").eq("id", sessionId).maybeSingle(),
    service.from("arena_session_lots").select("lot_id").eq("arena_session_id", sessionId).eq("lot_id", lotId),
    service.from("lots").select("id, name, producer_id").eq("id", lotId).maybeSingle(),
  ]);
  if (!sess) return { ok: false, error: "Sesión no encontrada." };
  if (!roster?.length || !lot) return { ok: false, error: "Ese café no está en esta sesión." };
  if (!labEvaluationHasData(evaluation)) return { ok: false, error: "La planilla está vacía — digite al menos un dato." };

  const punto = puntoDeLaPlanilla(evaluation);
  const puntaje = punto?.bajo ?? null;
  const scaData: Record<string, number> = {};
  for (const key of ATRIBUTOS_SCA) scaData[key] = Number(evaluation[`sca_${key}` as keyof LabEvaluation]) || 0;
  const fisico: Record<string, unknown> = { tipo: "apreciacion_arena", session_id: sessionId, session_name: sess.name };
  for (const [k, v] of Object.entries(evaluation)) if (k.startsWith("fa_") || k.startsWith("mesh_")) fisico[k] = v;

  const { data: fila, error } = await service
    .from("lot_evaluations")
    .insert({
      lot_id: lotId,
      source: "bcp_arena",
      status: "accepted",
      sca_total: puntaje,
      punto,
      cva_total: punto?.cvaTotal ?? null,
      escala: protocoloDelPunto(evaluation),
      sca_data: scaData,
      factor_rendimiento: computeFactor(evaluation).yieldFactor,
      physical_data: fisico,
      notes: evaluation.analysis_notes?.trim() || null,
      submitted_by: adminId,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rige_grado: false,
    })
    .select("id")
    .single();
  if (error || !fila) return { ok: false, error: `No se pudo guardar la apreciación${error ? `: ${error.message}` : "."}` };

  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "apreciacion_registrada",
    performed_by: adminId,
    notes: `Sesión «${sess.name ?? sessionId.slice(0, 8)}» · SCA ${puntaje ?? "—"} · evaluación ${fila.id.slice(0, 8)}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `CTCx hizo una nueva apreciación de su lote en una sesión de la Kaffetal Regal Arena${puntaje != null ? ` (SCA ${puntaje})` : ""}. Se adjunta a su expediente; su Grado no cambia salvo que CTCx lo decida.`,
    created_by: adminId,
  });
  revalidar(sessionId);
  return { ok: true };
}

/**
 * Elige QUÉ evaluación rige el grado del lote (una sola por lote) y reescribe `lots.grade` con ella
 * («el puntaje manda»: `gradoPorPuntaje`). Es la única reescritura del grado fuera del veredicto.
 */
export async function elegirEvaluacionQueRige(lotId: string, evaluationId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("bcp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const [{ data: ev }, { data: lot }] = await Promise.all([
    service.from("lot_evaluations").select("id, lot_id, status, sca_total, punto, source").eq("id", evaluationId).maybeSingle(),
    service.from("lots").select("id, name, stage, grade").eq("id", lotId).maybeSingle(),
  ]);
  if (!ev || ev.lot_id !== lotId) return { ok: false, error: "Esa evaluación no es de este lote." };
  if (ev.status !== "accepted" || ev.sca_total == null) return { ok: false, error: "Solo rige una evaluación aceptada con puntaje." };
  if (!lot || lot.stage !== "galardonado") return { ok: false, error: "Solo se elige la evaluación que rige de un lote galardonado." };
  // V5.92: el grado firme lo decide el Punto (piso; un homologado nunca da Tyrian; si cruza los 80, pendiente de recata).
  const punto = puntoDeFila(ev);
  const decision = punto ? decidirPorPunto(punto) : null;
  if (!decision || decision.tipo !== "galardon") return { ok: false, error: `Con Punto ${ev.sca_total} el lote quedaría por debajo de Black (o pendiente de recata SCA): esa evaluación no puede regir.` };
  const grado = decision.grado;

  await service.from("lot_evaluations").update({ rige_grado: false }).eq("lot_id", lotId).eq("rige_grado", true);
  const { error } = await service.from("lot_evaluations").update({ rige_grado: true }).eq("id", evaluationId);
  if (error) return { ok: false, error: `No se pudo marcar la evaluación: ${error.message}` };
  if (lot.grade !== grado.id) await service.from("lots").update({ grade: grado.id }).eq("id", lotId);

  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "grade_source_changed",
    previous_status: lot.grade,
    new_status: grado.id,
    performed_by: adminId,
    notes: `Rige la evaluación ${evaluationId.slice(0, 8)} (${ev.source}, SCA ${ev.sca_total})`,
  });
  revalidar();
  return { ok: true };
}
