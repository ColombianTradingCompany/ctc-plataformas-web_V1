"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { ARENA_FEE_COP, dueFor, formatCop, isSettled, type InscriptionStatus } from "@/lib/arena/inscriptions";
import { claimCampaignCode, insertEntryCode } from "@/lib/arena/entryCodes";
import { generateMejorasDoc } from "@/lib/arena/mejoras";

// ── Nominados: el tramo pagado de la Arena, lado BCP ────────────────────────
// Columnas del tablero (derivadas): Nuevos Lotes Aptos (stage=apto sin
// inscripción) → Lotes Postulados (phase=postulacion; aquí viven Confirmar
// pago y Confirmar muestra) → Sondeo Preliminar (phase=sondeo) → En Fila
// (phase=fila) → sesión asignada (phase=sesion, sale del tablero).
// Todas las acciones devuelven resultado — nunca lanzan (lección V12).

type Result = { ok: true } | { ok: false; error: string };

const PATHS = ["/bcp/nominados", "/bcp/lotes", "/bcp"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

async function requireAdmin() {
  return requireActiveAdmin();
}

/** Avanza postulacion → sondeo cuando pago Y muestra están confirmados. */
async function maybeAdvanceToSondeo(service: ReturnType<typeof createServiceRoleClient>, lotId: string) {
  const [{ data: ins }, { data: lot }] = await Promise.all([
    service.from("arena_inscriptions").select("id, status, phase").eq("lot_id", lotId).maybeSingle(),
    service.from("lots").select("sample_2kg_confirmed_at").eq("id", lotId).maybeSingle(),
  ]);
  if (!ins || ins.phase !== "postulacion") return;
  if (isSettled(ins.status as InscriptionStatus) && lot?.sample_2kg_confirmed_at) {
    await service.from("arena_inscriptions").update({ phase: "sondeo" }).eq("id", ins.id);
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

  await maybeAdvanceToSondeo(service, lotId);
  revalidateAll();
  return { ok: true };
}

/** Corrección: revierte un pago confirmado mientras la postulación no avanzó. */
export async function unsettleInscription(lotId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: ins } = await service.from("arena_inscriptions").select("id, phase, entry_code_id").eq("lot_id", lotId).maybeSingle();
  if (!ins) return { ok: false, error: "Postulación no encontrada." };
  if (ins.phase !== "postulacion" && ins.phase !== "sondeo") {
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
  await maybeAdvanceToSondeo(service, lotId);
  revalidateAll();
  return { ok: true };
}

// ── Sondeo Preliminar ────────────────────────────────────────────────────────

export async function markSampleOrganized(lotId: string): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const { data: ins } = await service.from("arena_inscriptions").select("id, phase").eq("lot_id", lotId).maybeSingle();
  if (!ins || ins.phase !== "sondeo") return { ok: false, error: "Este lote no está en sondeo." };
  await service.from("arena_inscriptions").update({ sondeo_sample_ready_at: new Date().toISOString() }).eq("id", ins.id);
  revalidateAll();
  return { ok: true };
}

export async function createSondeoBatch(formData: FormData): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const label = String(formData.get("label") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  if (!label) return { ok: false, error: "Escriba el nombre del envío (p. ej. «Sondeo agosto 2026»)." };
  await service.from("sondeo_batches").insert({ label, destination: destination || null, created_by: adminId });
  revalidateAll();
  return { ok: true };
}

export async function assignToBatch(lotId: string, batchId: string): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const [{ data: ins }, { data: batch }] = await Promise.all([
    service.from("arena_inscriptions").select("id, phase, sondeo_sample_ready_at").eq("lot_id", lotId).maybeSingle(),
    service.from("sondeo_batches").select("id, status").eq("id", batchId).maybeSingle(),
  ]);
  if (!ins || ins.phase !== "sondeo") return { ok: false, error: "Este lote no está en sondeo." };
  if (!ins.sondeo_sample_ready_at) return { ok: false, error: "Marque primero la muestra como organizada." };
  if (!batch || batch.status !== "abierto") return { ok: false, error: "Ese envío no está abierto." };
  await service.from("arena_inscriptions").update({ sondeo_batch_id: batchId }).eq("id", ins.id);
  revalidateAll();
  return { ok: true };
}

export async function removeFromBatch(lotId: string): Promise<Result> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const { data: ins } = await service.from("arena_inscriptions").select("id, sondeo_batch_id").eq("lot_id", lotId).maybeSingle();
  if (!ins?.sondeo_batch_id) return { ok: false, error: "Este lote no está en un envío." };
  const { data: batch } = await service.from("sondeo_batches").select("status").eq("id", ins.sondeo_batch_id).maybeSingle();
  if (batch?.status !== "abierto") return { ok: false, error: "El envío ya quedó cerrado." };
  await service.from("arena_inscriptions").update({ sondeo_batch_id: null }).eq("id", ins.id);
  revalidateAll();
  return { ok: true };
}

/** Cierra el sub-set: el envío quedó consolidado rumbo a Fedecafé. */
export async function lockBatch(batchId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: batch } = await service.from("sondeo_batches").select("id, status, label").eq("id", batchId).maybeSingle();
  if (!batch || batch.status !== "abierto") return { ok: false, error: "Ese envío no está abierto." };
  await service.from("sondeo_batches").update({ status: "cerrado", shipped_at: new Date().toISOString() }).eq("id", batchId);
  await service.from("audit_log").insert({
    entity_type: "sondeo_batch",
    entity_id: batchId,
    action: "locked",
    performed_by: adminId,
    notes: batch.label,
  });
  revalidateAll();
  return { ok: true };
}

/** Paso 1 del adjunto de resultados: URL firmada de subida (el archivo nunca pasa por la action). */
export async function createSondeoResultUploadUrl(
  batchId: string,
  filename: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await requireAdmin();
  const service = createServiceRoleClient();
  const clean = filename.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "resultado";
  const path = `sondeo/${batchId}/${Date.now()}-${clean}`;
  const { data, error } = await service.storage.from("kaffetal-media").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida." };
  return { ok: true, path, token: data.token };
}

/** Paso 2: registra el archivo ya subido como el resultado del envío. */
export async function recordBatchResult(batchId: string, path: string, filename: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const { data: batch } = await service.from("sondeo_batches").select("id, status").eq("id", batchId).maybeSingle();
  if (!batch) return { ok: false, error: "Envío no encontrado." };
  await service
    .from("sondeo_batches")
    .update({ status: "resultados", result_storage_path: path, result_filename: filename, result_uploaded_at: new Date().toISOString() })
    .eq("id", batchId);
  await service.from("audit_log").insert({
    entity_type: "sondeo_batch",
    entity_id: batchId,
    action: "results_attached",
    performed_by: adminId,
    notes: filename,
  });
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
  score?: number
): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const cleanNotes = notes.trim();
  if (!cleanNotes) return { ok: false, error: "Escriba el resultado del sondeo — el productor lo verá." };

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, phase, status, amount_due_cop, producer_id, lots(name)")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins || ins.phase !== "sondeo") return { ok: false, error: "Este lote no está en sondeo." };

  const lot = (Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as { name: string } | null;

  if (resultado === "aprobado") {
    await service
      .from("arena_inscriptions")
      .update({ phase: "fila", sondeo_result: "aprobado", sondeo_result_notes: cleanNotes, sondeo_score: score ?? null })
      .eq("id", ins.id);
    await service.from("audit_log").insert({
      entity_type: "arena_inscription",
      entity_id: lotId,
      action: "sondeo_aprobado",
      new_status: "fila",
      performed_by: adminId,
      notes: cleanNotes.slice(0, 300),
    });
    await service.from("producer_comm_log").insert({
      producer_id: ins.producer_id,
      context_label: lot ? `Lote ${lot.name}` : null,
      lot_id: lotId,
      note: `¡Su lote superó el sondeo preliminar${score != null ? ` (${score})` : ""}! Está en fila para la próxima sesión de la Arena.`,
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
        sondeo_result_notes: cleanNotes,
        sondeo_score: score ?? null,
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

/** Asigna un lote en fila a una sesión abierta con cupo. Recién aquí llega fila_arena. */
export async function assignLotToSession(lotId: string, sessionId: string): Promise<Result> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const [{ data: ins }, { data: sess }, { count: roster }] = await Promise.all([
    service.from("arena_inscriptions").select("id, phase, producer_id, lots(name)").eq("lot_id", lotId).maybeSingle(),
    service.from("arena_sessions").select("id, status, capacity, run_state, session_date").eq("id", sessionId).maybeSingle(),
    service.from("arena_session_lots").select("id", { count: "exact", head: true }).eq("arena_session_id", sessionId),
  ]);
  if (!ins || ins.phase !== "fila") return { ok: false, error: "Este lote no está en fila." };
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
