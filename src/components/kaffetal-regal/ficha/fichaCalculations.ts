import { MESH, SCA_ATTRS, num, type FichaFormData } from "./fichaData";

export function computeFactor(data: FichaFormData) {
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
export function computeMesh(data: FichaFormData, remainder: number) {
  const measured = MESH.filter(([key]) => key !== "mesh_residue").map(([key, label]) => {
    const grams = num(data[key as keyof FichaFormData] as string);
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
  return { rows, sum, totalPct, bad, residueGrams };
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

export function computeSca(data: FichaFormData) {
  const values = SCA_ATTRS.map(([key]) => Math.min(10, Math.max(0, num(data[`sca_${key}` as keyof FichaFormData] as string))));
  const total = Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;
  return { values, total, cls: scaClassFor(total) };
}

export function varietyTotal(data: FichaFormData) {
  return data.varieties.reduce((s, v) => s + num(v.pct), 0);
}
