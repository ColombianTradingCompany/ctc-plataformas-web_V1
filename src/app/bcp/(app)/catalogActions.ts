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
  const { data: lot } = await service.from("lots").select("stage, grade, producer_id").eq("id", lotId).single();
  if (!lot) throw new Error("Lote no encontrado.");
  if (lot.stage !== "galardonado") throw new Error("Solo se pueden publicar lotes galardonados.");
  if (lot.grade === "tyrian") throw new Error("Los lotes Tyrian no se publican en el catálogo — van a la subasta.");

  // Kaffetal Club gate (defensa en profundidad además del gate al firmar):
  // solo lotes de productores miembros entran al catálogo activo.
  const { data: pp } = await service
    .from("producer_profiles")
    .select("club_member_since")
    .eq("profile_id", lot.producer_id)
    .maybeSingle();
  if (!pp?.club_member_since) {
    throw new Error("El productor de este lote no es miembro del Kaffetal Club — emita un código de miembro en /bcp/club antes de publicar.");
  }

  const { data: contract } = await service
    .from("purchase_contracts")
    .select("id, status")
    .eq("lot_id", lotId)
    .single();
  if (!contract || contract.status !== "active") {
    throw new Error("Este lote necesita un contrato firmado (activo) antes de poder publicarse.");
  }

  const { data: releases } = await service
    .from("contract_releases")
    .select("released_kg")
    .eq("contract_id", contract.id)
    .not("released_at", "is", null);
  const releasedSoFar = (releases ?? []).reduce((a, r) => a + Number(r.released_kg ?? 0), 0);
  if (releasedSoFar <= 0) {
    throw new Error("Este contrato aún no tiene ninguna liberación mensual confirmada — regístrala en /bcp/contratos antes de publicar.");
  }

  const { error } = await service.from("lot_listings").insert({
    lot_id: lotId,
    commercial_mode: String(formData.get("commercial_mode")),
    unit_kg: Number(formData.get("unit_kg")),
    moq_kg: Number(formData.get("moq_kg")),
    total_kg: releasedSoFar,
    price_per_kg: Number(formData.get("price_per_kg")),
    deposit_pct: Number(formData.get("deposit_pct") || 30),
    arrival_date: String(formData.get("arrival_date") || "") || null,
    transparency_credit_enabled: formData.get("transparency_credit_enabled") === "true",
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
