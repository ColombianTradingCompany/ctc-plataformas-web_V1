"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPartnerIdentity } from "@/lib/partners/requirePartner";
import { erroresDePlanilla, labEvaluationHasData, labEvaluationScaData, protocoloDelPunto, puntoDeLaPlanilla, computeFactor, toLabEvaluation, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { rotuloDelPunto } from "@/lib/arena/homologacion";
import { normalizaDetalle, normalizaRueda } from "@/lib/catacion/rueda";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { columnasDeReporte, prepararSubidaDeReporte, registrarReporteSubido, type MetaDeReporte } from "@/lib/evaluaciones/reporte";
import type { ReporteAdjunto } from "@/lib/evaluaciones/reporteReglas";

// ── Centro de Calidad · Evaluación de Lotes (fase 4 del PLAN_CIRCUITO_DEL_LOTE, V5.81) ─────────
// Folio 7, paso 11: el Q-Grader recibe baches, evalúa lote a lote —ANÓNIMOS (solo el código), física y
// sensorialmente, sin «01 Extrínsecos» ni la variedad— y «da de alta cada lote individualmente». Dar de alta =
// insertar una `lot_evaluations` con procedencia `q_grader_batch` en estado `pending`; CTCx la CONFIRMA (o la
// devuelve) en «Lotes en Evaluación» — registrar ≠ confirmar (§3 del plan). El nombre del Q-Grader sale de la
// credencial (respuesta 5 del owner): nadie lo teclea.
//
// La compuerta es la del socio (`getPartnerIdentity("centro-calidad")` + el módulo `evaluacion` activo), no una
// consola: estas acciones no viven en `src/app/<consola>/` y `qa-centro-calidad-check` las vigila.
// Devuelven resultado — nunca lanzan (lección V12).

type Result = { ok: true } | { ok: false; error: string };

const revalidar = () => {
  revalidatePath("/socios/centro-calidad/panel/evaluacion");
  revalidatePath("/ocp/en-evaluacion");
  revalidatePath("/ocp/kr");
};

async function identidadConModulo() {
  const identity = await getPartnerIdentity("centro-calidad");
  if (!identity) return { ok: false as const, error: "Su sesión del Centro de Calidad expiró. Vuelva a iniciar sesión." };
  if (!identity.modulos.evaluacion) return { ok: false as const, error: "El módulo Evaluación de Lotes no está activo para su credencial. Pídalo a CTC." };
  return { ok: true as const, identity };
}

/** El código interno de la muestra en el laboratorio: texto corto, del evaluador (V5.144). */
const codigoLimpio = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim().slice(0, 80) : null);

/** El bache de ESTE lote, si está en manos de esta credencial. Nada más se lee del lote. */
async function bacheEnMisManos(service: ReturnType<typeof createServiceRoleClient>, lotId: string, userId: string): Promise<{ ok: true; batchId: string } | { ok: false; error: string }> {
  const { data: ins } = await service.from("arena_inscriptions").select("id, phase, sondeo_batch_id").eq("lot_id", lotId).maybeSingle();
  if (!ins || ins.phase !== "sondeo" || !ins.sondeo_batch_id) return { ok: false, error: "Este lote no está en un Bache de Evaluación." };
  const { data: batch } = await service.from("sondeo_batches").select("id, status, centro_calidad_account_id").eq("id", ins.sondeo_batch_id).maybeSingle();
  if (!batch || batch.status !== "en_centro" || batch.centro_calidad_account_id !== userId) return { ok: false, error: "Ese bache no está en manos de su Centro." };
  return { ok: true, batchId: batch.id as string };
}

// ── V5.144 (owner, 2026-10-02) · «Guardar y terminar más tarde» ────────────────────────────────────────────────────────
// La planilla a medio llenar se guarda en `evaluacion_borradores` (una por lote y credencial) y se retoma después, en
// este u otro equipo. Un borrador NO es un alta: no tiene puntaje ni estado, CTCx no lo ve y no pide que la planilla esté
// completa. Se borra al dar de alta el lote.
export async function guardarBorrador(lotId: string, raw: LabEvaluation, notas: string, codigoInterno: string, reporte: ReporteAdjunto | null = null): Promise<Result> {
  const auth = await identidadConModulo();
  if (!auth.ok) return auth;
  const service = createServiceRoleClient();
  const bache = await bacheEnMisManos(service, lotId, auth.identity.userId);
  if (!bache.ok) return bache;
  const { error } = await service.from("evaluacion_borradores").upsert(
    {
      lot_id: lotId,
      account_id: auth.identity.userId,
      batch_id: bache.batchId,
      planilla: toLabEvaluation(raw),
      notas: notas.trim().slice(0, 4000) || null,
      codigo_interno: codigoLimpio(codigoInterno),
      ...columnasDeReporte(reporte), // V5.151: el reporte original viaja con el borrador
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lot_id,account_id" }
  );
  if (error) return { ok: false, error: "No se pudo guardar el borrador: " + error.message };
  revalidatePath("/socios/centro-calidad/panel/evaluacion");
  return { ok: true };
}

/** «Dar de alta» un lote: la planilla del Q-Grader queda registrada, pendiente de la confirmación de CTCx. */
export async function registrarEvaluacion(lotId: string, raw: LabEvaluation, notas: string, codigoInterno = "", reporte: ReporteAdjunto | null = null): Promise<Result> {
  const auth = await identidadConModulo();
  if (!auth.ok) return auth;
  const { identity } = auth;
  const service = createServiceRoleClient();

  const ev = toLabEvaluation(raw);
  if (!labEvaluationHasData(ev)) return { ok: false, error: "La planilla está vacía — califique al menos una sección." };
  // V5.92: el PUNTO con su procedencia — nativo SCA 2004 si la planilla lo trae completo; homologado desde CVA si solo hay CVA.
  const punto = puntoDeLaPlanilla(ev);
  if (!punto) return { ok: false, error: "La planilla no está completa: " + erroresDePlanilla(ev).join(" ") };
  const puntaje = punto.bajo;

  // Solo un lote de un bache EN el Centro y asignado a ESTA credencial. Nada más se lee del lote.
  const bache = await bacheEnMisManos(service, lotId, identity.userId);
  if (!bache.ok) return bache;
  const batch = { id: bache.batchId };
  const { count: yaRegistrada } = await service
    .from("lot_evaluations")
    .select("id", { count: "exact", head: true })
    .eq("lot_id", lotId)
    .eq("batch_id", batch.id)
    .eq("source", "q_grader_batch")
    .eq("status", "pending");
  if ((yaRegistrada ?? 0) > 0) return { ok: false, error: "Este lote ya está dado de alta — CTC lo confirma o se lo devuelve." };

  const factor = computeFactor(ev);
  const { error } = await service.from("lot_evaluations").insert({
    lot_id: lotId,
    source: "q_grader_batch",
    status: "pending",
    sca_total: puntaje,
    sca_data: labEvaluationScaData(ev),
    factor_rendimiento: factor.yieldFactor,
    physical_data: {
      tipo: "centro_calidad",
      escala: protocoloDelPunto(ev),
      vista: ev.vista,
      fa_start: ev.fa_start,
      fa_green_remainder: ev.fa_green_remainder,
      fa_primary_defect: ev.fa_primary_defect,
      fa_secondary_defect: ev.fa_secondary_defect,
      fa_parch_hum: ev.fa_parch_hum,
      b3_humedad_verde: ev.b3_humedad_verde, // V5.144: la humedad del verde
      mesh_supremo_plus: ev.mesh_supremo_plus,
      mesh_supremo: ev.mesh_supremo,
      mesh_extra: ev.mesh_extra,
      mesh_europa: ev.mesh_europa,
      mesh_ugq: ev.mesh_ugq,
      mesh_peaberry: ev.mesh_peaberry,
      cupping_profile: ev.cupping_profile,
      analysis_notes: ev.analysis_notes,
      planilla: ev,
    },
    batch_id: batch.id,
    escala: protocoloDelPunto(ev),
    punto,
    cva_total: punto.cvaTotal,
    rueda: normalizaRueda(ev.rueda),
    rueda_detalle: normalizaDetalle(ev.rueda_detalle, normalizaRueda(ev.rueda)), // V5.133: etapa e intensidad por marca
    uid_anonimo: ctcLotReferenceShort(lotId),
    q_grader_reference: identity.contactName?.trim() || identity.orgName,
    notes: notas.trim() || null,
    codigo_interno: codigoLimpio(codigoInterno), // V5.144: el código de la muestra en el laboratorio
    ...columnasDeReporte(reporte), // V5.151: el reporte original del Q-Grader (opcional)
    submitted_by: identity.userId,
  });
  if (error) return { ok: false, error: "No se pudo dar de alta el lote: " + error.message };
  // El borrador cumplió: el alta lo reemplaza.
  await service.from("evaluacion_borradores").delete().eq("lot_id", lotId).eq("account_id", identity.userId);

  await service.from("audit_log").insert({
    entity_type: "lot",
    entity_id: lotId,
    action: "evaluacion_registrada_centro",
    performed_by: identity.userId,
    notes: `Centro de Calidad · ${identity.orgName} · ${rotuloDelPunto(punto)} · bache ${batch.id.slice(0, 8)}`,
  });
  revalidar();
  return { ok: true };
}

/** Deshacer un alta propia mientras CTCx no la haya confirmado. */
export async function anularRegistro(evaluationId: string): Promise<Result> {
  const auth = await identidadConModulo();
  if (!auth.ok) return auth;
  const service = createServiceRoleClient();
  const { data: row } = await service.from("lot_evaluations").select("id, lot_id, status, submitted_by").eq("id", evaluationId).maybeSingle();
  if (!row || row.submitted_by !== auth.identity.userId) return { ok: false, error: "Esa alta no es suya." };
  if (row.status !== "pending") return { ok: false, error: "CTC ya decidió sobre esta alta; no se puede anular." };
  const { error } = await service.from("lot_evaluations").delete().eq("id", evaluationId);
  if (error) return { ok: false, error: "No se pudo anular: " + error.message };
  await service.from("audit_log").insert({ entity_type: "lot", entity_id: row.lot_id, action: "evaluacion_anulada_centro", performed_by: auth.identity.userId });
  revalidar();
  return { ok: true };
}

// ── V5.151 (owner, 2026-10-05) · el reporte original del Q-Grader, adjunto a la planilla (opcional) ───────────────────
// Dos pasos: firmar la subida (el archivo va del navegador a Storage) y, subido, registrarlo. Ambos con la compuerta
// del Centro y el bache en sus manos — nadie firma una subida para un lote ajeno.
export async function prepararReporteQGrader(lotId: string, meta: MetaDeReporte): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const auth = await identidadConModulo();
  if (!auth.ok) return auth;
  const service = createServiceRoleClient();
  const bache = await bacheEnMisManos(service, lotId, auth.identity.userId);
  if (!bache.ok) return bache;
  return prepararSubidaDeReporte(service, lotId, meta);
}

export async function confirmarReporteQGrader(lotId: string, path: string, meta: MetaDeReporte): Promise<{ ok: true; reporte: ReporteAdjunto } | { ok: false; error: string }> {
  const auth = await identidadConModulo();
  if (!auth.ok) return auth;
  const service = createServiceRoleClient();
  const bache = await bacheEnMisManos(service, lotId, auth.identity.userId);
  if (!bache.ok) return bache;
  return registrarReporteSubido(service, { lotId, path, meta, uploadedBy: auth.identity.userId });
}
