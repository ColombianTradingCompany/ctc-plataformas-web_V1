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

export function computeMesh(data: FichaFormData, remainder: number) {
  const rows = MESH.map(([key, label]) => {
    const grams = num(data[key as keyof FichaFormData] as string);
    const pct = remainder > 0 ? (grams / remainder) * 100 : null;
    return { key, label, grams, pct };
  });
  const sum = rows.reduce((s, r) => s + r.grams, 0);
  const totalPct = remainder > 0 ? (sum / remainder) * 100 : 0;
  const bad = remainder > 0 && Math.abs(totalPct - 100) > 5;
  return { rows, sum, totalPct, bad };
}

export function computeSca(data: FichaFormData) {
  const values = SCA_ATTRS.map(([key]) => Math.min(10, Math.max(0, num(data[`sca_${key}` as keyof FichaFormData] as string))));
  const total = Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;
  const cls: "Especialidad" | "Comercial" | "Sin puntaje" = total >= 80 ? "Especialidad" : total > 0 ? "Comercial" : "Sin puntaje";
  return { values, total, cls };
}

export function varietyTotal(data: FichaFormData) {
  return data.varieties.reduce((s, v) => s + num(v.pct), 0);
}
