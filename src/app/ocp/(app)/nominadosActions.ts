"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { ARENA_FEE_COP, MAX_BATCH_LOTS, avanzarAFilaSiCompleta, dueFor, formatCop, type InscriptionStatus } from "@/lib/arena/inscriptions";
import { claimCampaignCode, insertEntryCode } from "@/lib/arena/entryCodes";
import { generateMejorasDoc } from "@/lib/arena/mejoras";
import { labEvaluationHasData, labEvaluationScaData, labEvaluationScore, toLabEvaluationList, computeFactor, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { currentSeason, lotSeasonCount, MAX_SEASONS_PER_LOT } from "@/lib/arena/seasons";
import { saldoDe } from "@/lib/muestras/particion";
import { anularRecibo } from "@/lib/muestras/recibo";
import { normalizaRueda } from "@/lib/catacion/rueda";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { GRADOS, gradoPorPuntaje, redondeaPuntaje } from "@/lib/grados/definicion";
import { REEVALUACION, TARIFA_EVALUACION_COP } from "@/lib/trato/terminos";

// ── El tramo pagado del lote, lado OCP (era «Nominados»; V5.80 = fase 3 del PLAN_CIRCUITO_DEL_LOTE) ──
// Folio 7 del owner, pasos 7–12. Lo que vive aquí:
//   · la solicitud en nombre del productor y el pago (confirmar sobre la factura, asumir el costo, revertir);
//     la factura, la subvención y el recibo están en `solicitudesActions.ts`;
//   · los BACHES DE EVALUACIÓN: abierto (se arma con lotes de «Lotes a Evaluar», ≤30) → en_centro (se manda al
//     Centro de Calidad con su Q-Grader; ya no hay laboratorio externo, prueba de envío ni «solicitud formal»)
//     → cerrado (todos con veredicto). Hasta la fase 4 (el módulo del socio) el veredicto lo registra CTCx aquí;
//   · el veredicto (el puntaje manda), el cashback del que no supera y las mejoras IA.
// Todas las acciones devuelven resultado — nunca lanzan (lección V12).

type Result = { ok: true } | { ok: false; error: string };

// Las tres vistas del circuito (`nominados/CircuitoVista.tsx`): un lote pasa de una a otra con el pago, la muestra y el bache.
const PATHS = ["/ocp/solicitudes", "/ocp/a-evaluar", "/ocp/en-evaluacion", "/ocp/muestras", "/ocp/kr", "/bcp", "/socios/centro-calidad/panel/evaluacion"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

/** BCP postula en nombre del productor (lotes grandfathered o registrados a mano). */
export async function postularOnBehalf(lotId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
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
    note: `CTC registró la solicitud de evaluación de su lote. Código: ${codeRow.code} · tarifa: ${formatCop(ARENA_FEE_COP)}. CTC corroborará la solicitud y le emitirá la factura de cobro.`,
    created_by: adminId,
  });
  revalidateAll();
  return { ok: true };
}

/** BCP aplica un código de campaña en nombre del productor (solo con pago pendiente). */
export async function applyCodeOnBehalf(lotId: string, rawCode: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
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
 * V5.75 · CTCx ASUME el costo de la evaluación (Ruta Desacoplada, owner 2026-09-23: «CTCx bears the cost of
 * this evaluation»). Hasta aquí la única exención era fingir un código de campaña al 100 %. Esto deja la
 * inscripción «exento» con la razón escrita, y el circuito la lee igual que cualquier `exento`.
 */
export async function asumirEvaluacion(lotId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, status, entry_code, entry_code_id, producer_id, lots(name)")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins) return { ok: false, error: "Postulación no encontrada." };
  if (ins.status !== "pendiente") return { ok: false, error: "Este pago ya está confirmado o exento." };

  const now = new Date().toISOString();
  const { error } = await service
    .from("arena_inscriptions")
    .update({ discount_pct: 100, status: "exento", payment_ref: "Asumida por CTCx", confirmed_by: adminId, confirmed_at: now })
    .eq("id", ins.id);
  if (error) return { ok: false, error: "No se pudo marcar la evaluación como asumida." };
  if (ins.entry_code_id) {
    await service.from("arena_entry_codes").update({ locked_at: now }).eq("id", ins.entry_code_id);
  }

  const lot = (Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as { name: string } | null;
  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "assumed_by_ctcx",
    previous_status: "pendiente",
    new_status: "exento",
    performed_by: adminId,
    notes: `CTCx asume el costo de la evaluación (${formatCop(ARENA_FEE_COP)}) · código ${ins.entry_code ?? "—"}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: ins.producer_id,
    context_label: lot ? `Lote ${lot.name}` : null,
    lot_id: lotId,
    note: "CTCx asumió el costo de la evaluación de su lote: no tiene nada que pagar por ella.",
    created_by: adminId,
  });

  await avanzarAFilaSiCompleta(service, lotId);
  revalidateAll();
  return { ok: true };
}

/**
 * Confirma el pago (o la exención cuando el descuento del código es 100%).
 * Sin input de descuento: el % viene EXCLUSIVAMENTE del código aplicado.
 * Este es el momento en que el código queda bloqueado (locked_at).
 * V5.80 (folio 7, paso 8 → 9): el pago se confirma SOBRE la factura de cobro — sin factura emitida no hay
 * qué conciliar. La única puerta sin factura es «CTCx asume el costo» (`asumirEvaluacion`).
 */
export async function confirmInscriptionPayment(lotId: string, paymentRef?: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, status, discount_pct, entry_code, entry_code_id, producer_id, factura_ref, lots(name)")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins) return { ok: false, error: "Postulación no encontrada." };
  if (ins.status !== "pendiente") return { ok: false, error: "Este pago ya está confirmado." };
  if (!ins.factura_ref) return { ok: false, error: "Emita primero la factura de cobro — el pago se confirma sobre ella." };

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
    notes: `Factura ${ins.factura_ref} · código ${ins.entry_code ?? "—"} · descuento ${pct}% · ${formatCop(dueFor(pct))}${paymentRef ? ` · ref ${paymentRef.trim()}` : ""}`,
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

  await avanzarAFilaSiCompleta(service, lotId);
  revalidateAll();
  return { ok: true };
}

/** Corrección: revierte un pago confirmado mientras la postulación no avanzó. */
export async function unsettleInscription(lotId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
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

// (El recibo de la muestra vive desde la V5.80 en `solicitudesActions.ts` → `src/lib/muestras/recibo.ts`:
//  los kilos reales, la partición del folio 7 y la marca, en una sola acción.)

// ── Baches de Evaluación (V5.80: abierto → en_centro → cerrado) ─────────────

async function auditBatch(service: ReturnType<typeof createServiceRoleClient>, batchId: string, action: string, adminId: string, notes?: string) {
  await service.from("audit_log").insert({ entity_type: "sondeo_batch", entity_id: batchId, action, performed_by: adminId, notes: notes?.slice(0, 300) ?? null });
}

/** Un Bache de Evaluación abierto, al que se le suben lotes de «Lotes a Evaluar». */
export async function createSondeoBatch(formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { ok: false, error: "Escriba el nombre del bache (p. ej. «Bache octubre 2026»)." };
  await service.from("sondeo_batches").insert({ label, created_by: adminId });
  revalidateAll();
  return { ok: true };
}

/** Selección múltiple desde «Lotes a Evaluar»: hasta 30 lotes por bache. Solo entran
 *  lotes pagados y recibidos SIN veredicto previo (un evaluado no vuelve al Centro por esta vía). */
export async function assignLotsToBatch(batchId: string, lotIds: string[]): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
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
    if (!r || r.phase !== "fila") return { ok: false, error: "Solo se suben lotes de «Lotes a Evaluar» (pagados y recibidos)." };
    if (r.sondeo_result) return { ok: false, error: "Un lote con veredicto registrado no vuelve al Centro por esta vía." };
    if (r.sondeo_batch_id) return { ok: false, error: "Un lote seleccionado ya está en otro bache." };
  }
  for (const r of rows) {
    await service.from("arena_inscriptions").update({ sondeo_batch_id: batchId, phase: "sondeo" }).eq("id", r.id);
  }
  revalidateAll();
  return { ok: true };
}

/**
 * Elimina un bache de sondeo y DEVUELVE sus cafés sin veredicto a «En Fila»
 * (phase='fila', sin bache ni planillas), para no dejar datos colgados. Los
 * cafés que ya tuvieran veredicto (arena/retirado) solo pierden el puntero al
 * bache; conservan su resultado. Sirve para limpiar baches de prueba.
 */
export async function deleteSondeoBatch(batchId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const { data: batch } = await service.from("sondeo_batches").select("id, label").eq("id", batchId).maybeSingle();
  if (!batch) return { ok: false, error: "Bache no encontrado." };

  // Sin veredicto todavía (phase='sondeo') ⇒ de vuelta a En Fila, limpio.
  await service
    .from("arena_inscriptions")
    .update({ phase: "fila", sondeo_batch_id: null, sondeo_evaluation: null })
    .eq("sondeo_batch_id", batchId)
    .eq("phase", "sondeo");
  // Cualquier café restante (ya con veredicto) solo suelta el puntero al bache.
  await service.from("arena_inscriptions").update({ sondeo_batch_id: null }).eq("sondeo_batch_id", batchId);

  const { error } = await service.from("sondeo_batches").delete().eq("id", batchId);
  if (error) return { ok: false, error: "No se pudo eliminar el bache." };
  await auditBatch(service, batchId, "batch_deleted", adminId, batch.label);
  revalidateAll();
  return { ok: true };
}

export async function removeFromBatch(lotId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const { data: ins } = await service.from("arena_inscriptions").select("id, sondeo_batch_id").eq("lot_id", lotId).maybeSingle();
  if (!ins?.sondeo_batch_id) return { ok: false, error: "Este lote no está en un bache." };
  const { data: batch } = await service.from("sondeo_batches").select("status").eq("id", ins.sondeo_batch_id).maybeSingle();
  if (batch?.status !== "abierto") return { ok: false, error: "El bache ya quedó cerrado." };
  await service.from("arena_inscriptions").update({ sondeo_batch_id: null, phase: "fila" }).eq("id", ins.id);
  revalidateAll();
  return { ok: true };
}

/** Las credenciales del Centro de Calidad con el módulo Evaluación de Lotes activo (respuesta 5 del owner). */
export async function centrosConEvaluacion(service: ReturnType<typeof createServiceRoleClient>) {
  const { data } = await service
    .from("partner_accounts")
    .select("profile_id, org_name, contact_name")
    .eq("node_type", "centro-calidad")
    .eq("status", "active")
    .contains("modulos", { evaluacion: true });
  return (data as { profile_id: string; org_name: string; contact_name: string | null }[] | null) ?? [];
}

/**
 * «Enviar al Centro de Calidad»: abierto → en_centro (folio 7, paso 10: «los lotes se apilan en Baches de
 * Evaluación que van al Q-Grader»). Sin laboratorio externo, sin prueba de envío, sin solicitud formal. V5.81
 * (respuesta 5 del owner): el bache va a UNA credencial del Centro con Evaluación de Lotes activa —la única, o la
 * elegida— y el Q-Grader es el contacto de esa credencial: nadie lo teclea. Su nombre firma la planilla oficial.
 * Cada lote deja una salida de su muestra de evaluación (`muestra_movimientos`, motivo `a_centro`) y su productor
 * recibe una nota.
 */
export async function enviarAlCentro(batchId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const [{ data: batch }, { data: insRows }, centros] = await Promise.all([
    service.from("sondeo_batches").select("id, status, label").eq("id", batchId).maybeSingle(),
    service.from("arena_inscriptions").select("id, lot_id, producer_id, lots(name)").eq("sondeo_batch_id", batchId).eq("phase", "sondeo"),
    centrosConEvaluacion(service),
  ]);
  if (!batch || batch.status !== "abierto") return { ok: false, error: "Ese bache no está abierto." };
  const lotes = (insRows as { id: string; lot_id: string; producer_id: string; lots: { name: string } | { name: string }[] | null }[] | null) ?? [];
  if (!lotes.length) return { ok: false, error: "El bache está vacío — suba lotes de «Lotes a Evaluar» primero." };
  const centroId = String(formData.get("centro_id") ?? "").trim();
  const centro = centroId ? centros.find((c) => c.profile_id === centroId) : centros.length === 1 ? centros[0] : undefined;
  if (!centro) {
    return {
      ok: false,
      error: centros.length
        ? "Elija la credencial del Centro de Calidad que evaluará el bache."
        : "Ningún Centro de Calidad tiene activo el módulo Evaluación de Lotes — actívelo en BCP · Socios.",
    };
  }
  const qGrader = centro.contact_name?.trim() || centro.org_name;

  const now = new Date().toISOString();
  const { error } = await service
    .from("sondeo_batches")
    .update({ status: "en_centro", shipped_at: now, q_grader_name: qGrader, centro_calidad_account_id: centro.profile_id })
    .eq("id", batchId);
  if (error) return { ok: false, error: "No se pudo enviar el bache: " + error.message };

  // La muestra de evaluación de cada lote sale hacia el Centro (lo que quede de ella).
  const { data: muestras } = await service
    .from("muestras")
    .select("id, lot_id, kg")
    .eq("tipo", "evaluacion")
    .in("lot_id", lotes.map((l) => l.lot_id));
  const ids = ((muestras as { id: string }[] | null) ?? []).map((m) => m.id);
  const { data: salidas } = ids.length ? await service.from("muestra_movimientos").select("muestra_id, kg").in("muestra_id", ids) : { data: [] };
  for (const m of (muestras as { id: string; lot_id: string; kg: number }[] | null) ?? []) {
    const saldo = saldoDe(Number(m.kg), ((salidas as { muestra_id: string; kg: number }[] | null) ?? []).filter((s) => s.muestra_id === m.id));
    if (saldo <= 0) continue;
    await service.from("muestra_movimientos").insert({
      muestra_id: m.id,
      kg: saldo,
      motivo: "a_centro",
      destino: centro.org_name,
      batch_id: batchId,
      por: adminId,
    });
  }

  await auditBatch(service, batchId, "batch_sent_to_centro", adminId, `${batch.label} · ${lotes.length} lote(s) · Q-Grader ${qGrader} · ${centro.org_name}`);
  for (const l of lotes) {
    const lot = (Array.isArray(l.lots) ? l.lots[0] : l.lots) as { name: string } | null;
    await service.from("producer_comm_log").insert({
      producer_id: l.producer_id,
      context_label: lot ? `Lote ${lot.name}` : null,
      lot_id: l.lot_id,
      note: `Su lote entró al Bache de Evaluación «${batch.label}» y está en manos del Q-Grader en el Centro de Calidad. El resultado —puntaje, Grado CTC y feedback— le llegará aquí.`,
      created_by: adminId,
    });
  }
  revalidateAll();
  return { ok: true };
}

/**
 * V5.81 · «Devolver al Centro»: el alta del Q-Grader (pendiente) no convence a CTCx — queda `rejected` con el motivo
 * y el Q-Grader evalúa de nuevo. Registrar ≠ confirmar: aquí se decide, allá se registra.
 */
export async function devolverEvaluacionAlCentro(evaluationId: string, motivo: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const razon = motivo.trim();
  if (!razon) return { ok: false, error: "Escriba por qué se devuelve — el Q-Grader lo leerá." };
  const { data: row } = await service.from("lot_evaluations").select("id, lot_id, status, source, notes").eq("id", evaluationId).maybeSingle();
  if (!row || row.source !== "q_grader_batch" || row.status !== "pending") return { ok: false, error: "Esa alta ya no está pendiente." };
  const { error } = await service
    .from("lot_evaluations")
    .update({ status: "rejected", reviewed_by: adminId, reviewed_at: new Date().toISOString(), notes: [row.notes, `Devuelta por CTC: ${razon}`].filter(Boolean).join(" · ") })
    .eq("id", evaluationId);
  if (error) return { ok: false, error: "No se pudo devolver: " + error.message };
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: row.lot_id, action: "evaluacion_devuelta_al_centro", performed_by: adminId, notes: razon.slice(0, 300) });
  revalidateAll();
  return { ok: true };
}

/** La fila del Centro que CTCx confirma: pasa a `accepted` y es la que RIGE el grado (una sola por lote). */
async function confirmarFilaDelCentro(service: ReturnType<typeof createServiceRoleClient>, evaluationId: string, lotId: string, adminId: string) {
  await service.from("lot_evaluations").update({ rige_grado: false }).eq("lot_id", lotId);
  await service
    .from("lot_evaluations")
    .update({ status: "accepted", reviewed_by: adminId, reviewed_at: new Date().toISOString(), rige_grado: true })
    .eq("id", evaluationId);
}

/** El bache se cierra solo cuando su último lote recibe veredicto; esto lo hace, sin quejarse si falta alguno. */
async function cerrarBacheSiTermino(service: ReturnType<typeof createServiceRoleClient>, batchId: string, adminId: string) {
  const [{ data: batch }, { count }] = await Promise.all([
    service.from("sondeo_batches").select("id, status, label").eq("id", batchId).maybeSingle(),
    service.from("arena_inscriptions").select("id", { count: "exact", head: true }).eq("sondeo_batch_id", batchId).eq("phase", "sondeo"),
  ]);
  if (!batch || batch.status !== "en_centro" || (count ?? 0) > 0) return;
  await service.from("sondeo_batches").update({ status: "cerrado", cerrado_at: new Date().toISOString() }).eq("id", batchId);
  await auditBatch(service, batchId, "batch_closed", adminId, batch.label);
}

/** «Cerrar bache» a mano: solo cuando ya no queda ningún lote sin veredicto. */
export async function cerrarBache(batchId: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const [{ data: batch }, { count }] = await Promise.all([
    service.from("sondeo_batches").select("id, status").eq("id", batchId).maybeSingle(),
    service.from("arena_inscriptions").select("id", { count: "exact", head: true }).eq("sondeo_batch_id", batchId).eq("phase", "sondeo"),
  ]);
  if (!batch || batch.status !== "en_centro") return { ok: false, error: "Ese bache no está en el Centro de Calidad." };
  if ((count ?? 0) > 0) return { ok: false, error: `Quedan ${count} lote(s) sin veredicto en este bache.` };
  await cerrarBacheSiTermino(service, batchId, permiso.userId);
  revalidateAll();
  return { ok: true };
}

/** URL firmada para subir el resultado del laboratorio DE UN LOTE. */
export async function createSondeoLotResultUploadUrl(
  lotId: string,
  filename: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
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
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  if (!labEvaluationHasData(evaluation)) return { ok: false, error: "La planilla está vacía — digite al menos un dato." };
  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, phase, sondeo_batch_id, sondeo_evaluation")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins || ins.phase !== "sondeo" || !ins.sondeo_batch_id) return { ok: false, error: "Este lote no está en un Bache de Evaluación." };
  const { data: batch } = await service.from("sondeo_batches").select("status").eq("id", ins.sondeo_batch_id).maybeSingle();
  if (batch?.status !== "en_centro") return { ok: false, error: "El bache no está en el Centro de Calidad — envíelo primero." };
  const list = [...toLabEvaluationList(ins.sondeo_evaluation), { ...evaluation, registered_at: new Date().toISOString() }];
  const { error } = await service.from("arena_inscriptions").update({ sondeo_evaluation: list }).eq("id", ins.id);
  if (error) return { ok: false, error: "No se pudo guardar la planilla." };
  revalidateAll();
  return { ok: true };
}

/**
 * EL VEREDICTO DE LA EVALUACIÓN — el escritor del grado (V5.17).
 *
 * Desde V5.17 la evaluación por Q-Grader en bache ES el camino del galardón:
 * ya no hay «aprobado ⇒ clasifica a sesión de Arena». Con puntaje suficiente,
 * el lote sale GALARDONADO aquí mismo — el grado se DERIVA del puntaje con
 * `gradoPorPuntaje()` (regla 1 del owner, 2026-08-19: «el puntaje manda»; ver
 * src/lib/grados/definicion.ts) y nadie digita un grado a mano. La planilla
 * queda como `lot_evaluations` con procedencia PROPIA (`q_grader_batch`). (Hasta la
 * V5.76 el galardón repartía además la membresía del Club; el Club se retiró en la V5.77.)
 * Rechazado ⇒ sale del pipeline con cashback del 80% de lo pagado (si pagó) y
 * unas "Recomendaciones de Mejora" generadas por IA (best-effort).
 *
 * DESTINO COMERCIAL (V5.18): el contrato NO nace aquí. Red|blue|gold y
 * tyrian aparecen en las colas de /ocp/ofertas (CTCx emite; el contrato nace
 * cuando el productor ACEPTA — respondToOffer); black abre su negociación
 * (CRM de CTC) cuyo desenlace «comprar» emite la oferta Black.
 */
export async function recordEvaluationVerdict(
  lotId: string,
  resultado: "aprobado" | "rechazado",
  notes: string,
  score?: number,
  extras?: {
    /** Planilla B2/B3 estructurada del laboratorio (mismas interfaces de la Ficha). */
    evaluation?: LabEvaluation;
    /** Archivo del resultado ya subido a Storage vía createSondeoLotResultUploadUrl. */
    resultFile?: { path: string; filename: string };
    /** V5.81: el alta PENDIENTE del Centro de Calidad que se confirma (registrar ≠ confirmar). Con ella no se teclea planilla. */
    centroEvaluationId?: string;
  }
): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const cleanNotes = notes.trim();
  if (!cleanNotes) return { ok: false, error: "Escriba el resultado de la evaluación — el productor lo verá." };

  const { data: ins } = await service
    .from("arena_inscriptions")
    .select("id, phase, status, amount_due_cop, producer_id, sondeo_batch_id, sondeo_evaluation, reevaluaciones, grado_previo, lots(name, stage)")
    .eq("lot_id", lotId)
    .maybeSingle();
  if (!ins || ins.phase !== "sondeo") return { ok: false, error: "Este lote no está en evaluación." };

  // El veredicto solo existe con el bache EN el Centro de Calidad (V5.80): hasta la fase 4 lo registra CTCx
  // aquí; después lo escribirá el Q-Grader con su credencial y esto quedará como «confirmar».
  if (!ins.sondeo_batch_id) return { ok: false, error: "Este lote no está en un Bache de Evaluación." };
  const { data: batch } = await service
    .from("sondeo_batches")
    .select("status, q_grader_name")
    .eq("id", ins.sondeo_batch_id)
    .maybeSingle();
  if (batch?.status !== "en_centro") {
    return { ok: false, error: "El bache no está en el Centro de Calidad — envíelo primero." };
  }

  const lot = (Array.isArray(ins.lots) ? ins.lots[0] : ins.lots) as { name: string; stage: string } | null;

  // V5.81 · el camino del Centro de Calidad: el Q-Grader ya dio de alta el lote (fila `pending`) y CTCx CONFIRMA.
  // Esa fila es la evaluación oficial; no se teclea otra planilla.
  let centroRow: { id: string; sca_total: number | string | null } | null = null;
  if (extras?.centroEvaluationId) {
    const { data: row } = await service
      .from("lot_evaluations")
      .select("id, lot_id, status, source, sca_total")
      .eq("id", extras.centroEvaluationId)
      .maybeSingle();
    if (!row || row.lot_id !== lotId || row.source !== "q_grader_batch" || row.status !== "pending") {
      return { ok: false, error: "Esa alta del Centro ya no está pendiente." };
    }
    centroRow = { id: row.id, sca_total: row.sca_total };
  }

  // Sin alta del Centro (hasta que lo tenga): si el veredicto llega con una planilla nueva, se AÑADE a la lista
  // (un lote puede tener varias). El puntaje = el explícito, o el total de la última planilla registrada.
  const newEval = !centroRow && extras?.evaluation && labEvaluationHasData(extras.evaluation) ? extras.evaluation : null;
  const list = [
    ...toLabEvaluationList(ins.sondeo_evaluation),
    ...(newEval ? [{ ...newEval, registered_at: new Date().toISOString() }] : []),
  ];
  const lastEval = centroRow ? null : list.length ? list[list.length - 1] : null;
  const effectiveScore = centroRow ? Number(centroRow.sca_total) : (score ?? (lastEval ? labEvaluationScore(lastEval) : null));
  const resultCols = {
    sondeo_result_notes: cleanNotes,
    sondeo_score: effectiveScore,
    sondeo_evaluation: list.length ? list : null,
    // El archivo del lote solo se pisa si llegó uno nuevo.
    ...(extras?.resultFile ? { sondeo_result_storage_path: extras.resultFile.path, sondeo_result_filename: extras.resultFile.filename } : {}),
  };

  if (resultado === "aprobado") {
    // ── El galardón nace aquí (V5.17) ────────────────────────────────────
    // El puntaje manda: el grado se deriva, jamás se digita. Sin puntaje no
    // hay galardón; con puntaje bajo el camino honesto es «rechazado».
    if (effectiveScore == null) {
      return { ok: false, error: "Registre una planilla con puntaje SCA (o digite el puntaje) antes de galardonar." };
    }
    const puntaje = redondeaPuntaje(effectiveScore);
    const grado = gradoPorPuntaje(puntaje);
    if (!grado) {
      return { ok: false, error: `Con puntaje ${puntaje} no hay galardón (mínimo 80). Registre el veredicto como «rechazado».` };
    }
    if (!centroRow && !batch.q_grader_name?.trim()) {
      return { ok: false, error: "Defina el Q-Grader del bache (al enviarlo al Centro) — la planilla oficial lleva su nombre." };
    }

    // El alta del Centro se confirma: pasa a accepted y rige el grado.
    if (centroRow) await confirmarFilaDelCentro(service, centroRow.id, lotId, adminId);

    // Sin Centro: la planilla tecleada queda como evaluación OFICIAL del lote, con su
    // procedencia propia — el comprador confía en esa etiqueta.
    if (lastEval) {
      const derived = computeFactor(lastEval);
      const { error: evalError } = await service.from("lot_evaluations").insert({
        lot_id: lotId,
        source: "q_grader_batch",
        status: "accepted",
        sca_total: puntaje,
        sca_data: labEvaluationScaData(lastEval),
        factor_rendimiento: derived.yieldFactor,
        batch_id: ins.sondeo_batch_id,
        escala: lastEval.escala,
        rueda: normalizaRueda(lastEval.rueda),
        uid_anonimo: ctcLotReferenceShort(lotId),
        physical_data: {
          fa_start: lastEval.fa_start,
          fa_green_remainder: lastEval.fa_green_remainder,
          fa_primary_defect: lastEval.fa_primary_defect,
          fa_secondary_defect: lastEval.fa_secondary_defect,
          fa_parch_hum: lastEval.fa_parch_hum,
          mesh_supremo_plus: lastEval.mesh_supremo_plus,
          mesh_supremo: lastEval.mesh_supremo,
          mesh_extra: lastEval.mesh_extra,
          mesh_europa: lastEval.mesh_europa,
          mesh_ugq: lastEval.mesh_ugq,
          mesh_peaberry: lastEval.mesh_peaberry,
          tipo: "q_grader_batch",
        },
        q_grader_reference: batch.q_grader_name.trim(),
        notes: lastEval.analysis_notes || null,
        submitted_by: adminId,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      });
      if (evalError) return { ok: false, error: "No se pudo guardar la evaluación oficial del lote." };
    }

    // El grado y el galardón. El service role salta los guards por diseño.
    await service.from("lots").update({ grade: grado.id, stage: "galardonado" }).eq("id", lotId);
    // V5.82 · folio 12 / respuesta 2: en una RE-EVALUACIÓN que SUBE de grado, CTC reembolsa el 80 % de lo pagado
    // (`cashback_cop` / `cashback_status`, que antes eran el cashback del rechazado). Un exento no pagó: nada que devolver.
    const subio = (ins.reevaluaciones ?? 0) > 0 && (ins.grado_previo == null || GRADOS.findIndex((g) => g.id === grado.id) > GRADOS.findIndex((g) => g.id === ins.grado_previo));
    const reembolso = subio && ins.status === "pagado" ? Math.round((ins.amount_due_cop ?? 0) * (REEVALUACION.reembolsoPctSiSubeGrado / 100)) : null;
    await service
      .from("arena_inscriptions")
      .update({ phase: "galardonado", sondeo_result: "aprobado", ...resultCols, sondeo_score: puntaje, ...(reembolso ? { cashback_cop: reembolso, cashback_status: "pendiente" } : {}) })
      .eq("id", ins.id);
    if (reembolso) {
      await service.from("producer_comm_log").insert({
        producer_id: ins.producer_id,
        context_label: lot ? `Lote ${lot.name}` : null,
        lot_id: lotId,
        note: `Su lote subió de grado en la re-evaluación: CTC le reembolsará el ${REEVALUACION.reembolsoPctSiSubeGrado} % de la tarifa (${formatCop(reembolso)}).`,
        created_by: adminId,
      });
    }
    await service.from("audit_log").insert({
      entity_type: "lot",
      entity_id: lotId,
      action: "graded",
      previous_status: lot?.stage,
      new_status: "galardonado",
      performed_by: adminId,
      notes: `Evaluación CTC por Q-Grader en bache. Puntaje ${puntaje} ⇒ Grado ${grado.nombre} (derivado). ${cleanNotes.slice(0, 220)}`,
    });
    await service.from("producer_comm_log").insert({
      producer_id: ins.producer_id,
      context_label: lot ? `Lote ${lot.name}` : null,
      lot_id: lotId,
      note: `¡Su lote fue GALARDONADO! Puntaje SCA ${puntaje} — Grado CTC ${grado.nombre}. Encontrará los documentos y el resultado completo en «Evaluar mi Café» → Lotes Galardonados.`,
      created_by: adminId,
    });

    // V5.77: el Kaffetal Club como membresía se retiró (PLAN_CIRCUITO_DEL_LOTE §3): el galardón ya no
    // reparte nada; firmar y publicar nacen del trato, no de una membresía.

    // Destino comercial (V5.18): EL CONTRATO YA NO NACE AQUÍ. Red/Blue/Gold
    // aparecen en la cola de /ocp/ofertas (CTCx emite, el productor acepta y
    // AHÍ nace el contrato — respondToOffer); Tyrian aparece en la cola de
    // Subastas de la misma pantalla. Black conserva su CRM: se abre la
    // negociación, y su desenlace «comprar» emite la oferta Black.
    if (grado.id === "black") {
      const { data: neg } = await service.from("black_negotiations").insert({ lot_id: lotId }).select("id").single();
      if (neg) {
        await service.from("audit_log").insert({
          entity_type: "black_negotiation",
          entity_id: neg.id,
          action: "opened",
          new_status: "abierta",
          performed_by: adminId,
        });
      }
    }
  } else {
    // V5.82 · folio 12 / respuesta 2: el rechazo bajo Black es GRATIS para el productor —se lleva el reporte de
    // mejoras— y ya no hay cashback; el 80 % de reembolso existe solo en la re-evaluación que sube de grado.
    await service
      .from("arena_inscriptions")
      .update({ phase: "retirado", sondeo_result: "rechazado", ...resultCols })
      .eq("id", ins.id);
    // El alta del Centro también se confirma cuando el café no supera: la evaluación vale, el lote no pasa.
    if (centroRow) await confirmarFilaDelCentro(service, centroRow.id, lotId, adminId);
    await service.from("audit_log").insert({
      entity_type: "arena_inscription",
      entity_id: lotId,
      action: "sondeo_rechazado",
      new_status: "retirado",
      performed_by: adminId,
      notes: cleanNotes.slice(0, 240),
    });
    await service.from("producer_comm_log").insert({
      producer_id: ins.producer_id,
      context_label: lot ? `Lote ${lot.name}` : null,
      lot_id: lotId,
      note: `Su café no superó la evaluación esta vez. Resultado: ${cleanNotes} En su panel encontrará las Recomendaciones de Mejora, sin costo. Si CTC ve que la mejora aseguraría una oferta, le propondrá una re-evaluación a tarifa plena (${formatCop(TARIFA_EVALUACION_COP)}) con el ${REEVALUACION.reembolsoPctSiSubeGrado} % de reembolso si sube de grado.`,
      created_by: adminId,
    });
    // Best-effort — un fallo de la IA jamás bloquea el registro del resultado.
    await generateMejorasDoc(service, lotId);
  }

  await cerrarBacheSiTermino(service, ins.sondeo_batch_id, adminId);
  revalidateAll();
  return { ok: true };
}

/**
 * V5.82 · RE-EVALUACIÓN (folio 12 / respuesta 2): «a tarifa plena ($200.000), con 80 % de reembolso si sube un grado — y
 * antes CTCx analiza que esa mejora aseguraría la oferta». CTCx la acuerda (con su razón) y la solicitud VUELVE A EMPEZAR
 * sobre la misma fila: tarifa plena sin subvención, código nuevo, sin factura, sin muestra, sin bache. Lo anterior queda
 * en `reevaluacion_previa` y `grado_previo`; las evaluaciones viejas siguen en `lot_evaluations`. Vale para un lote que no
 * superó y para un galardonado que quiere subir; nunca con una oferta abierta o un contrato vivo.
 */
export async function reevaluar(lotId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const acuerdo = String(formData.get("acuerdo") ?? "").trim();
  if (!acuerdo) return { ok: false, error: "Escriba por qué CTCx acuerda la re-evaluación (qué mejora aseguraría la oferta)." };

  const [{ data: ins }, { data: lot }, { data: abierta }, { data: contratoVivo }] = await Promise.all([
    service.from("arena_inscriptions").select("id, phase, status, producer_id, sondeo_result, sondeo_score, reevaluaciones, lots(name)").eq("lot_id", lotId).maybeSingle(),
    service.from("lots").select("id, name, stage, grade").eq("id", lotId).maybeSingle(),
    service.from("lot_offers").select("id").eq("lot_id", lotId).eq("status", "emitida").maybeSingle(),
    service.from("purchase_contracts").select("id").eq("lot_id", lotId).in("status", ["pending_signature", "active", "reconditioning"]).maybeSingle(),
  ]);
  if (!ins || !lot) return { ok: false, error: "Solicitud no encontrada." };
  if (ins.phase !== "retirado" && ins.phase !== "galardonado") return { ok: false, error: "Solo se re-evalúa un lote que no superó o uno ya galardonado." };
  if (abierta) return { ok: false, error: "Este lote tiene una oferta abierta — retírela antes." };
  if (contratoVivo) return { ok: false, error: "Este lote tiene un contrato vivo." };

  let codeRow;
  try {
    codeRow = await insertEntryCode(service, { kind: "lote", prefix: "KRA", discountPct: 0, lotId, assignedTo: ins.producer_id, createdBy: adminId });
    await service.from("arena_entry_codes").update({ redeemed_at: new Date().toISOString() }).eq("id", codeRow.id);
  } catch {
    return { ok: false, error: "No se pudo generar el código de la re-evaluación." };
  }
  const previa = { grado: lot.grade, puntaje: ins.sondeo_score, resultado: ins.sondeo_result, fase: ins.phase, cerrada_at: new Date().toISOString() };
  const { error } = await service
    .from("arena_inscriptions")
    .update({
      phase: "postulacion",
      status: "pendiente",
      amount_cop: TARIFA_EVALUACION_COP,
      discount_pct: 0,
      entry_code: codeRow.code,
      entry_code_id: codeRow.id,
      subvencion_id: null,
      payment_ref: null,
      confirmed_by: null,
      confirmed_at: null,
      factura_ref: null,
      factura_emitida_at: null,
      factura_emitida_by: null,
      sondeo_batch_id: null,
      sondeo_result: null,
      sondeo_result_notes: null,
      sondeo_score: null,
      sondeo_evaluation: null,
      sondeo_result_storage_path: null,
      sondeo_result_filename: null,
      cashback_cop: null,
      cashback_status: null,
      decision_comercial: null,
      decision_comercial_at: null,
      decision_comercial_motivo: null,
      reevaluaciones: (ins.reevaluaciones ?? 0) + 1,
      grado_previo: lot.grade,
      reevaluacion_previa: previa,
      reevaluacion_acuerdo: acuerdo,
    })
    .eq("id", ins.id);
  if (error) return { ok: false, error: "No se pudo abrir la re-evaluación: " + error.message };
  // El lote vuelve a Apto (conserva su grado hasta el veredicto nuevo) y la muestra hay que mandarla otra vez.
  await service.from("lots").update({ stage: "apto" }).eq("id", lotId);
  await anularRecibo(service, lotId, adminId, `Re-evaluación acordada: ${acuerdo}`);

  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "reevaluacion_acordada",
    previous_status: ins.phase,
    new_status: "postulacion",
    performed_by: adminId,
    notes: `${acuerdo.slice(0, 240)} · tarifa ${formatCop(TARIFA_EVALUACION_COP)} · código ${codeRow.code}`,
  });
  await service.from("producer_comm_log").insert({
    producer_id: ins.producer_id,
    context_label: `Lote ${lot.name}`,
    lot_id: lotId,
    note: `CTC acordó re-evaluar su lote a tarifa plena (${formatCop(TARIFA_EVALUACION_COP)}): ${acuerdo} Si sube de grado, le reembolsa el ${REEVALUACION.reembolsoPctSiSubeGrado} %. Recibirá la factura de cobro y deberá enviar una muestra nueva de 2 kg contra entrega.`,
    created_by: adminId,
  });
  revalidateAll();
  revalidatePath("/ocp/ofertas");
  return { ok: true };
}

export async function markCashbackPaid(lotId: string, ref: string): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
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
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const ok = await generateMejorasDoc(service, lotId);
  revalidateAll();
  return ok ? { ok: true } : { ok: false, error: "La generación falló — revise ANTHROPIC_API_KEY o reintente." };
}

// La vitrina de la Arena (la compuerta, invitar y bloquear en sesión) se retiró en la V5.77:
// la Arena es ahora una sesión de segunda apreciación (`src/app/bcp/(app)/arenaActions.ts`) y no toca
// la inscripción ni el estado del lote. Las fases `arena · sesion · competido` quedan en el CHECK sin escritor.
