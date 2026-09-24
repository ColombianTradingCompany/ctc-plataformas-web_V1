// ── La planilla de evaluación (B2/B3 · SCA o CVA · rueda) ────────────────────
// La estructura con la que se registra una evaluación sensorial y física con las MISMAS interfaces B2 (Perfil
// de Taza) y B3 (Caracterización Física) de la Ficha Técnica. La escriben:
//   · el Q-Grader del Centro de Calidad (V5.81, `panel/evaluacion`) → `lot_evaluations` pendiente;
//   · CTCx en «Lotes en Evaluación» mientras el Centro no la registre (`arena_inscriptions.sondeo_evaluation`);
//   · la Arena, como segunda apreciación (`registrarApreciacion`).
// Los nombres de campo son los de FichaFormData a propósito: la aritmética (computeFactor/computeMesh/computeSca
// en fichaCalculations.ts) se comparte 1:1 y cualquier visor de Ficha entiende el shape sin traducción.
//
// V5.81 (folio 11 del owner: «distinguir SCA y CVA en la información, no solo en un selector»): la planilla lleva su
// ESCALA. Con `escala = "sca"` puntúan los diez atributos de B2 (0–10); con `escala = "cva"` puntúan las siete
// secciones de la evaluación afectiva del CVA (1–9) y el total sale de la fórmula del SCA. Y la RUEDA: los
// descriptores elegidos de la taxonomía única (`src/lib/catacion/rueda.ts`), solo ids.

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import {
  computeFactor,
  computeMesh,
  computeSca,
  scaClassFor,
  type FactorFields,
  type MeshFields,
  type ScaFields,
} from "@/components/kaffetal-regal/ficha/fichaCalculations";
import { normalizaRueda } from "@/lib/catacion/rueda";

export type EscalaSensorial = "sca" | "cva";
export const ESCALA_LABEL: Record<EscalaSensorial, string> = { sca: "SCA · Perfil de taza (0–10)", cva: "CVA · Evaluación afectiva (1–9)" };

/** Las siete secciones de la evaluación afectiva del CVA (SCA, 2023), en el orden del formulario. */
export const CVA_SECCIONES: readonly [key: string, label: string][] = [
  ["fragrance", "Fragancia / Aroma"],
  ["flavor", "Sabor"],
  ["aftertaste", "Sabor residual"],
  ["acidity", "Acidez"],
  ["sweetness", "Dulzor"],
  ["mouthfeel", "Sensación en boca"],
  ["overall", "Impresión general"],
];

export type CvaFields = {
  cva_fragrance: string;
  cva_flavor: string;
  cva_aftertaste: string;
  cva_acidity: string;
  cva_sweetness: string;
  cva_mouthfeel: string;
  cva_overall: string;
  /** Tazas no uniformes (0–5) y tazas defectuosas (0–5): restan. */
  cva_nonuniform: string;
  cva_defective: string;
};

export type LabEvaluation = ScaFields &
  FactorFields &
  MeshFields &
  CvaFields & {
    escala: EscalaSensorial;
    /** Ids de descriptor de la rueda (`src/lib/catacion/rueda.ts`). */
    rueda: string[];
    fa_parch_hum: string;
    cupping_profile: string;
    analysis_notes: string;
  };

export const EMPTY_LAB_EVALUATION: LabEvaluation = {
  escala: "sca",
  sca_fragrance: "", sca_flavor: "", sca_aftertaste: "", sca_acidity: "", sca_body: "",
  sca_balance: "", sca_uniformity: "", sca_clean_cup: "", sca_sweetness: "", sca_cuppers: "",
  cva_fragrance: "", cva_flavor: "", cva_aftertaste: "", cva_acidity: "", cva_sweetness: "", cva_mouthfeel: "", cva_overall: "",
  cva_nonuniform: "", cva_defective: "",
  rueda: [],
  fa_start: "", fa_green_remainder: "", fa_primary_defect: "", fa_secondary_defect: "",
  mesh_supremo_plus: "", mesh_supremo: "", mesh_extra: "", mesh_europa: "",
  mesh_ugq: "", mesh_peaberry: "", mesh_residue: "",
  fa_parch_hum: "", cupping_profile: "", analysis_notes: "",
};

/** Merge seguro sobre el vacío: campos nuevos nunca rompen datos viejos; la escala y la rueda se normalizan. */
export function toLabEvaluation(raw: unknown): LabEvaluation {
  const r = (raw as Partial<LabEvaluation> | null | undefined) ?? {};
  return { ...EMPTY_LAB_EVALUATION, ...r, escala: r.escala === "cva" ? "cva" : "sca", rueda: normalizaRueda(r.rueda) };
}

/**
 * Un lote puede tener VARIAS planillas registradas (pedido del owner 2026-07-20) — el jsonb guarda una LISTA.
 * Este lector acepta los tres estados que existen en datos vivos: null, el objeto suelto de la primera versión
 * (se envuelve en lista) y la lista nueva.
 */
export function toLabEvaluationList(raw: unknown): LabEvaluation[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(toLabEvaluation);
  return [toLabEvaluation(raw)];
}

/** ¿Hay al menos un dato digitado? (para no guardar planillas vacías). La escala es una elección, no un dato. */
export function labEvaluationHasData(ev: LabEvaluation): boolean {
  return Object.entries(ev).some(([k, v]) => {
    if (k === "escala") return false;
    if (k === "rueda") return Array.isArray(v) && v.length > 0;
    return String(v ?? "").trim() !== "";
  });
}

// ── CVA · la evaluación afectiva (SCA, 2023) ──────────────────────────────────
// Cada sección se califica de 1 a 9 y el puntaje sale de la fórmula publicada por el SCA:
//   S = 0,65625 × Σ h_i + 52,75 − 2·u − 4·d
// donde u = tazas no uniformes y d = tazas defectuosas. Con ocho términos de 9 la fórmula da 100 y con ocho de 1
// da 58 (el mínimo del CVA): la «Impresión general» pesa doble en la suma. ⚠️ Si el Q-Grader de la casa usa otra
// convención, se cambia AQUÍ y solo aquí — la pantalla y el guardián la leen de estas constantes.
export const CVA = { coeficiente: 0.65625, base: 52.75, castigoNoUniforme: 2, castigoDefectuosa: 4, pesoImpresionGeneral: 2, min: 1, max: 9 } as const;

const numOr = (v: string | number | null | undefined): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function computeCva(ev: CvaFields) {
  const clamp = (n: number) => Math.min(CVA.max, Math.max(CVA.min, n));
  let suma = 0;
  let calificadas = 0;
  for (const [key] of CVA_SECCIONES) {
    const n = numOr(ev[`cva_${key}` as keyof CvaFields]);
    if (n == null) continue;
    calificadas++;
    suma += clamp(n) * (key === "overall" ? CVA.pesoImpresionGeneral : 1);
  }
  const u = Math.max(0, numOr(ev.cva_nonuniform) ?? 0);
  const dft = Math.max(0, numOr(ev.cva_defective) ?? 0);
  const bruto = calificadas ? CVA.coeficiente * suma + CVA.base - CVA.castigoNoUniforme * u - CVA.castigoDefectuosa * dft : 0;
  const total = Math.round(Math.min(100, Math.max(0, bruto)) * 100) / 100;
  return { suma, calificadas, total, cls: scaClassFor(total) };
}

/** Puntaje total (0–100) de la planilla según su escala, o null si no hay ninguna calificación. */
export function labEvaluationScore(ev: LabEvaluation): number | null {
  if (ev.escala === "cva") {
    const cva = computeCva(ev);
    return cva.calificadas ? cva.total : null;
  }
  const anySca = SCA_ATTRS.some(([key]) => String(ev[`sca_${key}` as keyof ScaFields] ?? "").trim() !== "");
  if (!anySca) return null;
  return computeSca(ev).total;
}

/** Los valores por atributo/sección que se guardan como `sca_data` (números; solo los de la escala usada). */
export function labEvaluationScaData(ev: LabEvaluation): Record<string, number> {
  const out: Record<string, number> = {};
  if (ev.escala === "cva") {
    for (const [key] of CVA_SECCIONES) out[`cva_${key}`] = numOr(ev[`cva_${key}` as keyof CvaFields]) ?? 0;
    out.cva_nonuniform = numOr(ev.cva_nonuniform) ?? 0;
    out.cva_defective = numOr(ev.cva_defective) ?? 0;
    return out;
  }
  for (const [key] of SCA_ATTRS) out[key] = numOr(ev[`sca_${key}` as keyof ScaFields]) ?? 0;
  return out;
}

export { computeFactor, computeMesh, computeSca };
