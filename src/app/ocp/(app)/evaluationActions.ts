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

// ── V5.143 · Las referencias que el productor AGREGA a un lote con la Ficha cerrada (`lot_referencias`) ──────────────
// El productor puede pedir que CTCx revise un reporte (otro perfil de taza, otro análisis físico). Aquí CTCx la marca
// revisada, con una nota opcional que el productor lee bajo su referencia y en su feed. No cambia el puntaje ni el
// grado del lote: si el reporte merece una evaluación nueva, eso sigue su circuito (Solicitudes de Evaluación).
export async function revisarReferencia(referenciaId: string, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const nota = String(formData.get("nota_ctc") ?? "").trim().slice(0, 1200) || null;

  const { data, error } = await service
    .from("lot_referencias")
    .update({ revisada_at: new Date().toISOString(), revisada_por: permiso.userId, nota_ctc: nota })
    .eq("id", referenciaId)
    .is("revisada_at", null)
    .select("lot_id, producer_id, file_name");
  const fila = (data as { lot_id: string; producer_id: string; file_name: string }[] | null)?.[0];
  if (error || !fila) return { ok: false, error: "No se pudo marcar la revisión (¿ya estaba revisada?)." };

  await service.from("producer_comm_log").insert({
    producer_id: fila.producer_id,
    lot_id: fila.lot_id,
    context_label: "Referencia revisada",
    note: `CTCx revisó la referencia «${fila.file_name}» que usted agregó a su lote.${nota ? ` Nota de CTCx: ${nota}` : ""}`,
    created_by: permiso.userId,
  });
  revalidatePath("/ocp/kr");
  return { ok: true };
}
