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

export async function publishLot(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const lotId = String(formData.get("lot_id"));
  const { data: lot } = await service.from("lots").select("stage, grade").eq("id", lotId).single();
  if (!lot) throw new Error("Lote no encontrado.");
  if (lot.stage !== "galardonado") throw new Error("Solo se pueden publicar lotes galardonados.");
  if (lot.grade === "tyrian") throw new Error("Los lotes Tyrian no se publican en el catálogo — van a la subasta.");

  const { error } = await service.from("lot_listings").insert({
    lot_id: lotId,
    commercial_mode: String(formData.get("commercial_mode")),
    unit_kg: Number(formData.get("unit_kg")),
    moq_kg: Number(formData.get("moq_kg")),
    total_kg: Number(formData.get("total_kg")),
    price_per_kg: Number(formData.get("price_per_kg")),
    deposit_pct: Number(formData.get("deposit_pct") || 30),
    arrival_date: String(formData.get("arrival_date") || "") || null,
    status: "published",
    published_at: new Date().toISOString(),
  });
  if (error) throw new Error("No se pudo publicar el lote: " + error.message);

  await service.from("audit_log").insert({
    entity_type: "lot_listing",
    entity_id: lotId,
    action: "published",
    new_status: "published",
    performed_by: adminId,
  });

  revalidatePath("/bcp/catalogo");
  revalidatePath("/bcp");
}

export async function unpublishListing(listingId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: listing } = await service.from("lot_listings").select("status").eq("id", listingId).single();
  if (!listing) throw new Error("Publicación no encontrada.");

  await service.from("lot_listings").update({ status: "archived" }).eq("id", listingId);
  await service.from("audit_log").insert({
    entity_type: "lot_listing",
    entity_id: listingId,
    action: "archived",
    previous_status: listing.status,
    new_status: "archived",
    performed_by: adminId,
  });

  revalidatePath("/bcp/catalogo");
}
