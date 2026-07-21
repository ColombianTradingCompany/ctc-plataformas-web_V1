"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import {
  activeCups,
  allowedDiscardGrades,
  cupLabel,
  discardPlan,
  emptyJornadaState,
  factorResults,
  finalistAllowedGrades,
  granulometriaComplete,
  scaComplete,
  scaTotal,
  SCA_KEYS,
  type DiscardGrade,
  type JornadaState,
} from "@/lib/arena/jornada";
import { labEvaluationHasData, toLabEvaluationList, type LabEvaluation } from "@/lib/arena/labEvaluation";

async function requireAdmin() {
  // Delegates to the shared write-path gate (bcp_admin + panel_users.status),
  // so suspending a collaborator revokes Server Actions instantly.
  return requireActiveAdmin();
}

export async function createHarvestSeason(formData: FormData) {
  await requireAdmin();
  const service = createServiceRoleClient();

  await service.from("harvest_seasons").insert({
    kind: String(formData.get("kind")),
    year: Number(formData.get("year")),
    arena_starts_at: String(formData.get("arena_starts_at") || "") || null,
    arena_ends_at: String(formData.get("arena_ends_at") || "") || null,
  });

  revalidatePath("/bcp/arena/temporadas");
  revalidatePath("/bcp/arena");
}

export async function createArenaSession(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const capacity = Number(formData.get("capacity")) === 5 ? 5 : 7;
  const { data: session, error } = await service
    .from("arena_sessions")
    .insert({
      harvest_season_id: String(formData.get("harvest_season_id")),
      session_date: String(formData.get("session_date")),
      capacity,
      created_by: adminId,
    })
    .select("id")
    .single();

  if (error || !session) throw new Error("No se pudo crear la sesión.");

  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: session.id,
    action: "created",
    new_status: "scheduled",
    performed_by: adminId,
  });

  revalidatePath("/bcp/arena");
  redirect(`/bcp/arena/${session.id}`);
}

// Nota: los lotes se bloquean en una sesión desde el POOL «Aptos» del módulo
// Arena (assignLotToSession en nominadosActions.ts), que exige phase='arena'
// (sondeo aprobado) + cupo 5/7 y mueve el lote a fila_arena. El
// "Disponibles"/agregar-manual y el flujo de puntaje manual legado
// (recordArenaScore/closeArenaSession) se retiraron con la jornada v2.

/**
 * Elimina una sesión de Arena y DEVUELVE sus cafés al pool de Aptos, para que
 * ningún dato quede colgado (raíz del bug de "En sesión de Arena" fantasma):
 * las inscripciones vuelven a phase='arena' y los lotes a stage='apto' (sin
 * grado), se borran las planillas de taza (arena_scores) y el roster. Sirve
 * para limpiar sesiones de prueba o rehacer una jornada.
 */
export async function deleteArenaSession(
  sessionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: sess } = await service.from("arena_sessions").select("id").eq("id", sessionId).maybeSingle();
  if (!sess) return { ok: false, error: "Sesión no encontrada." };

  const { data: roster } = await service.from("arena_session_lots").select("lot_id").eq("arena_session_id", sessionId);
  const lotIds = [...new Set((roster ?? []).map((r) => r.lot_id))];
  if (lotIds.length) {
    // Las inscripciones que estaban en sesión/competido vuelven a «arena» (Aptos).
    await service.from("arena_inscriptions").update({ phase: "arena" }).in("lot_id", lotIds).in("phase", ["sesion", "competido"]);
    // Los lotes marcados por ESTA sesión (fila_arena/evaluado/galardonado) vuelven
    // a «apto», sin grado (el grado lo otorgaba la sesión que se elimina).
    await service.from("lots").update({ stage: "apto", grade: null }).in("id", lotIds).in("stage", ["fila_arena", "evaluado", "galardonado"]);
  }

  await service.from("arena_scores").delete().eq("arena_session_id", sessionId);
  await service.from("arena_session_lots").delete().eq("arena_session_id", sessionId);
  const { error } = await service.from("arena_sessions").delete().eq("id", sessionId);
  if (error) return { ok: false, error: "No se pudo eliminar la sesión." };

  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: sessionId,
    action: "session_deleted",
    performed_by: adminId,
    notes: `${lotIds.length} café(s) devuelto(s) a Aptos`,
  });
  revalidatePath("/bcp/arena");
  revalidatePath("/bcp/nominados");
  revalidatePath("/bcp");
  return { ok: true };
}

/**
 * Registro B2/B3 por café de una sesión (2026-07-20): las mismas interfaces de
 * la Ficha, disponibles DESDE EL PRINCIPIO y VARIAS VECES por café (pedido del
 * owner) — cada guardado AÑADE una planilla a la lista de ese café en
 * arena_sessions.cup_registrations (jsonb {lotId: [planillas]}). La jornada
 * podrá sembrarse de aquí cuando se rediseñe (segunda pasada).
 */
export async function saveCupRegistration(
  sessionId: string,
  lotId: string,
  evaluation: LabEvaluation
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const [{ data: session }, { data: roster }] = await Promise.all([
    service.from("arena_sessions").select("id, status, cup_registrations").eq("id", sessionId).maybeSingle(),
    service.from("arena_session_lots").select("lot_id").eq("arena_session_id", sessionId),
  ]);
  if (!session || session.status === "completed") return { ok: false, error: "La sesión no admite registros." };
  if (!(roster ?? []).some((r) => r.lot_id === lotId)) return { ok: false, error: "Ese café no está en esta sesión." };
  if (!labEvaluationHasData(evaluation)) return { ok: false, error: "La planilla está vacía — digite al menos un dato." };

  const current = { ...((session.cup_registrations as Record<string, unknown>) ?? {}) };
  current[lotId] = [...toLabEvaluationList(current[lotId]), { ...evaluation, saved_at: new Date().toISOString(), saved_by: adminId }];
  const { error } = await service.from("arena_sessions").update({ cup_registrations: current }).eq("id", sessionId);
  if (error) return { ok: false, error: "No se pudo guardar el registro." };

  revalidatePath("/bcp/arena");
  revalidatePath(`/bcp/arena/${sessionId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Jornada de Arena (runner en vivo) -- ver src/lib/arena/jornada.ts para el
// guion, el shape del run_state y las compuertas compartidas cliente/servidor.
// ---------------------------------------------------------------------------

export async function startJornada(sessionId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: session } = await service.from("arena_sessions").select("id, status, run_state").eq("id", sessionId).single();
  if (!session || session.status === "completed") throw new Error("La sesión no está disponible para una jornada.");

  if (!session.run_state) {
    const { data: sessionRow } = await service.from("arena_sessions").select("capacity").eq("id", sessionId).single();
    const capacity = sessionRow?.capacity ?? 7;
    const { data: sessionLots } = await service.from("arena_session_lots").select("lot_id").eq("arena_session_id", sessionId);
    const lotIds = (sessionLots ?? []).map((r) => r.lot_id);
    if (lotIds.length !== capacity) throw new Error(`La jornada necesita exactamente ${capacity} cafés (hay ${lotIds.length}).`);

    // Barajar el orden de tazas: la etiqueta "Taza N" es lo único que ve la
    // mesa, así que el orden no debe delatar el orden en que se agregaron.
    for (let i = lotIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lotIds[i], lotIds[j]] = [lotIds[j], lotIds[i]];
    }

    await service
      .from("arena_sessions")
      .update({ run_state: emptyJornadaState(lotIds), status: "in_progress" })
      .eq("id", sessionId);
    await service.from("audit_log").insert({
      entity_type: "arena_session",
      entity_id: sessionId,
      action: "jornada_started",
      new_status: "in_progress",
      performed_by: adminId,
    });
    revalidatePath(`/bcp/arena/${sessionId}`);
    revalidatePath("/bcp/arena");
  }

  redirect(`/bcp/arena/${sessionId}/run`);
}

// Autosave del runner. El estado completo viaja como un solo jsonb -- es
// maquinaria interna service-role-only, igual que el resto de tablas Arena.
export async function saveJornadaState(sessionId: string, state: JornadaState) {
  await requireAdmin();
  const service = createServiceRoleClient();

  const { data: session } = await service.from("arena_sessions").select("status, run_state").eq("id", sessionId).single();
  if (!session || session.status === "completed" || !session.run_state) throw new Error("La jornada no admite cambios.");

  await service.from("arena_sessions").update({ run_state: state }).eq("id", sessionId);
}

// Re-valida en servidor todo lo que el runner ya bloqueó en cliente y hace las
// escrituras reales: una lot_evaluation completa (planilla SCA + granulometría)
// por CADA café de la jornada, arena_scores por juez para las finalistas,
// grado por mayoría → galardonado + contrato (regla existente), descartadas →
// evaluado, y el ganador de la jornada en la sesión.
export async function finalizeJornada(sessionId: string, state: JornadaState) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: session } = await service.from("arena_sessions").select("status, run_state").eq("id", sessionId).single();
  if (!session || session.status === "completed" || !session.run_state) throw new Error("La jornada no admite cambios.");

  const judges = state.guests.map((g) => g.name.trim()).filter(Boolean);
  if (!judges.length) throw new Error("La jornada no tiene jueces registrados.");

  const plan = discardPlan(state.cup_order.length);
  if (state.discards[0].length !== plan[0] || state.discards[1].length !== plan[1])
    throw new Error("Los descartes de la jornada están incompletos.");

  const finalists = activeCups(state);
  const ranking = state.verdict.ranking;
  if (ranking.length !== finalists.length || new Set(ranking).size !== finalists.length || !ranking.every((id) => finalists.includes(id)))
    throw new Error("El orden de los finalistas está incompleto.");
  const winner = ranking[0];

  for (const lotId of state.cup_order) {
    if (!granulometriaComplete(state.granulometria[lotId]))
      throw new Error(`Granulometría incompleta en ${cupLabel(state, lotId)}.`);
    if (!scaComplete(state.sca[lotId])) throw new Error(`Planilla SCA incompleta en ${cupLabel(state, lotId)}.`);
  }
  // Grados por comité (v2): eliminados en su descarte, finalistas en el veredicto.
  for (const [round, discarded] of state.discards.entries()) {
    for (const lotId of discarded) {
      if (!allowedDiscardGrades(round as 0 | 1).includes(state.discard_grades[lotId] as DiscardGrade))
        throw new Error(`Falta el grado del descarte en ${cupLabel(state, lotId)}.`);
    }
  }
  const finalistAllowed = finalistAllowedGrades(state);
  for (const lotId of finalists) {
    const g = state.verdict.grades[lotId];
    if (!g || !finalistAllowed.includes(g)) throw new Error(`Grado del finalista inválido en ${cupLabel(state, lotId)}.`);
  }

  const qGrader = state.guests.find((g) => g.role === "q_grader" && g.name.trim())?.name.trim() ?? null;
  // Comité como un solo evaluador para arena_scores/producer_comm_log.
  const committee = qGrader ?? state.guests.find((g) => g.role === "host" && g.name.trim())?.name.trim() ?? "Comité CTC";
  // Se otorga la membresía del Club a cada productor participante (una vez).
  const grantedMembers = new Set<string>();

  for (const lotId of state.cup_order) {
    const sheet = state.sca[lotId];
    const scaData: Record<string, number> = {};
    for (const key of SCA_KEYS) scaData[key] = Number(sheet[key]);

    const granulometria = state.granulometria[lotId];
    const derived = factorResults(granulometria);
    const notes = state.notes[lotId];
    const noteText = [
      notes.fragancia && `Fragancia (seco): ${notes.fragancia}`,
      notes.aroma && `Aroma (remojo): ${notes.aroma}`,
      notes.cata1 && `Primera catación: ${notes.cata1}`,
      notes.aroma2 && `Descripción oficial Q-Grader: ${notes.aroma2}`,
      notes.cata2 && `Segunda catación: ${notes.cata2}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await service.from("lot_evaluations").insert({
      lot_id: lotId,
      source: "bcp_arena",
      status: "accepted",
      sca_total: scaTotal(sheet),
      sca_data: scaData,
      factor_rendimiento: derived.factor,
      physical_data: { ...granulometria, ...derived, tipo: "jornada_arena", taza: cupLabel(state, lotId) },
      q_grader_reference: qGrader,
      notes: noteText || null,
      submitted_by: adminId,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    });
    if (error) throw new Error(`No se pudo guardar la evaluación de ${cupLabel(state, lotId)}.`);
  }

  // Grada CADA participante con el grado del comité (finalistas + eliminados).
  // Todos salen 'galardonado' con su grado; el destino comercial se decide por
  // grado: red/blue/gold → contrato; black → negociación aparte; tyrian → subasta.
  const gradeByLot = new Map<string, string>();
  for (const lotId of finalists) gradeByLot.set(lotId, state.verdict.grades[lotId]);
  for (const discarded of state.discards) for (const lotId of discarded) gradeByLot.set(lotId, state.discard_grades[lotId]);

  for (const lotId of state.cup_order) {
    const grade = gradeByLot.get(lotId)!;
    const rank = ranking.indexOf(lotId); // -1 si fue descartado
    const { data: lot } = await service.from("lots").select("stage, producer_id").eq("id", lotId).single();

    // Un renglón de comité en arena_scores conserva la forma de la tabla para el historial.
    await service.from("arena_scores").insert({
      arena_session_id: sessionId,
      lot_id: lotId,
      q_grader_name: committee,
      grade_awarded: grade,
      cupping_notes: state.notes[lotId].aroma2 || null,
      entered_by: adminId,
    });

    await service.from("lots").update({ grade, stage: "galardonado" }).eq("id", lotId);
    await service.from("audit_log").insert({
      entity_type: "lot",
      entity_id: lotId,
      action: "graded",
      previous_status: lot?.stage,
      new_status: "galardonado",
      performed_by: adminId,
      notes: `Jornada de Arena — ${cupLabel(state, lotId)}. Grado del comité: ${grade}${rank === 0 ? ". GANADOR de la jornada." : rank > 0 ? ` (finalista ${rank + 1}º)` : " (retirado en descarte)"}.`,
    });

    // Membresía del Kaffetal Club: participar en una sesión completada la otorga.
    if (lot?.producer_id && !grantedMembers.has(lot.producer_id)) {
      grantedMembers.add(lot.producer_id);
      const { data: pp } = await service.from("producer_profiles").select("club_member_since").eq("profile_id", lot.producer_id).maybeSingle();
      if (!pp?.club_member_since) {
        await service.from("producer_profiles").upsert(
          { profile_id: lot.producer_id, club_member_since: new Date().toISOString() },
          { onConflict: "profile_id" }
        );
        await service.from("audit_log").insert({
          entity_type: "club_membership",
          entity_id: lot.producer_id,
          action: "granted_by_arena",
          performed_by: adminId,
          notes: `Su lote compitió en la Arena — Pasaporte del Kaffetal Club otorgado.`,
        });
        await service.from("producer_comm_log").insert({
          producer_id: lot.producer_id,
          context_label: null,
          note: "¡Bienvenido al Kaffetal Club! Su lote compitió en la Arena, así que su Pasaporte quedó activo: ya puede firmar contratos de compra con CTC y sus lotes participan en el catálogo de Cherry Picked.",
          created_by: adminId,
        });
      }
    }

    // Destino comercial por grado.
    if (grade === "red" || grade === "blue" || grade === "gold") {
      const { data: contract } = await service
        .from("purchase_contracts")
        .insert({ lot_id: lotId, status: "pending_signature", grade_snapshot: grade })
        .select("id")
        .single();
      if (contract) {
        await service.from("audit_log").insert({
          entity_type: "purchase_contract",
          entity_id: contract.id,
          action: "created",
          new_status: "pending_signature",
          performed_by: adminId,
        });
      }
    } else if (grade === "black") {
      // Los Black se negocian aparte (no forman parte de la compra base).
      const { data: neg } = await service.from("black_negotiations").insert({ lot_id: lotId }).select("id").single();
      if (neg) {
        await service.from("audit_log").insert({
          entity_type: "black_negotiation",
          entity_id: neg.id,
          action: "opened",
          new_status: "abierta",
          performed_by: adminId,
        });
      }
    }
    // tyrian: sin contrato — va a la subasta (fase aún no construida).
  }

  // Marca las inscripciones de los participantes como "competido".
  await service.from("arena_inscriptions").update({ phase: "competido" }).in("lot_id", state.cup_order);

  await service
    .from("arena_sessions")
    .update({ status: "completed", run_state: state, winner_lot_id: winner })
    .eq("id", sessionId);
  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: sessionId,
    action: "closed",
    new_status: "completed",
    performed_by: adminId,
    notes: `Jornada cerrada. Ganador: ${cupLabel(state, winner)}.`,
  });

  revalidatePath(`/bcp/arena/${sessionId}`);
  revalidatePath("/bcp/arena");
  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp/contratos");
  revalidatePath("/bcp/evaluaciones");
  revalidatePath("/bcp/nominados");
  revalidatePath("/bcp");
  // Sin redirect() aquí: el runner navega él mismo al resumen de la sesión
  // cuando la promesa resuelve, y así puede distinguir un error real.
}
