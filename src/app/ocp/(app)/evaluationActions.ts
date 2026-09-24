"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";


// Accept or reject a producer's officialization claim. Only on acceptance
// does the claim's score start counting toward the lot's official average --
// a rejected claim stays in the table (audit trail) but is simply excluded.
export async function reviewEvaluationClaim(evaluationId: string, decision: "accepted" | "rejected", notes: string): Promise<{ ok: true } | { ok: false; error: string }> {
  // V5.77: los reclamos se revisan en la vista completa del lote (`/ocp/kr?lote=`), ya no en la Arena.
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { error } = await service
    .from("lot_evaluations")
    .update({ status: decision, reviewed_by: adminId, reviewed_at: new Date().toISOString(), notes: notes || null })
    .eq("id", evaluationId)
    .eq("status", "pending");
  if (error) return { ok: false, error: "No se pudo actualizar la solicitud." };

  revalidatePath("/ocp/kr");
  return { ok: true };
}
