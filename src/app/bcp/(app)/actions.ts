"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { countryRiskFor, deriveChainComplexity, deriveProductRisk, fincaEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { deriveCertSchemes } from "@/components/kaffetal-regal/ficha/fichaData";
import { lotInscriptionSettled } from "@/lib/arena/inscriptions";
import { lotEudrGate } from "@/lib/arena/eudrGate";
import { isEvaChecklistKey, missingEvaItems, type EvaChecklist } from "./lotes/evaChecklist";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

type KeyedFiles = Record<string, { assetId: string; fileName: string }>;

// Rebuilds a per-key supporting-file map for an EUDR checkbox group. Keeps only
// currently-checked keys; for each, records a newly-uploaded attachment or
// carries the existing entry over. The file itself never travels through this
// server action: FincaEudrEditor uploads it straight from the browser to
// Supabase Storage (Next actions cap bodies at 1 MB; Vercel at ~4.5 MB -- raw
// 5 MB files through here silently never arrived) and submits only
// "{group}_asset_{key}" / "{group}_name_{key}".
function collectKeyedAttachments(
  formData: FormData,
  group: "evidence" | "sustainability",
  checkedKeys: string[],
  existing: KeyedFiles
): KeyedFiles {
  const out: KeyedFiles = {};
  for (const key of checkedKeys) {
    const assetId = textOrNull(formData, `${group}_asset_${key}`);
    const fileName = textOrNull(formData, `${group}_name_${key}`);
    if (assetId && fileName) out[key] = { assetId, fileName };
    else if (existing[key]) out[key] = existing[key];
  }
  return out;
}

async function requireAdmin() {
  // Delegates to the shared write-path gate (bcp_admin + panel_users.status),
  // so suspending a collaborator revokes Server Actions instantly.
  return requireActiveAdmin();
}

// Devuelve resultado en vez de lanzar: "falta el polígono" y "EUDR incompleta"
// son rechazos alcanzables desde el botón Aprobar (la UI lo deshabilita, pero el
// formulario igual se envía si el estado quedó viejo), y un throw en una form
// action revienta la página (ver ActionForm.tsx).
export async function approveFinca(fincaId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: finca } = await service
    .from("fincas")
    .select(
      "name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_legal_areas, eudr_tenure, requires_eudr_polygon, eudr_polygon_geojson, status"
    )
    .eq("id", fincaId)
    .single();

  if (!finca) return { ok: false, error: "Finca no encontrada." };
  if (finca.requires_eudr_polygon && !finca.eudr_polygon_geojson?.length) {
    return { ok: false, error: "Esta finca supera 4 ha y necesita el polígono EUDR antes de poder aprobarse." };
  }
  // Solo se aprueban fincas cuya debida diligencia EUDR está completa ("Apta").
  // Aprobar una finca incompleta producía el estado contradictorio de una finca
  // "aprobada" que sigue mostrando el distintivo EUDR "Pendiente"
  // (fincaEudrStatus) -- exactamente el bug reportado con La Ceiba.
  const eudrFields: FincaEudrFields = {
    name: finca.name,
    ha: finca.hectares != null ? String(finca.hectares) : "—",
    lat: finca.eudr_lat != null ? String(finca.eudr_lat) : "",
    lng: finca.eudr_lng != null ? String(finca.eudr_lng) : "",
    vereda: finca.vereda || "—",
    mun: finca.municipio || "—",
    depto: finca.departamento || "—",
    eudrDeforestationFree: finca.eudr_deforestation_free,
    eudrLegalProduction: finca.eudr_legal_production,
    eudrLegalAreas: finca.eudr_legal_areas || [],
    eudrTenure: (finca.eudr_tenure as FincaEudrFields["eudrTenure"]) || "",
  };
  if (fincaEudrStatus(eudrFields).code !== "apta") {
    return {
      ok: false,
      error: "La debida diligencia EUDR de esta finca todavía está incompleta; complétela antes de aprobar.",
    };
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
  return { ok: true };
}

// Release (or un-release) the EUDR certification dossier to the producer. Until
// this is on, the producer's certificate page stays gated -- sharing is an
// explicit CTC step, not always-available.
export async function setFincaCertShared(
  fincaId: string,
  shared: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: finca } = await service.from("fincas").select("name, producer_id, status").eq("id", fincaId).single();
  if (!finca) return { ok: false, error: "Finca no encontrada." };
  if (shared && finca.status !== "approved") {
    return { ok: false, error: "Apruebe la finca antes de compartir su certificación." };
  }

  await service.from("fincas").update({ eudr_cert_shared: shared }).eq("id", fincaId);
  if (shared) {
    // Let the producer know the certificate is available, in their feed.
    await service.from("producer_comm_log").insert({
      producer_id: finca.producer_id,
      context_label: `Finca ${finca.name}`,
      finca_id: fincaId,
      note: "Su Certificación EUDR está disponible para descargar en el panel de la finca.",
      created_by: adminId,
    });
  }
  revalidatePath("/bcp/fincas");
  return { ok: true };
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
// Devuelve resultado en vez de lanzar: un throw en una Server Action invocada
// desde un <form> revienta la página entera con el error boundary de Next — fue
// el "crash" reportado al confirmar con la compuerta sin cumplir. Los rechazos
// son estados de negocio esperables y se muestran inline (ConfirmReceiptButton).
// Orden del intake (decidido 2026-07-16): EUDR resuelto → inscripción saldada →
// muestra recibida → recién ahí la fila de la Arena.
export async function confirmSampleReceived(lotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("stage, sample_shipped_at, source").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };

  // 1. EUDR primero: sin la debida diligencia resuelta no hay pago ni recibo.
  const eudr = await lotEudrGate(service, lotId);
  if (!eudr.ready) {
    return { ok: false, error: `La debida diligencia EUDR del lote sigue "${eudr.label}" — resuélvala (finca apta + nivel de riesgo determinado) antes de confirmar pagos o muestras.` };
  }
  // 2. Luego la inscripción de Arena (COP 80.000, descontable/eximible).
  if (!(await lotInscriptionSettled(service, lotId))) {
    return { ok: false, error: "La inscripción de Arena de este lote no está saldada — confírmala (pago, descuento o exención) en /bcp/club." };
  }
  // 3. Y la muestra tiene que haber salido de la finca.
  if (!lot.sample_shipped_at && lot.source !== "bcp_manual_entry") {
    return { ok: false, error: "El productor todavía no ha confirmado el envío de la muestra." };
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
  return { ok: true };
}

// ── EVA: el veredicto documental (2026-07-17) ───────────────────────────────
// Tras FT/FT2/EUDR/VID (todo gratis), CTC revisa la documentación y declara el
// lote Apto o No Apto. Apto es la puerta de entrada al tramo pagado (postular →
// pagar → sondeo → Arena); resolver el EUDR del lote es PARTE de esta revisión,
// por eso markLotApto exige lotEudrGate listo. Mismo patrón resultado-no-throw
// que confirmSampleReceived.

export async function markLotApto(lotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("stage, name, producer_id, eva_checklist").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "ficha_completa") {
    return { ok: false, error: "Solo un lote con la ficha completa (en evaluación) puede declararse Apto." };
  }
  // La EVA es una checklist explícita (2026-07-18): cada bloque de la Ficha debe
  // quedar marcado como revisado antes del veredicto — la UI deshabilita el botón,
  // pero la regla vive aquí.
  const missing = missingEvaItems(lot.eva_checklist as EvaChecklist);
  if (missing.length) {
    return { ok: false, error: `Faltan bloques por revisar en la checklist EVA: ${missing.join(" · ")}.` };
  }
  const eudr = await lotEudrGate(service, lotId);
  if (!eudr.ready) {
    return { ok: false, error: `La debida diligencia EUDR del lote sigue "${eudr.label}" — resuélvala (finca apta + nivel de riesgo determinado) antes del veredicto.` };
  }

  await service
    .from("lots")
    .update({ stage: "apto", eva_verdict_at: new Date().toISOString(), eva_no_apto_reason: null })
    .eq("id", lotId);
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "eva_apto",
    previous_status: lot.stage,
    new_status: "apto",
    performed_by: adminId,
  });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: "¡Su lote fue declarado APTO tras la evaluación documental! Ya puede postularlo a la Kaffetal Regal Arena desde su panel.",
    created_by: adminId,
  });

  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp");
  return { ok: true };
}

// Marca/desmarca un bloque de la checklist EVA. Merge sobre el jsonb existente
// (no reemplaza el objeto entero) para que dos revisores no se pisen entre sí.
export async function setEvaChecklistItem(
  lotId: string,
  key: string,
  checked: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const service = createServiceRoleClient();

  if (!isEvaChecklistKey(key)) return { ok: false, error: "Bloque de checklist desconocido." };
  const { data: lot } = await service.from("lots").select("stage, eva_checklist").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "ficha_completa") {
    return { ok: false, error: "La checklist EVA solo aplica a un lote en evaluación (ficha completa)." };
  }

  const next = { ...((lot.eva_checklist as EvaChecklist) ?? {}), [key]: checked };
  const { error } = await service.from("lots").update({ eva_checklist: next }).eq("id", lotId);
  if (error) return { ok: false, error: "No se pudo guardar la checklist." };

  revalidatePath("/bcp/lotes");
  return { ok: true };
}

export async function markLotNoApto(lotId: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const cleanReason = reason.trim();
  if (!cleanReason) return { ok: false, error: "Escriba la razón del No Apto — el productor la verá en su panel." };

  const { data: lot } = await service.from("lots").select("stage, name, producer_id").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "ficha_completa" && lot.stage !== "apto") {
    return { ok: false, error: "Solo un lote en evaluación (o Apto sin postular) puede declararse No Apto." };
  }
  if (lot.stage === "apto") {
    // Un Apto ya postulado está en el tramo pagado — no se revierte por aquí.
    const { data: ins } = await service.from("arena_inscriptions").select("id").eq("lot_id", lotId).maybeSingle();
    if (ins) return { ok: false, error: "Este lote ya fue postulado a la Arena — gestione su retiro desde Nominados, no desde el veredicto EVA." };
  }

  await service
    .from("lots")
    .update({ stage: "no_apto", eva_verdict_at: new Date().toISOString(), eva_no_apto_reason: cleanReason })
    .eq("id", lotId);
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "eva_no_apto",
    previous_status: lot.stage,
    new_status: "no_apto",
    performed_by: adminId,
    notes: cleanReason,
  });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `Su lote fue declarado No Apto en la evaluación documental. Motivo: ${cleanReason}. Puede escribirnos por este medio — si se corrige lo señalado, CTC puede reabrir la evaluación.`,
    created_by: adminId,
  });

  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp");
  return { ok: true };
}

export async function revertNoApto(lotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("stage, name, producer_id").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "no_apto") return { ok: false, error: "Este lote no está en No Apto." };

  await service
    .from("lots")
    .update({ stage: "ficha_completa", eva_verdict_at: null, eva_no_apto_reason: null })
    .eq("id", lotId);
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "eva_reopened",
    previous_status: "no_apto",
    new_status: "ficha_completa",
    performed_by: adminId,
  });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: "CTC reabrió la evaluación documental de su lote — está nuevamente en revisión.",
    created_by: adminId,
  });

  revalidatePath("/bcp/lotes");
  revalidatePath("/bcp");
  return { ok: true };
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
const FINCA_EUDR_FIELD_LABEL: Record<string, string> = {
  hectares: "Área cultivada (ha)",
  eudr_lat: "Latitud",
  eudr_lng: "Longitud",
  eudr_planting_date: "Fecha de siembra",
  eudr_production_system: "Sistema productivo",
  eudr_deforestation_free: "Libre de deforestación",
  eudr_legal_production: "Producción legal",
  eudr_evidence_types: "Evidencia disponible",
  eudr_evidence_notes: "Notas de evidencia",
  eudr_legal_areas: "Áreas legales verificadas",
  eudr_tenure: "Tenencia de la tierra",
  eudr_sustainability_tags: "Sostenibilidad",
  eudr_sustainability_notes: "Notas de sostenibilidad",
  eudr_google_earth_url: "URL de Google Earth",
};

function valuesDiffer(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify([...((a as string[]) ?? [])].sort()) !== JSON.stringify([...((b as string[]) ?? [])].sort());
  }
  return (a ?? null) !== (b ?? null);
}

export async function updateFincaEudr(fincaId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: before } = await service
    .from("fincas")
    .select(
      "name, producer_id, hectares, eudr_lat, eudr_lng, eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types, eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_sustainability_tags, eudr_sustainability_notes, eudr_google_earth_url, eudr_evidence_files, eudr_sustainability_files"
    )
    .eq("id", fincaId)
    .single();
  if (!before) throw new Error("Finca no encontrada.");

  const evidenceTypes = formData.getAll("eudr_evidence_types").map(String);
  const sustainabilityTags = formData.getAll("eudr_sustainability_tags").map(String);
  // Rebuild the per-key supporting-file maps: keep only currently-checked keys,
  // record any newly-uploaded attachment, otherwise carry the existing one over.
  const evidenceFiles = collectKeyedAttachments(formData, "evidence", evidenceTypes, (before.eudr_evidence_files as KeyedFiles) ?? {});
  const sustainabilityFiles = collectKeyedAttachments(formData, "sustainability", sustainabilityTags, (before.eudr_sustainability_files as KeyedFiles) ?? {});

  const patch = {
    // Área cultivada (ha): BCP puede completarla/corregirla en nombre del
    // productor -- es requisito para que la finca llegue a "Apta". "" -> null.
    hectares: formData.get("hectares") !== null && String(formData.get("hectares")).trim() !== "" ? Number(formData.get("hectares")) : null,
    eudr_lat: formData.get("eudr_lat") ? Number(formData.get("eudr_lat")) : null,
    eudr_lng: formData.get("eudr_lng") ? Number(formData.get("eudr_lng")) : null,
    eudr_planting_date: textOrNull(formData, "eudr_planting_date"),
    eudr_production_system: textOrNull(formData, "eudr_production_system"),
    eudr_deforestation_free: triState(formData, "eudr_deforestation_free"),
    eudr_legal_production: triState(formData, "eudr_legal_production"),
    eudr_evidence_types: evidenceTypes,
    eudr_evidence_notes: textOrNull(formData, "eudr_evidence_notes"),
    eudr_evidence_files: evidenceFiles,
    eudr_legal_areas: formData.getAll("eudr_legal_areas").map(String),
    eudr_tenure: textOrNull(formData, "eudr_tenure"),
    // eudr_legal_docs_asset_id/filename are NOT set here -- that's the
    // producer's own PDF upload (uploadFincaLegalDoc in KaffetalExperience.tsx),
    // not something BCP fills in on their behalf.
    eudr_sustainability_tags: sustainabilityTags,
    eudr_sustainability_notes: textOrNull(formData, "eudr_sustainability_notes"),
    eudr_sustainability_files: sustainabilityFiles,
    // Placeholder field for a future Google Earth Engine integration -- just
    // stored and linked for now, nothing reads it yet.
    eudr_google_earth_url: textOrNull(formData, "eudr_google_earth_url"),
  };

  const { error } = await service.from("fincas").update(patch).eq("id", fincaId);
  if (error) throw new Error("No se pudo guardar la información EUDR de la finca.");

  const changedFields = Object.keys(patch).filter((key) =>
    valuesDiffer((before as Record<string, unknown>)[key], (patch as Record<string, unknown>)[key])
  );

  await service.from("audit_log").insert({
    entity_type: "finca",
    entity_id: fincaId,
    action: "eudr_updated_by_bcp",
    performed_by: adminId,
    notes: "Campos EUDR completados/editados por BCP en nombre del productor",
  });

  // Auto-log every EUDR edit BCP makes on a producer's behalf so there's
  // always a record of what changed and when -- visible to the producer
  // themselves under "Retroalimentación y ayuda".
  if (changedFields.length > 0) {
    const summary = changedFields.map((k) => FINCA_EUDR_FIELD_LABEL[k] ?? k).join(", ");
    await service.from("producer_comm_log").insert({
      producer_id: before.producer_id,
      context_label: `Finca ${before.name}`,
      finca_id: fincaId,
      note: `CTC actualizó la información EUDR: ${summary}.`,
      created_by: adminId,
    });
  }

  revalidatePath("/bcp/fincas");
  revalidatePath("/bcp/productores");
  revalidatePath("/bcp");
}

// Same "aided by BCP" pattern as updateFincaEudr, for the lot-level custody
// chain / risk assessment / mitigation fields.
export async function updateLotEudr(lotId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  // País lo declara BCP; la clasificación de riesgo se deriva de él. Complejidad,
  // riesgo de producto y esquemas de certificación también son derivados (mismas
  // funciones puras que el pane del productor) y se persisten ya calculados.
  const eudr_country = textOrNull(formData, "eudr_country");
  const eudr_country_risk = countryRiskFor(eudr_country);
  const eudr_custody_stages = formData.getAll("eudr_custody_stages").map(String);
  const eudr_product_risk_factors = formData.getAll("eudr_product_risk_factors").map(String);
  const eudr_illegality_indicators = triState(formData, "eudr_illegality_indicators");
  const eudr_docs_available = triState(formData, "eudr_docs_available");
  const eudr_mitigation_effective = triState(formData, "eudr_mitigation_effective");

  // Cert schemes come from A3/A4 in the lot's datasheet, not from this form.
  const { data: lotRow } = await service.from("lots").select("datasheet, eudr_mitigation_responsible").eq("id", lotId).single();
  const eudr_cert_scheme = deriveCertSchemes(lotRow?.datasheet ?? {}).join(", ") || null;

  // "Nivel de riesgo determinado" is BCP's explicit call (Art. 10-11), aided
  // by the derived suggestion shown in the form -- not auto-written anymore.
  const riskRaw = textOrNull(formData, "eudr_risk_level");
  const eudr_risk_level = riskRaw === "insignificante" || riskRaw === "no_insignificante" ? riskRaw : null;

  // "Responsable": BCP only types the name; the date is stamped here at
  // submission time. If the name didn't change, the original stamp is kept.
  const responsableName = textOrNull(formData, "eudr_mitigation_responsible");
  const prevResponsible = (lotRow?.eudr_mitigation_responsible as string | null) ?? null;
  const prevName = prevResponsible?.split(" · ")[0] ?? null;
  const eudr_mitigation_responsible = !responsableName
    ? null
    : responsableName === prevName
      ? prevResponsible
      : `${responsableName} · ${new Date().toLocaleDateString("es-CO")}`;

  const patch = {
    eudr_custody_stages,
    eudr_custody_method: textOrNull(formData, "eudr_custody_method"),
    eudr_custody_notes: textOrNull(formData, "eudr_custody_notes"),
    eudr_country,
    eudr_country_risk,
    eudr_chain_complexity: deriveChainComplexity(eudr_custody_stages) || null,
    eudr_product_risk: deriveProductRisk(eudr_product_risk_factors),
    eudr_product_risk_factors,
    eudr_illegality_indicators,
    eudr_docs_available,
    eudr_cert_scheme,
    eudr_risk_level,
    // eudr_mitigation_actions is NOT set here: the acciones de mitigación are
    // the producer's declaration (Ficha A5); BCP reads them and rules on
    // effectiveness + risk level.
    eudr_mitigation_effective,
    eudr_mitigation_responsible,
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

  // Revoking also withdraws the certification release: if the finca is later
  // re-approved, sharing must be an explicit decision again, not a leftover.
  await service.from("fincas").update({ status: "rejected", eudr_cert_shared: false }).eq("id", fincaId);
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
