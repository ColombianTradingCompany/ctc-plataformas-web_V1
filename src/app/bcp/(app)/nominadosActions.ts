"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { ARENA_FEE_COP, MAX_BATCH_LOTS, dueFor, formatCop, isSettled, type InscriptionStatus } from "@/lib/arena/inscriptions";
import { claimCampaignCode, insertEntryCode } from "@/lib/arena/entryCodes";
import { generateMejorasDoc } from "@/lib/arena/mejoras";
import { labEvaluationHasData, labEvaluationScore, toLabEvaluationList, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { currentSeason, lotSeasonCount, MAX_SEASONS_PER_LOT } from "@/lib/arena/seasons";

// ── Nominados: el tramo pagado de la Arena, lado BCP ────────────────────────
// Rediseño 2026-07-20 (paquete del owner). El tablero de arriba tiene TRES
// columnas de inscripciones: Embotellados (postulado >5 días, pago o muestra
// pendientes) · Recién Nominados (≤5 días, ídem) · En Fila (pagado + muestra
// ⇒ phase='fila': el POOL — de aquí los baches de sondeo toman lotes, y aquí
// vuelven los aprobados con su puntaje, listos para asignarse a sesión).
// Debajo vive el kanban de BACHES DE SONDEO: abierto (Nuevo Sondeo, selección
// ≤30 del pool) → planeado (Cerrar Bache: lab + Solicitud formal) → pendiente
// (Bache Enviado con prueba de recibo) → registro (recibido + pruebas
// entregadas ⇒ B2/B3 por lote, varios por lote, y el veredicto).
// Todas las acciones devuelven resultado — nunca lanzan (lección V12).

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/bcp/nominados", "/bcp/lotes", "/bcp"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

async function requireAdmin() {
  return requireActiveAdmin();
}

/** Avanza postulacion → fila cuando pago Y muestra están confirmados: el lote
 *  entra al pool desde el que se arman los baches de sondeo. */
async function maybeAdvanceToFila(service: ReturnType<typeof createServiceRoleClient>, lotId: string) {
  const [{ data: ins }, { data: lot }] = await Promise.all([
    service.from("arena_inscriptions").select("id, status, phase").eq("lot_id", lotId).maybeSingle(),
    service.from("lots").select("sample_2kg_confirmed_at").eq("id", lotId).maybeSingle(),
  ]);
  if (!ins || ins.phase !== "postulacion") return;
  if (isSettled(ins.status as InscriptionStatus) && lot?.sample_2kg_confirmed_at) {
    await service.from("arena_inscriptions").update({ phase: "fila" }).eq("id", ins.id);
  }
}

/** BCP postula en nombre del productor (lotes grandfathered o registrados a mano). */
export async function postularOnBehalf(lotId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("id, name, stage, producer_id").eq("id", lotId).maybeSingle();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "apto") return { ok: false, error: "Solo un lote Apto puede postularse." };
  const { data: existing } = await service.from("arena_inscriptions").select("id").eq("lot_id", lotId).maybeSingle();
  if (existing) return { ok: false, error: "Este lote ya está postulado." };
  // Regla del owner: un lote participa en máximo 2 temporadas.
  if ((await lotSeasonCount(service, lotId)) >= MAX_SEASONS_PER_LOT) {
    return { ok: false, error: `Este lote ya participó en sus ${MAX_SEASONS_PER_LOT} temporadas permitidas.` };
  }
  const season = await currentSeason(service);

  let codeRow;
  try {
    codeRow = await insertEntryCode(service, { kind: "lote", prefix: "KRA", discountPct: 0, lotId, assignedTo: lot.producer_id, createdBy: adminId });
    await service.from("arena_entry_codes").update({ redeemed_at: new Date().toISOString() }).eq("id", codeRow.id);
  } catch {
    return { ok: false, error: "No se pudo generar el código de inscripción." };
  }

  const { error } = await service.from("arena_inscriptions").insert({
    lot_id: lotId,
    producer_id: lot.producer_id,
    amount_cop: ARENA_FEE_COP,
    discount_pct: 0,
    status: "pendiente",
    phase: "postulacion",
    postulated_by: adminId,
    entry_code: codeRow.code,
    entry_code_id: codeRow.id,
    season_id: season?.id ?? null,
  });
  if (error) return { ok: false, error: "Este lote ya está postulado." };

  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "postulated_on_behalf",
    new_status: "postulacion",
    performed_by: adminId,
    notes: `Código ${codeRow.code}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `CTC postuló su lote a la Kaffetal Regal Arena. Código de inscripción: ${codeRow.code} · valor a pagar: ${formatCop(ARENA_FEE_COP)}. Use el código como referencia del pago.`,
    created_by: adminId,
  });
  revalidateAll();
  return { ok: true };
}

/** BCP aplica un código de campaña en nombre del productor (solo con pago pendiente). */
export async function applyCodeOnBehalf(lotId: string, rawCode: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, status, entry_code_id, producer_id")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins) return { ok: false, error: "Postulación no encontrada." };
  if (ins.status !== "pendiente") return { ok: false, error: "El pago ya fue confirmado — el código quedó bloqueado." };

  const codeRow = await claimCampaignCode(service, rawCode, ins.producer_id, lotId);
  if (!codeRow) return { ok: false, error: "El código no es válido o ya fue usado." };

  if (ins.entry_code_id) {
    await service.from("arena_entry_codes").update({ revoked_at: new Date().toISOString() }).eq("id", ins.entry_code_id);
  }
  await service
    .from("arena_inscriptions")
    .update({ discount_pct: codeRow.discount_pct, entry_code: codeRow.code, entry_code_id: codeRow.id })
    .eq("id", ins.id);
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "code_applied_on_behalf",
    performed_by: adminId,
    notes: `Código ${codeRow.code} · descuento ${codeRow.discount_pct}%`,
  });
  revalidateAll();
  return { ok: true };
}

/**
 * Confirma el pago (o la exención cuando el descuento del código es 100%).
 * Sin input de descuento: el % viene EXCLUSIVAMENTE del código aplicado.
 * Este es el momento en que el código queda bloqueado (locked_at).
 */
export async function confirmInscriptionPayment(lotId: string, paymentRef?: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, status, discount_pct, entry_code, entry_code_id, producer_id, lots(name)")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins) return { ok: false, error: "Postulación no encontrada." };
  if (ins.status !== "pendiente") return { ok: false, error: "Este pago ya está confirmado." };

  const pct = ins.discount_pct;
  const status: InscriptionStatus = pct === 100 ? "exento" : "pagado";
  const now = new Date().toISOString();
  await service
    .from("arena_inscriptions")
    .update({ status, payment_ref: paymentRef?.trim() || null, confirmed_by: adminId, confirmed_at: now })
    .eq("id", ins.id);
  if (ins.entry_code_id) {
    await service.from("arena_entry_codes").update({ locked_at: now }).eq("id", ins.entry_code_id);
  }

  const lot = (Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as { name: string } | null;
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: status === "exento" ? "exempted" : "payment_confirmed",
    previous_status: "pendiente",
    new_status: status,
    performed_by: adminId,
    notes: `Código ${ins.entry_code ?? "—"} · descuento ${pct}% · ${formatCop(dueFor(pct))}${paymentRef ? ` · ref ${paymentRef.trim()}` : ""}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: ins.producer_id,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: lotId,
    note:
      status === "exento"
        ? "Su inscripción de Arena quedó eximida (100%) — su código quedó confirmado."
        : `CTC confirmó el pago de su inscripción de Arena (${formatCop(dueFor(pct))}${pct > 0 ? ` con descuento del ${pct}%` : ""}).`,
    created_by: adminId,
  });

  await maybeAdvanceToFila(service, lotId);
  revalidateAll();
  return { ok: true };
}

/** Corrección: revierte un pago confirmado mientras la postulación no avanzó. */
export async function unsettleInscription(lotId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, phase, entry_code_id, sondeo_batch_id, sondeo_result")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins) return { ok: false, error: "Postulación no encontrada." };
  // Reversible mientras el lote no haya entrado a un bache ni tenga sondeo.
  const revertible = ins.phase === "postulacion" || (ins.phase === "fila" && !ins.sondeo_batch_id && !ins.sondeo_result);
  if (!revertible) {
    return { ok: false, error: "La postulación ya avanzó — no se puede revertir el pago." };
  }
  await service
    .from("arena_inscriptions")
    .update({ status: "pendiente", payment_ref: null, confirmed_by: null, confirmed_at: null, phase: "postulacion" })
    .eq("id", ins.id);
  if (ins.entry_code_id) await service.from("arena_entry_codes").update({ locked_at: null }).eq("id", ins.entry_code_id);
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "reverted_to_pending",
    performed_by: adminId,
  });
  revalidateAll();
  return { ok: true };
}

/** Confirma el recibo físico de la muestra de 2 kg (ya bajo postulación). */
export async function confirmSampleReceivedNom(lotId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: ins } = await service.from("arena_inscriptions").select("id, phase").eq("lot_id", lotId).maybeSingle();
  if (!ins) return { ok: false, error: "Este lote no está postulado — la muestra se recibe dentro de la postulación." };
  if (ins.phase !== "postulacion") return { ok: false, error: "La muestra de esta postulación ya fue procesada." };

  const { data: lot } = await service.from("lots").select("stage, sample_shipped_at, sample_2kg_confirmed_at, source").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.sample_2kg_confirmed_at) return { ok: false, error: "La muestra ya estaba confirmada." };
  if (!lot.sample_shipped_at && lot.source !== "bcp_manual_entry") {
    return { ok: false, error: "El productor todavía no ha confirmado el envío de la muestra." };
  }

  await service.from("lots").update({ sample_2kg_confirmed_at: new Date().toISOString() }).eq("id", lotId);
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "sample_received",
    previous_status: lot.stage,
    new_status: lot.stage, // el stage ya no cambia aquí — fila_arena llega con la sesión
    performed_by: adminId,
  });
  await maybeAdvanceToFila(service, lotId);
  revalidateAll();
  return { ok: true };
}

// ── Baches de Sondeo (ciclo de vida completo, 2026-07-20) ────────────────────

async function auditBatch(service: ReturnType<typeof createServiceRoleClient>, batchId: string, action: string, adminId: string, notes?: string) {
  await service.from("audit_log").insert({ entity_type: "sondeo_batch", entity_id: batchId, action, performed_by: adminId, notes: notes?.slice(0, 300) ?? null });
}

/** Nuevo Sondeo: un bache abierto al que se le seleccionan lotes del pool. */
export async function createSondeoBatch(formData: FormData): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { ok: false, error: "Escriba el nombre del bache (p. ej. «Sondeo agosto 2026»)." };
  await service.from("sondeo_batches").insert({ label, created_by: adminId });
  revalidateAll();
  return { ok: true };
}

/** Selección múltiple desde «En Fila»: hasta 30 lotes por bache. Solo entran
 *  lotes del pool SIN sondeo previo (un aprobado no vuelve al laboratorio). */
export async function assignLotsToBatch(batchId: string, lotIds: string[]): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const ids = [...new Set(lotIds)].filter(Boolean);
  if (!ids.length) return { ok: false, error: "Seleccione al menos un lote." };

  const [{ data: batch }, { count: already }, { data: insRows }] = await Promise.all([
    service.from("sondeo_batches").select("id, status").eq("id", batchId).maybeSingle(),
    service.from("arena_inscriptions").select("id", { count: "exact", head: true }).eq("sondeo_batch_id", batchId),
    service.from("arena_inscriptions").select("id, lot_id, phase, sondeo_result, sondeo_batch_id").in("lot_id", ids),
  ]);
  if (!batch || batch.status !== "abierto") return { ok: false, error: "Ese bache no está abierto." };
  if ((already ?? 0) + ids.length > MAX_BATCH_LOTS) {
    return { ok: false, error: `Un bache admite máximo ${MAX_BATCH_LOTS} lotes (tiene ${already ?? 0}).` };
  }
  const rows = (insRows as { id: string; lot_id: string; phase: string; sondeo_result: string | null; sondeo_batch_id: string | null }[] | null) ?? [];
  for (const id of ids) {
    const r = rows.find((x) => x.lot_id === id);
    if (!r || r.phase !== "fila") return { ok: false, error: "Solo se seleccionan lotes de la columna «En Fila»." };
    if (r.sondeo_result) return { ok: false, error: "Un lote con sondeo registrado no vuelve al laboratorio." };
    if (r.sondeo_batch_id) return { ok: false, error: "Un lote seleccionado ya está en otro bache." };
  }
  for (const r of rows) {
    await service.from("arena_inscriptions").update({ sondeo_batch_id: batchId, phase: "sondeo" }).eq("id", r.id);
  }
  revalidateAll();
  return { ok: true };
}

export async function removeFromBatch(lotId: string): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const { data: ins } = await service.from("arena_inscriptions").select("id, sondeo_batch_id").eq("lot_id", lotId).maybeSingle();
  if (!ins?.sondeo_batch_id) return { ok: false, error: "Este lote no está en un bache." };
  const { data: batch } = await service.from("sondeo_batches").select("status").eq("id", ins.sondeo_batch_id).maybeSingle();
  if (batch?.status !== "abierto") return { ok: false, error: "El bache ya quedó cerrado." };
  await service.from("arena_inscriptions").update({ sondeo_batch_id: null, phase: "fila" }).eq("id", ins.id);
  revalidateAll();
  return { ok: true };
}

/** «Cerrar Bache de sondeo»: abierto → planeado. Ahora se define el laboratorio
 *  y se produce la Solicitud de Bache de muestras (documento formal). */
export async function planSondeoBatch(batchId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const [{ data: batch }, { count }] = await Promise.all([
    service.from("sondeo_batches").select("id, status, label").eq("id", batchId).maybeSingle(),
    service.from("arena_inscriptions").select("id", { count: "exact", head: true }).eq("sondeo_batch_id", batchId),
  ]);
  if (!batch || batch.status !== "abierto") return { ok: false, error: "Ese bache no está abierto." };
  if (!count) return { ok: false, error: "El bache está vacío — seleccione lotes de «En Fila» primero." };
  await service.from("sondeo_batches").update({ status: "planeado" }).eq("id", batchId);
  await auditBatch(service, batchId, "batch_planned", adminId, batch.label);
  revalidateAll();
  return { ok: true };
}

/** Datos del laboratorio que recibirá el bache (editable mientras está planeado). */
export async function setBatchLab(batchId: string, labName: string, labContact: string): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const { data: batch } = await service.from("sondeo_batches").select("id, status").eq("id", batchId).maybeSingle();
  if (!batch || batch.status !== "planeado") return { ok: false, error: "El laboratorio se define con el bache planeado." };
  if (!labName.trim()) return { ok: false, error: "Escriba el nombre del laboratorio." };
  await service.from("sondeo_batches").update({ lab_name: labName.trim(), lab_contact: labContact.trim() || null }).eq("id", batchId);
  revalidateAll();
  return { ok: true };
}

/** URL firmada para la prueba de confirmación de recibo (correo del lab en PDF, etc.). */
export async function createBatchProofUploadUrl(
  batchId: string,
  filename: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const clean = filename.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "confirmacion";
  const path = `sondeo/${batchId}/proof-${Date.now()}-${clean}`;
  const { data, error } = await service.storage.from("kaffetal-media").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida." };
  return { ok: true, path, token: data.token };
}

/** «Bache Enviado»: planeado → pendiente. Exige el lab definido Y la prueba de
 *  confirmación de recibo subida — sin soporte no hay seguimiento. */
export async function markBatchSent(batchId: string, proofPath: string, proofFilename: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: batch } = await service.from("sondeo_batches").select("id, status, label, lab_name").eq("id", batchId).maybeSingle();
  if (!batch || batch.status !== "planeado") return { ok: false, error: "Ese bache no está planeado." };
  if (!batch.lab_name) return { ok: false, error: "Defina primero el laboratorio del bache." };
  if (!proofPath || !proofFilename) return { ok: false, error: "Adjunte la prueba de confirmación de recibo." };
  await service
    .from("sondeo_batches")
    .update({ status: "pendiente", shipped_at: new Date().toISOString(), proof_storage_path: proofPath, proof_filename: proofFilename })
    .eq("id", batchId);
  await auditBatch(service, batchId, "batch_sent", adminId, `${batch.label} · prueba ${proofFilename}`);
  revalidateAll();
  return { ok: true };
}

/** «Bache recibido en Lab» — primera de las dos confirmaciones de pendiente. */
export async function markBatchReceived(batchId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: batch } = await service.from("sondeo_batches").select("id, status").eq("id", batchId).maybeSingle();
  if (!batch || batch.status !== "pendiente") return { ok: false, error: "Ese bache no está pendiente." };
  await service.from("sondeo_batches").update({ received_at: new Date().toISOString() }).eq("id", batchId);
  await auditBatch(service, batchId, "batch_received", adminId);
  revalidateAll();
  return { ok: true };
}

/** «Pruebas entregadas»: pendiente → registro (exige el recibo previo).
 *  A partir de aquí se registran las planillas B2/B3 por lote. */
export async function markBatchDelivered(batchId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: batch } = await service.from("sondeo_batches").select("id, status, received_at").eq("id", batchId).maybeSingle();
  if (!batch || batch.status !== "pendiente") return { ok: false, error: "Ese bache no está pendiente." };
  if (!batch.received_at) return { ok: false, error: "Confirme primero «Bache recibido en Lab»." };
  await service.from("sondeo_batches").update({ status: "registro", delivered_at: new Date().toISOString() }).eq("id", batchId);
  await auditBatch(service, batchId, "batch_delivered", adminId);
  revalidateAll();
  return { ok: true };
}

/** URL firmada para subir el resultado del laboratorio DE UN LOTE. */
export async function createSondeoLotResultUploadUrl(
  lotId: string,
  filename: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const { data: ins } = await service.from("arena_inscriptions").select("id, phase").eq("lot_id", lotId).maybeSingle();
  if (!ins || ins.phase !== "sondeo") return { ok: false, error: "Este lote no está en sondeo." };
  const clean = filename.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "resultado";
  const path = `sondeo/lotes/${lotId}/${Date.now()}-${clean}`;
  const { data, error } = await service.storage.from("kaffetal-media").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida." };
  return { ok: true, path, token: data.token };
}

/** Añade UNA planilla B2/B3 al lote (pueden registrarse varias por lote —
 *  pedido del owner; el jsonb guarda la lista). Sin veredicto todavía. */
export async function addSondeoEvaluation(lotId: string, evaluation: LabEvaluation): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  if (!labEvaluationHasData(evaluation)) return { ok: false, error: "La planilla está vacía — digite al menos un dato." };
  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, phase, sondeo_batch_id, sondeo_evaluation")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins || ins.phase !== "sondeo" || !ins.sondeo_batch_id) return { ok: false, error: "Este lote no está en un bache de sondeo." };
  const { data: batch } = await service.from("sondeo_batches").select("status").eq("id", ins.sondeo_batch_id).maybeSingle();
  if (batch?.status !== "registro") return { ok: false, error: "El bache aún no está en Registro de Sondeo (recibo + pruebas entregadas primero)." };
  const list = [...toLabEvaluationList(ins.sondeo_evaluation), { ...evaluation, registered_at: new Date().toISOString() }];
  const { error } = await service.from("arena_inscriptions").update({ sondeo_evaluation: list }).eq("id", ins.id);
  if (error) return { ok: false, error: "No se pudo guardar la planilla." };
  revalidateAll();
  return { ok: true };
}

/**
 * El veredicto del sondeo por lote. Aprobado ⇒ pasa a la fila. Rechazado ⇒
 * sale del pipeline con cashback del 80% de lo pagado (si pagó) y unas
 * "Recomendaciones de Mejora" generadas por IA (best-effort, reintenteable).
 */
export async function recordSondeoResult(
  lotId: string,
  resultado: "aprobado" | "rechazado",
  notes: string,
  score?: number,
  extras?: {
    /** Planilla B2/B3 estructurada del laboratorio (mismas interfaces de la Ficha). */
    evaluation?: LabEvaluation;
    /** Archivo del resultado ya subido a Storage vía createSondeoLotResultUploadUrl. */
    resultFile?: { path: string; filename: string };
  }
): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const cleanNotes = notes.trim();
  if (!cleanNotes) return { ok: false, error: "Escriba el resultado del sondeo — el productor lo verá." };

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, phase, status, amount_due_cop, producer_id, sondeo_batch_id, sondeo_evaluation, lots(name)")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins || ins.phase !== "sondeo") return { ok: false, error: "Este lote no está en sondeo." };

  // El veredicto solo existe en la fase de REGISTRO del bache: recibido en el
  // laboratorio y con las pruebas entregadas.
  if (!ins.sondeo_batch_id) return { ok: false, error: "Este lote no está en un bache de sondeo." };
  const { data: batch } = await service.from("sondeo_batches").select("status").eq("id", ins.sondeo_batch_id).maybeSingle();
  if (batch?.status !== "registro") {
    return { ok: false, error: "El bache aún no está en Registro de Sondeo — confirme recibo y pruebas entregadas primero." };
  }

  const lot = (Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as { name: string } | null;

  // Si el veredicto llega con una planilla nueva, se AÑADE a la lista (un lote
  // puede tener varias). El puntaje del sondeo = el explícito, o el total SCA
  // de la última planilla registrada.
  const newEval = extras?.evaluation && labEvaluationHasData(extras.evaluation) ? extras.evaluation : null;
  const list = [
    ...toLabEvaluationList(ins.sondeo_evaluation),
    ...(newEval ? [{ ...newEval, registered_at: new Date().toISOString() }] : []),
  ];
  const lastEval = list.length ? list[list.length - 1] : null;
  const effectiveScore = score ?? (lastEval ? labEvaluationScore(lastEval) : null);
  const resultCols = {
    sondeo_result_notes: cleanNotes,
    sondeo_score: effectiveScore,
    sondeo_evaluation: list.length ? list : null,
    // El archivo del lote solo se pisa si llegó uno nuevo.
    ...(extras?.resultFile ? { sondeo_result_storage_path: extras.resultFile.path, sondeo_result_filename: extras.resultFile.filename } : {}),
  };

  if (resultado === "aprobado") {
    // Apto ⇒ el lote SALE de Nominados y entra al módulo Arena (phase='arena'),
    // desde donde se bloquea en una sesión. Ya no vuelve a la fila de sondeo.
    await service
      .from("arena_inscriptions")
      .update({ phase: "arena", sondeo_result: "aprobado", ...resultCols })
      .eq("id", ins.id);
    await service.from("audit_log").insert({
      entity_type: "arena_inscription",
      entity_id: lotId,
      action: "sondeo_aprobado",
      new_status: "arena",
      performed_by: adminId,
      notes: cleanNotes.slice(0, 300),
    });
    await service.from("producer_comm_log").insert({
      producer_id: ins.producer_id,
      context_label: lot ? `Lote ${lot.name}` : null,
      lot_id: lotId,
      note: `¡Su lote superó el sondeo preliminar${effectiveScore != null ? ` (${effectiveScore})` : ""}! Quedó clasificado para la próxima sesión de la Kaffetal Regal Arena.`,
      created_by: adminId,
    });
  } else {
    // Cashback: 80% de lo efectivamente pagado. Un exento no pagó — sin cashback.
    const cashback = ins.status === "pagado" ? Math.round((ins.amount_due_cop ?? 0) * 0.8) : null;
    await service
      .from("arena_inscriptions")
      .update({
        phase: "retirado",
        sondeo_result: "rechazado",
        ...resultCols,
        cashback_cop: cashback,
        cashback_status: cashback ? "pendiente" : null,
      })
      .eq("id", ins.id);
    await service.from("audit_log").insert({
      entity_type: "arena_inscription",
      entity_id: lotId,
      action: "sondeo_rechazado",
      new_status: "retirado",
      performed_by: adminId,
      notes: `${cleanNotes.slice(0, 240)}${cashback ? ` · cashback ${formatCop(cashback)}` : ""}`,
    });
    await service.from("producer_comm_log").insert({
      producer_id: ins.producer_id,
      context_label: lot ? `Lote ${lot.name}` : null,
      lot_id: lotId,
      note: `Su café no superó el sondeo preliminar esta vez. Resultado: ${cleanNotes}${cashback ? ` · CTC le reembolsará el 80% de su inscripción (${formatCop(cashback)}) por Nequi.` : ""} En su panel encontrará las Recomendaciones de Mejora.`,
      created_by: adminId,
    });
    // Best-effort — un fallo de la IA jamás bloquea el registro del resultado.
    await generateMejorasDoc(service, lotId);
  }

  revalidateAll();
  return { ok: true };
}

export async function markCashbackPaid(lotId: string, ref: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, cashback_status, cashback_cop, producer_id")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins || ins.cashback_status !== "pendiente") return { ok: false, error: "No hay cashback pendiente en este lote." };
  await service
    .from("arena_inscriptions")
    .update({ cashback_status: "pagado", cashback_paid_at: new Date().toISOString(), cashback_ref: ref.trim() || null })
    .eq("id", ins.id);
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "cashback_paid",
    performed_by: adminId,
    notes: `${formatCop(ins.cashback_cop ?? 0)}${ref.trim() ? ` · ref ${ref.trim()}` : ""}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: ins.producer_id,
    lot_id: lotId,
    context_label: null,
    note: `CTC envió el reembolso del 80% de su inscripción (${formatCop(ins.cashback_cop ?? 0)}).`,
    created_by: adminId,
  });
  revalidateAll();
  return { ok: true };
}

export async function regenerateMejoras(lotId: string): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const ok = await generateMejorasDoc(service, lotId);
  revalidateAll();
  return ok ? { ok: true } : { ok: false, error: "La generación falló — revise ANTHROPIC_API_KEY o reintente." };
}

/** Bloquea un lote APTO (phase='arena', ya sondeado) en una sesión abierta con
 *  cupo. Se llama desde el módulo Arena, no desde Nominados. Aquí llega fila_arena. */
export async function assignLotToSession(lotId: string, sessionId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const [{ data: ins }, { data: sess }, { count: roster }] = await Promise.all([
    service.from("arena_inscriptions").select("id, phase, producer_id, sondeo_result, lots(name)").eq("lot_id", lotId).maybeSingle(),
    service.from("arena_sessions").select("id, status, capacity, run_state, session_date").eq("id", sessionId).maybeSingle(),
    service.from("arena_session_lots").select("id", { count: "exact", head: true }).eq("arena_session_id", sessionId),
  ]);
  // El orden del proceso es MUE → Sondeo → Arena: solo un lote Apto (sondeo
  // aprobado, ya en el módulo Arena) puede bloquearse en una sesión.
  if (!ins || ins.phase !== "arena") {
    return { ok: false, error: "Este lote no está clasificado para Arena — debe superar antes un bache de sondeo." };
  }
  if (ins.sondeo_result !== "aprobado") {
    return { ok: false, error: "Este lote aún no tiene sondeo aprobado — pasa primero por un bache de sondeo." };
  }
  if (!sess || sess.status === "completed" || sess.run_state) {
    return { ok: false, error: "Esa sesión no está abierta." };
  }
  if ((roster ?? 0) >= sess.capacity) return { ok: false, error: `La sesión ya está llena (${sess.capacity} lotes).` };

  const { error } = await service.from("arena_session_lots").insert({ arena_session_id: sessionId, lot_id: lotId });
  if (error) return { ok: false, error: "El lote ya está en esa sesión." };
  await service.from("arena_inscriptions").update({ phase: "sesion" }).eq("id", ins.id);
  await service.from("lots").update({ stage: "fila_arena" }).eq("id", lotId);

  const lot = (Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as { name: string } | null;
  const fecha = sess.session_date ? new Date(sess.session_date).toLocaleDateString("es-CO") : "por definir";
  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "assigned_to_session",
    new_status: "fila_arena",
    performed_by: adminId,
    notes: `Sesión ${sessionId.slice(0, 8)} · ${fecha}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: ins.producer_id,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: lotId,
    note: `¡Su lote tiene sesión de Arena confirmada! Fecha: ${fecha}.`,
    created_by: adminId,
  });
  revalidatePath("/bcp/arena");
  revalidateAll();
  return { ok: true };
}
