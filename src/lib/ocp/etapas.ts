// ── Las etiquetas del pasaporte del lote · UNA sola fuente (V5.61) ───────────
// Hasta la V5.60 la etapa de un lote se rotulaba en TRES archivos con tres textos
// distintos para el mismo estado: `ficha_completa` era «En evaluación (EVA)» en
// Productores, «Ficha enviada» en Fincas y «En EVA» en Lotes. Las tres páginas se
// fundieron en `/ocp/kr` y las etiquetas en este módulo — puro, sin dependencias,
// para que lo lean la tabla, las tres secciones del detalle y quien venga después.
//
// ⚠️ `GRADO_LABEL` sigue teniendo seis copias más fuera de aquí (catálogo,
// contratos, la Arena…). No se tocaron en esta tanda —son de otros módulos—, pero
// quien escriba una séptima debería importar ésta.

export const ETAPA_DEL_LOTE: Record<string, string> = {
  borrador: "Borrador",
  ficha_completa: "En evaluación (EVA)",
  videos_ok: "Videos ✓ (legado)",
  muestra_transito: "Muestra en tránsito (legado)",
  apto: "Apto",
  no_apto: "No apto",
  fila_arena: "En sesión de Arena",
  evaluado: "Evaluado",
  galardonado: "Galardonado",
};
export const etapaDelLote = (stage: string | null | undefined): string => (stage ? ETAPA_DEL_LOTE[stage] ?? stage : "—");

export const ESTADO_DE_FINCA: Record<string, string> = {
  pending_review: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};
export const estadoDeFinca = (status: string | null | undefined): string => (status ? ESTADO_DE_FINCA[status] ?? status : "—");

export const GRADO_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };
export const GRADO_HEX: Record<string, string> = { black: "#1A1C1E", red: "#B01F24", blue: "#1F4FB0", gold: "#A87A14", tyrian: "#66023C" };
export const gradoLabel = (grade: string | null | undefined): string | null => (grade ? GRADO_LABEL[grade] ?? grade : null);

/** Los pasos de la Ficha que el productor llena, en orden. `intake_step` dice en cuál va. */
// V5.79: FT · FT2 · FOTO · EUDR — A5 (EUDR) es el último paso del intake (folio 7 del owner); «Video» pasó a «FOTO» en la V5.64.
export const PASOS_DE_LA_FICHA = ["FT", "FT2", "FOTO", "EUDR"] as const;

/** Qué pasos de la Ficha están hechos. Un lote que ya salió de `borrador` los tiene todos. */
export function fichaHecha(stage: string, intakeStep: number): boolean[] {
  if (stage !== "borrador") return PASOS_DE_LA_FICHA.map(() => true);
  return PASOS_DE_LA_FICHA.map((_, i) => intakeStep > i);
}

/** El resultado de la EVA (la evaluación DOCUMENTAL), leído de la etapa. */
export function evaDelLote(stage: string): { label: string; tono: "good" | "bad" | "warn" | "muted" } {
  if (stage === "borrador") return { label: "—", tono: "muted" };
  if (stage === "ficha_completa" || stage === "videos_ok" || stage === "muestra_transito") return { label: "En revisión", tono: "warn" };
  if (stage === "no_apto") return { label: "No apto", tono: "bad" };
  return { label: "Apto", tono: "good" };
}

export const ESTADO_DE_OFERTA: Record<string, string> = {
  emitida: "Emitida",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  retirada: "Retirada",
  expirada: "Expirada",
};
export const ESTADO_DE_CONTRATO: Record<string, string> = {
  pending_signature: "Por firmar",
  active: "Vigente",
  reconditioning: "Reacondicionamiento",
  completed: "Cumplido",
  cancelled: "Cancelado",
};
