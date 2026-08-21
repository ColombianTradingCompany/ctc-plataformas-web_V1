// ── El set de Fichas Técnicas del lote (V5.23) ──────────────────────────────
// «El Lote no tendrá una sino un SET de Fichas Técnicas, y una se fija como la
// oficial» (owner, 2026-08-21). Cada ficha es un documento compilado sobre la
// tabla `lot_fichas` — nace de una de tres fuentes:
//   · escaneo   — el escáner visual del OCP: la IA lee los soportes B2/B3
//                 (PDFs y fotos de hojas de catación y análisis físicos) y
//                 extrae cuanto dato encaje en el formato de la Ficha.
//   · productor — compilada programáticamente del reporte del productor
//                 (b2_score/escala/notas + los números de B3), sin IA.
//   · ctc       — reservada para fichas armadas a mano por CTCx.
// Escrituras: solo service-role (src/app/ocp/(app)/fichasActions.ts). El
// productor las LEE (RLS lot_fichas_select_own) y las ve listadas en los
// panes B2 y B3 de su Ficha (FichasDelLote).

/** Los diez atributos SCA — mismas claves que los campos sca_* del datasheet
 *  y que `sca_data` de lot_evaluations, para que todo hable el mismo idioma. */
export const ATRIBUTOS_SCA = [
  "fragrance",
  "flavor",
  "aftertaste",
  "acidity",
  "body",
  "balance",
  "uniformity",
  "clean_cup",
  "sweetness",
  "cuppers",
] as const;
export type AtributoSca = (typeof ATRIBUTOS_SCA)[number];

export const ATRIBUTO_LABEL: Record<AtributoSca, string> = {
  fragrance: "Fragancia/Aroma",
  flavor: "Sabor",
  aftertaste: "Sabor Residual",
  acidity: "Acidez",
  body: "Cuerpo",
  balance: "Balance",
  uniformity: "Uniformidad",
  clean_cup: "Taza Limpia",
  sweetness: "Dulzor",
  cuppers: "Puntaje Catador",
};

/** El contenido de una Ficha Técnica — el objetivo de extracción del escáner.
 *  TODO es opcional/anulable: una ficha vale con lo que su fuente dio; lo que
 *  el documento no muestra queda en null, nunca inventado. */
export type FichaTecnicaData = {
  // ── Sensorial (B2 · Perfil de Taza) ──
  puntaje: number | null; // 0–100
  escala: "sca" | "cva" | null;
  atributos: Partial<Record<AtributoSca, number | null>> | null;
  notas_cata: string | null;
  catador: string | null; // quién firmó la hoja (nombre / credencial Q)
  laboratorio: string | null;
  fecha_analisis: string | null; // "YYYY-MM-DD" si el documento la trae
  // ── Físico (B3 · Caracterización) ──
  factor_rendimiento: number | null; // 75–120
  almendra_total_g: number | null; // 150–245 (AT = 205 g − cisco)
  densidad_verde_gl: number | null; // 600–1000
  humedad_pergamino_pct: number | null;
  humedad_verde_pct: number | null;
  actividad_agua: number | null;
  /** Granulometría por malla, si el análisis la trae. */
  mallas: { malla: string; porcentaje: number }[] | null;
  defectos: string | null;
};

export const FICHA_TECNICA_VACIA: FichaTecnicaData = {
  puntaje: null,
  escala: null,
  atributos: null,
  notas_cata: null,
  catador: null,
  laboratorio: null,
  fecha_analisis: null,
  factor_rendimiento: null,
  almendra_total_g: null,
  densidad_verde_gl: null,
  humedad_pergamino_pct: null,
  humedad_verde_pct: null,
  actividad_agua: null,
  mallas: null,
  defectos: null,
};

export type FichaSource = "escaneo" | "productor" | "ctc";

export const FICHA_SOURCE_LABEL: Record<FichaSource, string> = {
  escaneo: "Escaneo de soportes (IA)",
  productor: "Reportado por Productor",
  ctc: "Compilada por CTC",
};

/** Un soporte que alimentó la ficha (referencia a media_assets). */
export type FichaSourceFile = { assetId: string; fileName: string; section: "b2" | "b3" };

/** Una fila de `lot_fichas`, ya tipada para las dos superficies (OCP y KR). */
export type LotFicha = {
  id: string;
  lotId: string;
  source: FichaSource;
  title: string;
  data: FichaTecnicaData;
  sourceFiles: FichaSourceFile[];
  model: string | null;
  confianza: "alta" | "media" | "baja" | null;
  observaciones: string | null;
  isOfficial: boolean;
  createdAt: string;
};

/** Fila cruda → LotFicha. Tolerante: `data` viene de jsonb y puede traer menos
 *  campos que el tipo (fichas viejas tras ampliar el formato). */
export function rowToLotFicha(r: {
  id: string;
  lot_id: string;
  source: string;
  title: string;
  data: unknown;
  source_files: unknown;
  model: string | null;
  confianza: string | null;
  observaciones: string | null;
  is_official: boolean;
  created_at: string;
}): LotFicha {
  const data = { ...FICHA_TECNICA_VACIA, ...((r.data ?? {}) as Partial<FichaTecnicaData>) };
  return {
    id: r.id,
    lotId: r.lot_id,
    source: (["escaneo", "productor", "ctc"].includes(r.source) ? r.source : "ctc") as FichaSource,
    title: r.title,
    data,
    sourceFiles: Array.isArray(r.source_files) ? (r.source_files as FichaSourceFile[]) : [],
    model: r.model,
    confianza: (["alta", "media", "baja"].includes(r.confianza ?? "") ? r.confianza : null) as LotFicha["confianza"],
    observaciones: r.observaciones,
    isOfficial: r.is_official,
    createdAt: r.created_at,
  };
}

/** Orden de presentación: la oficial primero, luego por fecha descendente. */
export function ordenaFichas(fichas: LotFicha[]): LotFicha[] {
  return [...fichas].sort((a, b) => {
    if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
