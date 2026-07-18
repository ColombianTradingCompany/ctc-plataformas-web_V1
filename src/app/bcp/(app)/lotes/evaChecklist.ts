// ── La lista de verificación EVA (2026-07-18) ────────────────────────────────
// La evaluación documental es una checklist explícita: BCP marca cada bloque de
// la Ficha como revisado antes de poder declarar el veredicto. Las claves se
// persisten en lots.eva_checklist (jsonb {clave: true}) y las comparten el
// tablero (/bcp/lotes), la acción setEvaChecklistItem y la compuerta de
// markLotApto — un solo lugar para que servidor y cliente nunca diverjan.
// Módulo plano (sin "use server"/"use client") para poder exportar constantes.

export const EVA_CHECKLIST_ITEMS = [
  { key: "ft", label: "FT · Identidad y Origen" },
  { key: "ft2_certs", label: "FT2 · Certificados (A3/A4)" },
  { key: "ft2_fisico", label: "FT2 · Análisis Físico (B2/B3)" },
  { key: "eudr", label: "EUDR · Debida Diligencia" },
  { key: "video", label: "Video (B4)" },
] as const;

export type EvaChecklistKey = (typeof EVA_CHECKLIST_ITEMS)[number]["key"];

export type EvaChecklist = Partial<Record<EvaChecklistKey, boolean>>;

export function isEvaChecklistKey(k: string): k is EvaChecklistKey {
  return EVA_CHECKLIST_ITEMS.some((i) => i.key === k);
}

export function missingEvaItems(checklist: EvaChecklist | null | undefined): string[] {
  return EVA_CHECKLIST_ITEMS.filter((i) => !checklist?.[i.key]).map((i) => i.label);
}
