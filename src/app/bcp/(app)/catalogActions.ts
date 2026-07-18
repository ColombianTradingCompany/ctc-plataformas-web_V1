"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

async function requireAdmin() {
  // Delegates to the shared write-path gate (bcp_admin + panel_users.status),
  // so suspending a collaborator revokes Server Actions instantly.
  return requireActiveAdmin();
}

// Devuelve resultado en vez de lanzar: sus 4 compuertas son rechazos de negocio
// ALCANZABLES con un clic normal (no miembro del Club, sin contrato activo, sin
// liberación confirmada, grado equivocado) y un throw en una form action revienta
// la página entera — además, en producción Next redacta el mensaje. Ver ActionForm.tsx.
export async function publishLot(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const lotId = String(formData.get("lot_id"));
  const { data: lot } = await service.from("lots").select("stage, grade, producer_id").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "galardonado") return { ok: false, error: "Solo se pueden publicar lotes galardonados." };
  if (lot.grade === "tyrian") {
    return { ok: false, error: "Los lotes Tyrian no se publican en el catálogo — van a la subasta." };
  }

  // Kaffetal Club gate (defensa en profundidad además del gate al firmar):
  // solo lotes de productores miembros entran al catálogo activo.
  const { data: pp } = await service
    .from("producer_profiles")
    .select("club_member_since")
    .eq("profile_id", lot.producer_id)
    .maybeSingle();
  if (!pp?.club_member_since) {
    return {
      ok: false,
      error: "El productor de este lote todavía no es miembro del Kaffetal Club — la membresía se otorga al competir su lote en una jornada de Arena.",
    };
  }

  const { data: contract } = await service
    .from("purchase_contracts")
    .select("id, status")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!contract || contract.status !== "active") {
    return { ok: false, error: "Este lote necesita un contrato firmado (activo) antes de poder publicarse." };
  }

  const { data: releases } = await service
    .from("contract_releases")
    .select("released_kg")
    .eq("contract_id", contract.id)
    .not("released_at", "is", null);
  const releasedSoFar = (releases ?? []).reduce((a, r) => a + Number(r.released_kg ?? 0), 0);
  if (releasedSoFar <= 0) {
    return {
      ok: false,
      error: "Este contrato aún no tiene ninguna liberación mensual confirmada — regístrala en /bcp/contratos antes de publicar.",
    };
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
  if (error) return { ok: false, error: "No se pudo publicar el lote: " + error.message };

  await service.from("audit_log").insert({
    entity_type: "lot_listing",
    entity_id: lotId,
    action: "published",
    new_status: "published",
    performed_by: adminId,
  });

  revalidatePath("/bcp/catalogo");
  revalidatePath("/bcp");
  return { ok: true };
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
