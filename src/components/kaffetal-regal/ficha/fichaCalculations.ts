import { MESH, SCA_ATTRS, num, type FichaFormData } from "./fichaData";

// Los cómputos aceptan el SUBCONJUNTO de campos que realmente leen (no la
// Ficha completa): así el editor B2/B3 de BCP (sondeo / registro de Arena)
// reutiliza EXACTAMENTE la misma aritmética sin cargar una FichaFormData.
export type FactorFields = Pick<FichaFormData, "fa_start" | "fa_green_remainder" | "fa_primary_defect" | "fa_secondary_defect">;
export type MeshFields = Pick<
  FichaFormData,
  "mesh_supremo_plus" | "mesh_supremo" | "mesh_extra" | "mesh_europa" | "mesh_ugq" | "mesh_peaberry" | "mesh_residue"
>;
export type ScaFields = Pick<
  FichaFormData,
  | "sca_fragrance" | "sca_flavor" | "sca_aftertaste" | "sca_acidity" | "sca_body"
  | "sca_balance" | "sca_uniformity" | "sca_clean_cup" | "sca_sweetness" | "sca_cuppers"
>;

// ── B3 · Factor de Rendimiento ↔ Almendra Total (owner, 2026-09-20) ─────────
// Son la MISMA medida dicha de dos maneras, sobre la muestra de laboratorio de
// 250 g de pergamino que `fa_start` trae por defecto y que computeFactor() usa
// abajo: la Almendra Total son los gramos de café verde que quedan al quitar el
// cisco, y el Factor es cuántos kilos de pergamino hacen falta para 70 kg de
// verde. De ahí sale una constante y no dos números independientes:
//
//   factor = 70 × 250 / AT   ⇒   factor × AT = 17.500
//
// Por eso el productor reporta UNO de los dos y el otro se DERIVA. Comprobación
// con los rangos declarados en B3: AT 150–245 g ↔ factor 71,4–116,7, que es casi
// exactamente el rango 75–120 del factor. (Con la muestra de 205 g que la copy
// vieja de B3 mencionaba, el rango daba 58,6–95,7 y la almendra máxima de 245 g
// era imposible — la muestra no puede pesar menos que lo que sale de ella.)
//
// ⚠️ Lo derivado NO se persiste (regla de la casa, ALINEACION §1): se calcula al
// leer. Así la Ficha y el OCP siempre distinguen el número que el productor
// declaró del que salió de él.
export const B3_MUESTRA_G = 250;
export const B3_PRODUCTO = 70 * B3_MUESTRA_G; // 17.500

/** Almendra Total (g) implícita en un factor de rendimiento. `null` si no aplica. */
export function almendraDesdeFactor(factor: number | null): number | null {
  if (factor == null || !Number.isFinite(factor) || factor <= 0) return null;
  return Math.round((B3_PRODUCTO / factor) * 10) / 10;
}

/** Factor de rendimiento implícito en una Almendra Total (g). `null` si no aplica. */
export function factorDesdeAlmendra(almendraG: number | null): number | null {
  if (almendraG == null || !Number.isFinite(almendraG) || almendraG <= 0) return null;
  return Math.round((B3_PRODUCTO / almendraG) * 10) / 10;
}

export function computeFactor(data: FactorFields) {
  const start = num(data.fa_start);
  const remainder = num(data.fa_green_remainder);
  const yieldLoss = Math.max(0, start - remainder);
  const primary = num(data.fa_primary_defect);
  const secondary = num(data.fa_secondary_defect);
  const healthy = remainder > 0 ? Math.max(0, remainder - primary - secondary) : 0;
  const yieldFactor = healthy > 0 ? (70 * start) / healthy : null;
  return { start, remainder, yieldLoss, healthy, yieldFactor };
}

// El Residuo no se digita: es el "solucionador de diferencia" que lleva la
// suma de mallas siempre a 100% del grano sano -- lo que no quedó retenido en
// ninguna malla ES el residuo, por definición.
//
// ── El defecto que arregla el `state` de abajo (owner, 2026-08-20) ──────────
// «No creo que esté funcionando bien; tampoco es fácil entender qué debo poner,
// si fue demasiado o no alcanzó.» Tenía razón, y el motivo es aritmético: como
// el Residuo ABSORBE la diferencia, la suma daba 100,0 % SIEMPRE que las mallas
// pesaran menos que el grano sano. Es decir, la única desviación que el aviso
// podía detectar era pasarse; quedarse corto —pesar una malla y olvidar las
// otras cinco— salía como «100,0 %», impecable, con un Residuo del 75 % que
// nadie leía como un error.
// Ahora se distinguen los dos lados: `excede` (la balanza no cuadra) y
// `residuo_alto` (faltan mallas por pesar). Un residuo real —pasilla, polvo,
// fragmentos— rara vez pasa del 5 % del grano sano; se avisa a partir del 15 %
// para no molestar a nadie con una muestra sucia de verdad.
export function computeMesh(data: MeshFields, remainder: number) {
  const measured = MESH.filter(([key]) => key !== "mesh_residue").map(([key, label]) => {
    const grams = num(data[key as keyof MeshFields]);
    const pct = remainder > 0 ? (grams / remainder) * 100 : null;
    return { key, label, grams, pct };
  });
  const measuredSum = measured.reduce((s, r) => s + r.grams, 0);
  const residueGrams = remainder > 0 ? Math.max(0, Math.round((remainder - measuredSum) * 10) / 10) : 0;
  const residueRow = {
    key: "mesh_residue",
    label: MESH.find(([key]) => key === "mesh_residue")![1],
    grams: residueGrams,
    pct: remainder > 0 ? (residueGrams / remainder) * 100 : null,
  };
  const rows = [...measured, residueRow];
  const sum = measuredSum + residueGrams;
  const totalPct = remainder > 0 ? (sum / remainder) * 100 : 0;
  // Solo puede desviarse de 100% si las mallas medidas EXCEDEN el grano sano
  // (el residuo no puede ser negativo) -- eso sí es un error de pesaje.
  const bad = remainder > 0 && Math.abs(totalPct - 100) > 5;

  // Lo que todavía no se ha repartido en ninguna malla. Positivo = falta por
  // pesar; negativo = las mallas pesan MÁS que el grano sano.
  const pendingGrams = remainder > 0 ? Math.round((remainder - measuredSum) * 10) / 10 : 0;
  const residuePct = remainder > 0 ? (residueGrams / remainder) * 100 : 0;
  const state: "sin_base" | "vacio" | "excede" | "residuo_alto" | "ok" =
    remainder <= 0
      ? "sin_base" // aún no hay Grano Sano contra el que medir nada
      : measuredSum <= 0
        ? "vacio"
        : measuredSum > remainder
          ? "excede"
          : residuePct > 15
            ? "residuo_alto"
            : "ok";
  return { rows, sum, totalPct, bad, residueGrams, pendingGrams, residuePct, measuredSum, state };
}

// Bandas de clasificación por puntaje SCA total. "Especial" y superiores son
// las franjas de los 80+; Rareza es territorio de subasta (90+).
export type ScaClass = "Sin puntaje" | "Comercial" | "Especial" | "Especialidad" | "Alta Especialidad" | "Rareza";

export function scaClassFor(total: number): ScaClass {
  if (total <= 0) return "Sin puntaje";
  if (total < 80) return "Comercial";
  if (total < 84) return "Especial";
  if (total < 87) return "Especialidad";
  if (total < 90) return "Alta Especialidad";
  return "Rareza";
}

export function computeSca(data: ScaFields) {
  const values = SCA_ATTRS.map(([key]) => Math.min(10, Math.max(0, num(data[`sca_${key}` as keyof ScaFields]))));
  const total = Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;
  return { values, total, cls: scaClassFor(total) };
}

export function varietyTotal(data: FichaFormData) {
  return data.varieties.reduce((s, v) => s + num(v.pct), 0);
}
