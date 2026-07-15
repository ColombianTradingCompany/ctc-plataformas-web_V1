"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import {
  activeCups,
  cupLabel,
  discardPlan,
  emptyJornadaState,
  factorResults,
  granulometriaComplete,
  majorityGrade,
  scaComplete,
  scaTotal,
  SCA_KEYS,
  type JornadaState,
} from "@/lib/arena/jornada";

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

  const { data: session, error } = await service
    .from("arena_sessions")
    .insert({
      harvest_season_id: String(formData.get("harvest_season_id")),
      session_date: String(formData.get("session_date")),
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

export async function addLotToSession(sessionId: string, lotId: string) {
  await requireAdmin();
  const service = createServiceRoleClient();
  await service.from("arena_session_lots").insert({ arena_session_id: sessionId, lot_id: lotId });
  revalidatePath(`/bcp/arena/${sessionId}`);
}

export async function recordArenaScore(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const sessionId = String(formData.get("arena_session_id"));
  const lotId = String(formData.get("lot_id"));
  const gradeRaw = String(formData.get("grade_awarded") || "");

  await service.from("arena_scores").insert({
    arena_session_id: sessionId,
    lot_id: lotId,
    q_grader_name: String(formData.get("q_grader_name")),
    grade_awarded: gradeRaw || null,
    cupping_notes: String(formData.get("cupping_notes") || "") || null,
    entered_by: adminId,
  });

  if (await isSessionScheduled(service, sessionId)) {
    await service.from("arena_sessions").update({ status: "in_progress" }).eq("id", sessionId);
  }

  revalidatePath(`/bcp/arena/${sessionId}`);
}

async function isSessionScheduled(service: ReturnType<typeof createServiceRoleClient>, sessionId: string) {
  const { data } = await service.from("arena_sessions").select("status").eq("id", sessionId).single();
  return data?.status === "scheduled";
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
    const { data: sessionLots } = await service.from("arena_session_lots").select("lot_id").eq("arena_session_id", sessionId);
    const lotIds = (sessionLots ?? []).map((r) => r.lot_id);
    if (lotIds.length < 3) throw new Error("La jornada necesita al menos 3 cafés en la sesión.");

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
  if (!state.verdict.winner || !finalists.includes(state.verdict.winner))
    throw new Error("Falta el café ganador de la jornada.");

  for (const lotId of state.cup_order) {
    if (!granulometriaComplete(state.granulometria[lotId]))
      throw new Error(`Granulometría incompleta en ${cupLabel(state, lotId)}.`);
    if (!scaComplete(state.sca[lotId])) throw new Error(`Planilla SCA incompleta en ${cupLabel(state, lotId)}.`);
  }
  for (const lotId of finalists) {
    for (const judge of judges) {
      if (state.verdict.grades[lotId]?.[judge] === undefined)
        throw new Error(`Falta el veredicto de ${judge} para ${cupLabel(state, lotId)}.`);
    }
  }

  const qGrader = state.guests.find((g) => g.role === "q_grader" && g.name.trim())?.name.trim() ?? null;

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

  for (const lotId of finalists) {
    const votes: { grade_awarded: string | null }[] = [];
    for (const judge of judges) {
      const grade = state.verdict.grades[lotId]?.[judge] || null;
      votes.push({ grade_awarded: grade });
      await service.from("arena_scores").insert({
        arena_session_id: sessionId,
        lot_id: lotId,
        q_grader_name: judge,
        grade_awarded: grade,
        cupping_notes: state.notes[lotId].aroma2 || null,
        entered_by: adminId,
      });
    }

    const finalGrade = majorityGrade(votes);
    const { data: lot } = await service.from("lots").select("stage").eq("id", lotId).single();
    const newStage = finalGrade ? "galardonado" : "evaluado";
    await service.from("lots").update({ grade: finalGrade, stage: newStage }).eq("id", lotId);
    await service.from("audit_log").insert({
      entity_type: "lot",
      entity_id: lotId,
      action: "graded",
      previous_status: lot?.stage,
      new_status: newStage,
      performed_by: adminId,
      notes: `Jornada de Arena — ${cupLabel(state, lotId)}. Grado por mayoría: ${finalGrade ?? "sin premio"} (${votes.length} veredicto${votes.length === 1 ? "" : "s"})${state.verdict.winner === lotId ? ". GANADOR de la jornada." : ""}`,
    });

    if (finalGrade && finalGrade !== "tyrian") {
      const { data: contract } = await service
        .from("purchase_contracts")
        .insert({ lot_id: lotId, status: "pending_signature", grade_snapshot: finalGrade })
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
    }
  }

  for (const [round, discarded] of state.discards.entries()) {
    for (const lotId of discarded) {
      const { data: lot } = await service.from("lots").select("stage").eq("id", lotId).single();
      await service.from("lots").update({ grade: null, stage: "evaluado" }).eq("id", lotId);
      await service.from("audit_log").insert({
        entity_type: "lot",
        entity_id: lotId,
        action: "graded",
        previous_status: lot?.stage,
        new_status: "evaluado",
        performed_by: adminId,
        notes: `Jornada de Arena — ${cupLabel(state, lotId)}. Retirado en el ${round === 0 ? "primer" : "segundo"} descarte (evaluación completa registrada).`,
      });
    }
  }

  await service
    .from("arena_sessions")
    .update({ status: "completed", run_state: state, winner_lot_id: state.verdict.winner })
    .eq("id", sessionId);
  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: sessionId,
    action: "closed",
    new_status: "completed",
    performed_by: adminId,
    notes: `Jornada cerrada. Ganador: ${cupLabel(state, state.verdict.winner)}.`,
  });

  revalidatePath(`/bcp/arena/${sessionId}`);
  revalidatePath("/bcp/arena");
  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp/contratos");
  revalidatePath("/bcp/evaluaciones");
  revalidatePath("/bcp");
  // Sin redirect() aquí: el runner navega él mismo al resumen de la sesión
  // cuando la promesa resuelve, y así puede distinguir un error real.
}

export async function closeArenaSession(sessionId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: sessionLots } = await service.from("arena_session_lots").select("lot_id").eq("arena_session_id", sessionId);

  for (const { lot_id } of sessionLots ?? []) {
    const { data: scores } = await service
      .from("arena_scores")
      .select("grade_awarded")
      .eq("arena_session_id", sessionId)
      .eq("lot_id", lot_id);

    if (!scores?.length) {
      // No one scored this lot -- free it up for the next session instead
      // of forcing a decision nobody actually made.
      await service.from("arena_session_lots").delete().eq("arena_session_id", sessionId).eq("lot_id", lot_id);
      continue;
    }

    const finalGrade = majorityGrade(scores);
    const { data: lot } = await service.from("lots").select("stage").eq("id", lot_id).single();
    const newStage = finalGrade ? "galardonado" : "evaluado";

    await service.from("lots").update({ grade: finalGrade, stage: newStage }).eq("id", lot_id);
    await service.from("audit_log").insert({
      entity_type: "lot",
      entity_id: lot_id,
      action: "graded",
      previous_status: lot?.stage,
      new_status: newStage,
      performed_by: adminId,
      notes: `Grado calculado: ${finalGrade ?? "sin premio"} (${scores.length} puntaje${scores.length === 1 ? "" : "s"})`,
    });

    if (finalGrade && finalGrade !== "tyrian") {
      const { data: contract } = await service
        .from("purchase_contracts")
        .insert({ lot_id, status: "pending_signature", grade_snapshot: finalGrade })
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
    }
  }

  await service.from("arena_sessions").update({ status: "completed" }).eq("id", sessionId);
  await service.from("audit_log").insert({
    entity_type: "arena_session",
    entity_id: sessionId,
    action: "closed",
    new_status: "completed",
    performed_by: adminId,
  });

  revalidatePath(`/bcp/arena/${sessionId}`);
  revalidatePath("/bcp/arena");
  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp/contratos");
  revalidatePath("/bcp");
}
