"use server";

import { revalidatePath } from "next/cache";
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
