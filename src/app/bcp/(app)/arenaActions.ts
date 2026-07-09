"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") throw new Error("No autorizado.");

  return user.id;
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

const GRADE_ORDER = [null, "black", "red", "blue", "gold", "tyrian"] as const;

function computeMajorityGrade(scores: { grade_awarded: string | null }[]): string | null {
  const tally = new Map<string | null, number>();
  for (const s of scores) tally.set(s.grade_awarded, (tally.get(s.grade_awarded) ?? 0) + 1);

  // GRADE_ORDER runs lowest-to-highest, so using >= (not >) means a later,
  // higher grade overwrites an earlier one on a tied vote count -- that's
  // the "ties break upward" rule.
  let best: string | null = null;
  let bestCount = 0;
  for (const grade of GRADE_ORDER) {
    const count = tally.get(grade) ?? 0;
    if (count >= bestCount) {
      best = grade;
      bestCount = count;
    }
  }
  return best;
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

    const finalGrade = computeMajorityGrade(scores);
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
