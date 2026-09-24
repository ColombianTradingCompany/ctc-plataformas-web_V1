// ── Qué material tiene un lote para su Ficha Técnica (V5.78) ─────────────────
// Puro. Lo leen `/ocp/fichas` (el índice) y la vista completa del lote (`LoteSeccion`), donde desde
// la fase 2 del plan se transcribe FT2: los soportes que el productor adjuntó en B2/B3, si reportó
// algo compilable, y el set de fichas que resulta.
import type { FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";

export type SoporteRef = { assetId: string; fileName: string; section: "b2" | "b3"; kind: "pdf" | "foto" };

export function soportesDe(ds: Partial<FichaFormData> | null): SoporteRef[] {
  if (!ds) return [];
  const out: SoporteRef[] = [];
  const add = (files: { assetId: string; fileName: string }[] | undefined, section: "b2" | "b3", kind: "pdf" | "foto") => {
    for (const f of files ?? []) if (f?.assetId) out.push({ ...f, section, kind });
  };
  add(ds.b2_files_pdf, "b2", "pdf");
  add(ds.b2_files_foto, "b2", "foto");
  add(ds.b3_files_pdf, "b3", "pdf");
  add(ds.b3_files_foto, "b3", "foto");
  return out;
}

/** ¿El productor reportó algo compilable en B2/B3? (para habilitar «Compilar del reporte» sin un viaje al servidor). */
export function tieneReporte(ds: Partial<FichaFormData> | null): boolean {
  if (!ds) return false;
  const campos = [ds.b2_score, ds.cupping_profile, ds.yield_factor_producer, ds.b3_almendra_total, ds.b3_densidad_verde, ds.fa_parch_hum, ds.b3_humedad_verde];
  return campos.some((v) => typeof v === "string" && v.trim() !== "");
}
