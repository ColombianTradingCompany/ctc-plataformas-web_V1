"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

async function requireAdmin() {
  // Delegates to the shared write-path gate (bcp_admin + panel_users.status),
  // so suspending a collaborator revokes Server Actions instantly.
  return requireActiveAdmin();
}

// A BCP-submitted evaluation is authoritative on entry (auto-accepted) --
// unlike a producer_claim, which always starts pending. This is the "many
// evaluations per lot, averaged" path: src/lib/evaluations.ts's averageOf()
// reads every accepted row for a lot and averages sca_total/factor_rendimiento.
export async function submitLotEvaluation(lotId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const scaFields = ["fragrance", "flavor", "aftertaste", "acidity", "body", "balance", "uniformity", "clean_cup", "sweetness", "cuppers"];
  const scaData: Record<string, number> = {};
  let scaTotal = 0;
  for (const key of scaFields) {
    const v = Number(formData.get(`sca_${key}`) || 0);
    scaData[key] = v;
    scaTotal += v;
  }
  const factor = formData.get("factor_rendimiento") ? Number(formData.get("factor_rendimiento")) : null;
  const notes = String(formData.get("notes") || "").trim() || null;

  const { error } = await service.from("lot_evaluations").insert({
    lot_id: lotId,
    source: "bcp_arena",
    status: "accepted",
    sca_total: scaTotal > 0 ? scaTotal : null,
    sca_data: scaData,
    factor_rendimiento: factor,
    notes,
    submitted_by: adminId,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });
  if (error) throw new Error("No se pudo guardar la evaluación.");

  revalidatePath("/bcp/evaluaciones");
}

// Accept or reject a producer's officialization claim. Only on acceptance
// does the claim's score start counting toward the lot's official average --
// a rejected claim stays in the table (audit trail) but is simply excluded.
export async function reviewEvaluationClaim(evaluationId: string, decision: "accepted" | "rejected", notes: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { error } = await service
    .from("lot_evaluations")
    .update({ status: decision, reviewed_by: adminId, reviewed_at: new Date().toISOString(), notes: notes || null })
    .eq("id", evaluationId)
    .eq("status", "pending");
  if (error) throw new Error("No se pudo actualizar la solicitud.");

  revalidatePath("/bcp/evaluaciones");
}
