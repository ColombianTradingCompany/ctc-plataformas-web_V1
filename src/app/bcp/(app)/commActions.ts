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
// "Retroalimentación y ayuda" feed. contextLabel is an optional plain-text
// snapshot ("Finca La Primavera", "Lote CTC_...") set when the note is left
// from a specific finca/lote card rather than the general Productores page --
// it's just for grouping/display, not a real FK.
export async function logProducerComm(producerId: string, contextLabel: string | null, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const note = String(formData.get("note") ?? "").trim();
  if (!note) throw new Error("La nota no puede estar vacía.");

  const { error } = await service.from("producer_comm_log").insert({
    producer_id: producerId,
    context_label: contextLabel,
    note,
    created_by: adminId,
  });
  if (error) throw new Error("No se pudo registrar la comunicación.");

  revalidatePath("/bcp/productores");
  revalidatePath("/bcp/fincas");
  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp");
}
