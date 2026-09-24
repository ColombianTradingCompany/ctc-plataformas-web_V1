// ── Las reglas del registro · la parte PURA (V5.78, fase 2 del PLAN_CIRCUITO_DEL_LOTE) ──
// Lo que el owner escribió en el folio 7 (2026-09-24): una certificación declarada y no corroborada
// «deja cualquier certificado declarado pero no corroborado señalado como tal, y un recordatorio debe
// llegar de manera periódica cada semana al productor para recordar que hace falta; después de 4
// recordatorios, cualquier certificación que no sea respaldada se retira del pasaporte, el registro de
// lo que sucedió queda».
//
// Puro a propósito: lo leen el cron (`/api/cron/recordatorios`), las acciones del OCP y el guardián
// `qa-registro-check`, que reproduce esta tabla de verdad desde el folio, no desde este código.

export type EstadoCertificacion = "declarada" | "evidencia_pedida" | "corroborada" | "retirada";

export const ESTADO_CERTIFICACION_LABEL: Record<EstadoCertificacion, string> = {
  declarada: "Declarada · sin corroborar",
  evidencia_pedida: "Evidencia pedida",
  corroborada: "Corroborada por CTCx",
  retirada: "Retirada del Pasaporte",
};

/** Cada cuánto se recuerda. */
export const DIAS_ENTRE_RECORDATORIOS = 7;
/** Cuántos recordatorios antes de retirar. */
export const MAX_RECORDATORIOS = 4;

export type CertificacionParaRecordar = {
  status: EstadoCertificacion;
  evidencia_pedida_at: string | null;
  recordatorios: number;
  ultimo_recordatorio_at: string | null;
};

export type DecisionRecordatorio = "nada" | "recordar" | "retirar";

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Qué toca hoy con una certificación: nada, mandar el recordatorio de la semana, o retirarla.
 *   · Solo cuenta lo que está en `evidencia_pedida`.
 *   · El reloj arranca en `evidencia_pedida_at` y se reinicia con cada recordatorio.
 *   · Pasada una semana: si aún no se llegó a MAX_RECORDATORIOS, se recuerda; si ya se mandaron los
 *     cuatro y pasó otra semana, se retira.
 */
export function decidirRecordatorio(c: CertificacionParaRecordar, ahora: Date): DecisionRecordatorio {
  if (c.status !== "evidencia_pedida") return "nada";
  const desde = c.ultimo_recordatorio_at ?? c.evidencia_pedida_at;
  if (!desde) return "nada";
  const dias = (ahora.getTime() - new Date(desde).getTime()) / MS_DIA;
  if (dias < DIAS_ENTRE_RECORDATORIOS) return "nada";
  return c.recordatorios >= MAX_RECORDATORIOS ? "retirar" : "recordar";
}

/** ¿Una certificación cuenta en el Pasaporte? Solo la corroborada respalda claims; la retirada no existe para el comprador. */
export function respaldaClaims(status: EstadoCertificacion): boolean {
  return status === "corroborada";
}
