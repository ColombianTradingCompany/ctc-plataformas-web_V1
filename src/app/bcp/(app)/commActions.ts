"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

async function requireAdmin() {
  // Delegates to the shared write-path gate (bcp_admin + panel_users.status),
  // so suspending a collaborator revokes Server Actions instantly.
  return requireActiveAdmin();
}

// BCP leaves an internal note about a producer -- writes go through here
// (service-role only, no client insert policy), reads are open to the
// producer themselves via producer_comm_log_select_own so it doubles as their
// "Retroalimentación y ayuda" feed. contextLabel is a plain-text snapshot
// ("Finca La Primavera", "Lote CTC_...") for grouping/display; fincaId/lotId
// are the real FKs the producer-side UI uses to link the note back to that
// finca/lote (two fincas or lots can share a name across producers, so the
// label alone is never enough to resolve a link).
export async function logProducerComm(
  producerId: string,
  contextLabel: string | null,
  formData: FormData,
  ref?: { fincaId?: string; lotId?: string }
) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const note = String(formData.get("note") ?? "").trim();
  if (!note) throw new Error("La nota no puede estar vacía.");

  const { error } = await service.from("producer_comm_log").insert({
    producer_id: producerId,
    context_label: contextLabel,
    finca_id: ref?.fincaId ?? null,
    lot_id: ref?.lotId ?? null,
    note,
    created_by: adminId,
  });
  if (error) throw new Error("No se pudo registrar la comunicación.");

  revalidatePath("/bcp/productores");
  revalidatePath("/bcp/fincas");
  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp");
}
