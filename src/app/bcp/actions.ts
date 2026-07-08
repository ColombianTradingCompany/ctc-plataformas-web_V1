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

export async function approveFinca(fincaId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: finca } = await service
    .from("fincas")
    .select("requires_eudr_polygon, eudr_polygon, status")
    .eq("id", fincaId)
    .single();

  if (!finca) throw new Error("Finca no encontrada.");
  if (finca.requires_eudr_polygon && !finca.eudr_polygon) {
    throw new Error("Esta finca supera 4 ha y necesita el polígono EUDR antes de poder aprobarse.");
  }

  await service.from("fincas").update({ status: "approved" }).eq("id", fincaId);
  await service.from("audit_log").insert({
    entity_type: "finca",
    entity_id: fincaId,
    action: "approved",
    previous_status: finca.status,
    new_status: "approved",
    performed_by: adminId,
  });

  revalidatePath("/bcp");
}

export async function rejectFinca(fincaId: string, notes: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: finca } = await service.from("fincas").select("status").eq("id", fincaId).single();
  if (!finca) throw new Error("Finca no encontrada.");

  await service.from("fincas").update({ status: "rejected" }).eq("id", fincaId);
  await service.from("audit_log").insert({
    entity_type: "finca",
    entity_id: fincaId,
    action: "rejected",
    previous_status: finca.status,
    new_status: "rejected",
    performed_by: adminId,
    notes,
  });

  revalidatePath("/bcp");
}
