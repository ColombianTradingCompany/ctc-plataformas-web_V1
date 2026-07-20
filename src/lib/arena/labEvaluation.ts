// ── Evaluación de laboratorio B2/B3 (BCP) ────────────────────────────────────
// La estructura que BCP registra con las MISMAS interfaces B2 (Perfil de Taza
// SCA) y B3 (Caracterización Física) de la Ficha Técnica, en dos lugares:
//   · el resultado del laboratorio del sondeo preliminar (arena_inscriptions.sondeo_evaluation)
//   · el registro por café de una sesión Agendada (arena_sessions.cup_registrations[lotId])
// Los nombres de campo son los de FichaFormData a propósito: la aritmética
// (computeFactor/computeMesh/computeSca en fichaCalculations.ts) se comparte
// 1:1 y cualquier visor de Ficha entiende el shape sin traducción.

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import {
  computeFactor,
  computeMesh,
  computeSca,
  type FactorFields,
  type MeshFields,
  type ScaFields,
} from "@/components/kaffetal-regal/ficha/fichaCalculations";

export type LabEvaluation = ScaFields &
  FactorFields &
  MeshFields & {
    fa_parch_hum: string;
    cupping_profile: string;
    analysis_notes: string;
  };

export const EMPTY_LAB_EVALUATION: LabEvaluation = {
  sca_fragrance: "", sca_flavor: "", sca_aftertaste: "", sca_acidity: "", sca_body: "",
  sca_balance: "", sca_uniformity: "", sca_clean_cup: "", sca_sweetness: "", sca_cuppers: "",
  fa_start: "", fa_green_remainder: "", fa_primary_defect: "", fa_secondary_defect: "",
  mesh_supremo_plus: "", mesh_supremo: "", mesh_extra: "", mesh_europa: "",
  mesh_ugq: "", mesh_peaberry: "", mesh_residue: "",
  fa_parch_hum: "", cupping_profile: "", analysis_notes: "",
};

/** Merge seguro sobre el vacío: campos nuevos nunca rompen datos viejos. */
export function toLabEvaluation(raw: unknown): LabEvaluation {
  return { ...EMPTY_LAB_EVALUATION, ...((raw as Partial<LabEvaluation> | null | undefined) ?? {}) };
}

/** ¿Hay al menos un dato digitado? (para no guardar planillas vacías) */
export function labEvaluationHasData(ev: LabEvaluation): boolean {
  return Object.values(ev).some((v) => String(v ?? "").trim() !== "");
}

/** Puntaje SCA total de la planilla, o null si no hay ningún atributo. */
export function labEvaluationScore(ev: LabEvaluation): number | null {
  const anySca = SCA_ATTRS.some(([key]) => String(ev[`sca_${key}` as keyof ScaFields] ?? "").trim() !== "");
  if (!anySca) return null;
  return computeSca(ev).total;
}

export { computeFactor, computeMesh, computeSca };
