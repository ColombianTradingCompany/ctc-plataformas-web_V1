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

// BCP records a contact with a producer (call, WhatsApp, email…). Lives on
// producer_comm_log, service-role only. Surfaced on the producer's row in
// /bcp/productores and, most-recent-first, on the main /bcp panel.
export async function logProducerComm(producerId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const note = String(formData.get("note") ?? "").trim();
  if (!note) throw new Error("La nota no puede estar vacía.");
  const channel = String(formData.get("channel") ?? "otro");

  const { error } = await service.from("producer_comm_log").insert({
    producer_id: producerId,
    channel,
    note,
    created_by: adminId,
  });
  if (error) throw new Error("No se pudo registrar la comunicación.");

  revalidatePath("/bcp/productores");
  revalidatePath("/bcp");
}
