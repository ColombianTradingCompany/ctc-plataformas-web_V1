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

  revalidatePath("/bcp/fincas");
  revalidatePath("/bcp");
}

const LOT_STAGES = ["borrador", "ficha_completa", "videos_ok", "muestra_transito", "fila_arena", "evaluado", "galardonado"] as const;

export async function createLot(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const fincaId = String(formData.get("finca_id"));
  const { data: finca } = await service.from("fincas").select("producer_id").eq("id", fincaId).single();
  if (!finca) throw new Error("Finca no encontrada.");

  const { data: lot, error } = await service
    .from("lots")
    .insert({
      finca_id: fincaId,
      producer_id: finca.producer_id,
      name: String(formData.get("name")),
      source: "bcp_manual_entry",
      ficha_variedad: String(formData.get("ficha_variedad") || "") || null,
      ficha_proceso: String(formData.get("ficha_proceso") || "") || null,
      ficha_altitud_m: formData.get("ficha_altitud_m") ? Number(formData.get("ficha_altitud_m")) : null,
      ficha_notas_cata: String(formData.get("ficha_notas_cata") || "") || null,
      ficha_peso_muestra_kg: formData.get("ficha_peso_muestra_kg") ? Number(formData.get("ficha_peso_muestra_kg")) : null,
    })
    .select("id")
    .single();

  if (error || !lot) throw new Error("No se pudo crear el lote.");

  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lot.id,
    action: "created",
    new_status: "borrador",
    performed_by: adminId,
    notes: "Creado por BCP en nombre del productor (source=bcp_manual_entry)",
  });

  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp");
}

export async function updateLotStage(lotId: string, newStage: (typeof LOT_STAGES)[number]) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("stage").eq("id", lotId).single();
  if (!lot) throw new Error("Lote no encontrado.");

  const update: Record<string, unknown> = { stage: newStage };
  if (newStage === "muestra_transito" || LOT_STAGES.indexOf(newStage) > LOT_STAGES.indexOf("muestra_transito")) {
    update.sample_2kg_confirmed_at = new Date().toISOString();
  }

  await service.from("lots").update(update).eq("id", lotId);
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "stage_updated",
    previous_status: lot.stage,
    new_status: newStage,
    performed_by: adminId,
  });

  revalidatePath("/bcp/lotes");
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

  revalidatePath("/bcp/fincas");
  revalidatePath("/bcp");
}
