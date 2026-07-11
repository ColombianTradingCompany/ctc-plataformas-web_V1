"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { deriveLotRiskLevel } from "@/lib/eudr";

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

// The 2kg-sample handoff is a deliberate two-sided confirmation, not a side effect
// of picking a stage from the dropdown: the producer confirms shipment (Kaffetal
// Regal sets lots.sample_shipped_at), and only then can BCP confirm receipt here --
// which is what actually advances the lot into the Arena queue (fila_arena).
export async function confirmSampleReceived(lotId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("stage, sample_shipped_at, source").eq("id", lotId).single();
  if (!lot) throw new Error("Lote no encontrado.");
  if (!lot.sample_shipped_at && lot.source !== "bcp_manual_entry") {
    throw new Error("El productor todavía no ha confirmado el envío de la muestra.");
  }

  await service
    .from("lots")
    .update({ sample_2kg_confirmed_at: new Date().toISOString(), stage: "fila_arena" })
    .eq("id", lotId);
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "sample_received",
    previous_status: lot.stage,
    new_status: "fila_arena",
    performed_by: adminId,
  });

  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp");
}

// Tri-state yes/no/unset fields render as a <select> with "si"/"no"/"" values
// in the BCP "aided by BCP" forms (see fincas/page.tsx, lotes/page.tsx) --
// this is the single place that string turns into the boolean|null the
// eudr_* columns and src/lib/eudr.ts expect.
function triState(formData: FormData, key: string): boolean | null {
  const v = formData.get(key);
  if (v === "si") return true;
  if (v === "no") return false;
  return null;
}

function textOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

// BCP filling in a finca's EUDR fields on the producer's behalf -- same spirit as
// createLot's source: "bcp_manual_entry", but for the due-diligence dossier rather
// than a whole new lot. Unlike the producer's own edit path (RLS-gated to
// status = 'pending_review'), this uses the service-role client so BCP can still
// help complete a finca even if it's already been approved.
export async function updateFincaEudr(fincaId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const patch = {
    eudr_lat: formData.get("eudr_lat") ? Number(formData.get("eudr_lat")) : null,
    eudr_lng: formData.get("eudr_lng") ? Number(formData.get("eudr_lng")) : null,
    eudr_planting_date: textOrNull(formData, "eudr_planting_date"),
    eudr_production_system: textOrNull(formData, "eudr_production_system"),
    eudr_deforestation_free: triState(formData, "eudr_deforestation_free"),
    eudr_legal_production: triState(formData, "eudr_legal_production"),
    eudr_evidence_types: formData.getAll("eudr_evidence_types").map(String),
    eudr_evidence_notes: textOrNull(formData, "eudr_evidence_notes"),
    eudr_legal_areas: formData.getAll("eudr_legal_areas").map(String),
    eudr_tenure: textOrNull(formData, "eudr_tenure"),
    // eudr_legal_docs_asset_id/filename are NOT set here -- that's the
    // producer's own PDF upload (uploadFincaLegalDoc in KaffetalExperience.tsx),
    // not something BCP fills in on their behalf.
    eudr_sustainability_tags: formData.getAll("eudr_sustainability_tags").map(String),
    eudr_sustainability_notes: textOrNull(formData, "eudr_sustainability_notes"),
    // Placeholder field for a future Google Earth Engine integration -- just
    // stored and linked for now, nothing reads it yet.
    eudr_google_earth_url: textOrNull(formData, "eudr_google_earth_url"),
  };

  const { error } = await service.from("fincas").update(patch).eq("id", fincaId);
  if (error) throw new Error("No se pudo guardar la información EUDR de la finca.");

  await service.from("audit_log").insert({
    entity_type: "finca",
    entity_id: fincaId,
    action: "eudr_updated_by_bcp",
    performed_by: adminId,
    notes: "Campos EUDR completados/editados por BCP en nombre del productor",
  });

  revalidatePath("/bcp/fincas");
}

// Same "aided by BCP" pattern as updateFincaEudr, for the lot-level custody
// chain / risk assessment / mitigation fields.
export async function updateLotEudr(lotId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const eudr_country_risk = textOrNull(formData, "eudr_country_risk") ?? "Estándar";
  const eudr_illegality_indicators = triState(formData, "eudr_illegality_indicators");
  const eudr_docs_available = triState(formData, "eudr_docs_available");
  const eudr_mitigation_effective = triState(formData, "eudr_mitigation_effective");

  const patch = {
    eudr_custody_stages: formData.getAll("eudr_custody_stages").map(String),
    eudr_custody_method: textOrNull(formData, "eudr_custody_method"),
    eudr_custody_notes: textOrNull(formData, "eudr_custody_notes"),
    eudr_country_risk,
    eudr_chain_complexity: textOrNull(formData, "eudr_chain_complexity"),
    eudr_product_risk: textOrNull(formData, "eudr_product_risk"),
    eudr_illegality_indicators,
    eudr_docs_available,
    eudr_cert_scheme: textOrNull(formData, "eudr_cert_scheme"),
    // Derived, not hand-picked -- see deriveLotRiskLevel's comment (Art. 10-11).
    eudr_risk_level:
      deriveLotRiskLevel({ eudr_country_risk, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective }) || null,
    eudr_mitigation_actions: textOrNull(formData, "eudr_mitigation_actions"),
    eudr_mitigation_effective,
    eudr_mitigation_responsible: textOrNull(formData, "eudr_mitigation_responsible"),
  };

  const { error } = await service.from("lots").update(patch).eq("id", lotId);
  if (error) throw new Error("No se pudo guardar la información EUDR del lote.");

  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "eudr_updated_by_bcp",
    performed_by: adminId,
    notes: "Campos EUDR completados/editados por BCP en nombre del productor",
  });

  revalidatePath("/bcp/lotes");
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
