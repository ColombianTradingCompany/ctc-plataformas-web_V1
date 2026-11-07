import type { SupabaseClient } from "@supabase/supabase-js";
import { motivoDeRechazo, nombreLimpio, type ReporteAdjunto } from "./reporteReglas";

// ── V5.151 · el reporte original del Q-Grader: Storage + `media_assets`, con service role ──────────────────────────────
// La subida va del navegador DIRECTO a Storage con una URL firmada (`putSignedUrlWithProgress`), como el archivo del
// veredicto del OCP: por una Server Action no pasa (tope de 1 MB en Next, ~4,5 MB en Vercel). El servidor firma (tras la
// compuerta de quien llama) y, subido el archivo, lo registra en `media_assets`, que es lo que `reference_asset_id` apunta.
// Las compuertas NO viven aquí: cada lado (Centro de Calidad, OCP) comprueba lo suyo antes de llamar.

export const BUCKET_REPORTES = "kaffetal-media";

export type MetaDeReporte = { fileName: string; mime: string; size: number };
type Service = SupabaseClient;

const nombreSeguro = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-80) || "reporte";

/** La ruta en Storage del reporte, por CARPETA: el lote (lo que sube el OCP) o la muestra ciega (lo que sube el Centro de
 *  Calidad, `carpetaDeMuestraCiega`). Nunca por productor: la evaluación es a ciegas. */
export function rutaDeReporte(carpeta: string, fileName: string): string {
  return `evaluaciones/${carpeta}/q-grader/${Date.now()}-${nombreSeguro(fileName)}`;
}

/** V6.24 (TAR-149, punto 4): la carpeta de lo que sube el Centro de Calidad lleva el código CIEGO de la muestra, no el id del lote:
 *  la ruta vuelve al navegador del catador para la subida, y en él solo vive el código de la cata. */
export function carpetaDeMuestraCiega(codigoCiego: string): string {
  return `ciego/${codigoCiego}`;
}

/** Firma la subida. Devuelve la ruta y el token para `putSignedUrlWithProgress`. */
export async function prepararSubidaDeReporte(
  service: Service,
  carpeta: string,
  meta: MetaDeReporte
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const motivo = motivoDeRechazo(meta);
  if (motivo) return { ok: false, error: motivo };
  const path = rutaDeReporte(carpeta, meta.fileName);
  const { data, error } = await service.storage.from(BUCKET_REPORTES).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida del reporte." };
  return { ok: true, path, token: data.token };
}

/** Subido el archivo, lo registra en `media_assets`. Comprueba que el objeto exista: nadie registra un adjunto que no subió. */
export async function registrarReporteSubido(
  service: Service,
  args: { carpeta: string; path: string; meta: MetaDeReporte; uploadedBy: string }
): Promise<{ ok: true; reporte: ReporteAdjunto } | { ok: false; error: string }> {
  const motivo = motivoDeRechazo(args.meta);
  if (motivo) return { ok: false, error: motivo };
  const prefijo = `evaluaciones/${args.carpeta}/q-grader/`;
  if (!args.path.startsWith(prefijo) || args.path.includes("..")) return { ok: false, error: "La ruta del reporte no es de esta muestra." };
  const nombre = args.path.slice(prefijo.length);
  const { data: lista, error: listaError } = await service.storage.from(BUCKET_REPORTES).list(prefijo.slice(0, -1), { search: nombre, limit: 5 });
  if (listaError || !lista?.some((o) => o.name === nombre)) return { ok: false, error: "El archivo no llegó a Storage. Vuelva a adjuntarlo." };
  const { data, error } = await service
    .from("media_assets")
    .insert({ bucket: BUCKET_REPORTES, path: args.path, mime_type: args.meta.mime || null, size_bytes: args.meta.size, uploaded_by: args.uploadedBy })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo registrar el reporte." };
  return { ok: true, reporte: { assetId: data.id as string, fileName: nombreLimpio(args.meta.fileName) } };
}

/** Las columnas que un adjunto escribe en `lot_evaluations` / `evaluacion_borradores`. */
export function columnasDeReporte(reporte: ReporteAdjunto | null | undefined): { reference_asset_id: string | null; reference_file_name: string | null } {
  return reporte ? { reference_asset_id: reporte.assetId, reference_file_name: nombreLimpio(reporte.fileName) || null } : { reference_asset_id: null, reference_file_name: null };
}

/** URL firmada (1 h) por asset, para enseñar el reporte. */
export async function urlsDeReportes(service: Service, assetIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const ids = [...new Set(assetIds.filter((id): id is string => !!id))];
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const { data } = await service.from("media_assets").select("id, path").in("id", ids);
  for (const a of (data as { id: string; path: string }[] | null) ?? []) {
    const { data: firmada } = await service.storage.from(BUCKET_REPORTES).createSignedUrl(a.path, 3600);
    if (firmada?.signedUrl) out.set(a.id, firmada.signedUrl);
  }
  return out;
}
