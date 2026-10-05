// ── V5.151 (owner, 2026-10-05) · el reporte ORIGINAL del Q-Grader, adjunto a una evaluación ─────────────────────────
// «En cada evaluación de Lote, la opción de agregar un archivo adjunto: la referencia original del reporte del Q-Grader
// en su propio formato institucional (opcional, no requerido). También si se registra desde OCP.»
// Reglas puras (las lee el navegador y el servidor): qué archivo vale y cómo se llama su adjunto.

export type ReporteAdjunto = { assetId: string; fileName: string };

export const REPORTE_MAX_MB = 20;
export const REPORTE_MAX_BYTES = REPORTE_MAX_MB * 1024 * 1024;

/** Lo que un laboratorio entrega como reporte: PDF, imagen (foto o escaneo) u hoja de Office. */
export const REPORTE_TIPOS: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const REPORTE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx";
const EXTENSIONES = /\.(pdf|jpe?g|png|webp|heic|docx?|xlsx?)$/i;

/** null si el archivo vale; si no, el motivo (para la pantalla). El tipo se acepta por MIME o por extensión: Windows manda
 *  MIME vacío para algunos .heic/.xlsx. */
export function motivoDeRechazo(meta: { fileName: string; mime: string; size: number }): string | null {
  if (!meta.fileName.trim()) return "El archivo no tiene nombre.";
  if (!(meta.size > 0)) return "El archivo está vacío.";
  if (meta.size > REPORTE_MAX_BYTES) return `El archivo pesa más de ${REPORTE_MAX_MB} MB.`;
  const tipoOk = (meta.mime && REPORTE_TIPOS.includes(meta.mime)) || EXTENSIONES.test(meta.fileName);
  if (!tipoOk) return "Adjunte un PDF, una imagen o un documento de Office (Word/Excel).";
  return null;
}

/** El nombre que se enseña: el del archivo, acotado. */
export function nombreLimpio(fileName: string): string {
  return fileName.replace(/\s+/g, " ").trim().slice(0, 200);
}

/** El adjunto de una fila (evaluación o borrador), o null si no lo tiene. */
export function reporteDeFila(row: { reference_asset_id?: string | null; reference_file_name?: string | null } | null | undefined): ReporteAdjunto | null {
  if (!row?.reference_asset_id) return null;
  return { assetId: row.reference_asset_id, fileName: row.reference_file_name?.trim() || "Reporte del Q-Grader" };
}
