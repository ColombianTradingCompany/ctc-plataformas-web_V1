// ── PVC · los insumos de mercado que salen de la serie FNC (V5.179 · el agente de la edición siguiente) ─────────────────────────
// PURO. D1 del modelo define cada entrada; aquí se derivan las que dependen SOLO del precio FNC, de la serie diaria que guarda
// `market_anchors` (una lectura por día hábil) y de la serie mensual oficial (`FNC_MENSUAL`, motor.ts):
//   · fnc_corte  — la lectura del día de corte (o la última antes).
//   · fnc_30d    — el promedio de 30 días calendario hasta el corte, con los días sin lectura repitiendo la anterior (D1: «los
//                  fines de semana repiten el viernes»).
//   · fnc_max90  — la lectura más alta de 90 días; fnc_prom180 — el promedio de 180 días, rellenado igual (solo KPIs).
//   · fnc[5]     — cinco promedios MENSUALES, del más viejo al más nuevo: los oficiales cuando existen; si no, el de la serie
//                  diaria rellenada. Con un corte a mitad de mes se toman los cinco meses COMPLETOS anteriores (como la
//                  transición F4-2026: corte el 4-sep → abr–ago); si el corte cae en los últimos días del mes, ese mes cuenta.
// Lo demás (C strip, diferencial, costo, escalamiento, score) NO sale de aquí: lo arrastra el agente y lo marca.

import { sumaDias } from "@/lib/trato/calendario";
import { FNC_MENSUAL } from "./motor";

export type LecturaFnc = { fecha: string; valor: number };
export type FuenteDelMes = "oficial" | "diaria";
export type MesFnc = { mes: string; valor: number; fuente: FuenteDelMes; dias: number };
export type InsumosDeLaFnc = {
  fnc: [number, number, number, number, number];
  fnc_30d: number;
  fnc_corte: number;
  fnc_max90: number;
  fnc_prom180: number;
  meses: MesFnc[];
  /** Cuántos de los 180 días tienen dato (rellenado desde la primera lectura). */
  cobertura180: number;
};

const promedio = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
const ultimoDiaDelMes = (anio: number, mes0: number) => new Date(Date.UTC(anio, mes0 + 1, 0)).toISOString().slice(0, 10);
/** Días antes del fin de mes a partir de los cuales el mes del corte ya cuenta como completo. */
export const MES_DEL_CORTE_CUENTA_DESDE_DIAS = 3;

/** Los valores diarios de [desde, hasta], cada día con la última lectura conocida (los días antes de la primera, fuera). */
export function serieRellenada(lecturas: LecturaFnc[], desde: string, hasta: string): number[] {
  const orden = [...lecturas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const out: number[] = [];
  let i = 0;
  let ultimo: number | null = null;
  while (i < orden.length && orden[i].fecha < desde) ultimo = orden[i++].valor;
  for (let d = desde; d <= hasta; d = sumaDias(d, 1)) {
    while (i < orden.length && orden[i].fecha <= d) ultimo = orden[i++].valor;
    if (ultimo != null) out.push(ultimo);
  }
  return out;
}

/** Los cinco meses que entran en `fnc[5]` para un corte (["2026-06", …, "2026-10"]). */
export function mesesDelCorte(corte: string): string[] {
  const [y, m] = corte.split("-").map(Number);
  const incluyeElDelCorte = corte >= sumaDias(ultimoDiaDelMes(y, m - 1), -MES_DEL_CORTE_CUENTA_DESDE_DIAS);
  const fin = new Date(Date.UTC(y, m - 1 - (incluyeElDelCorte ? 0 : 1), 1));
  return Array.from({ length: 5 }, (_, k) => {
    const d = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - (4 - k), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Los insumos FNC de una edición con corte en `corte`. null si no hay ninguna lectura hasta el corte. */
export function insumosDeLaFnc(lecturas: LecturaFnc[], corte: string, mensual: Record<number, (number | null)[]> = FNC_MENSUAL): InsumosDeLaFnc | null {
  const hasta = lecturas.filter((l) => l.fecha <= corte && Number.isFinite(l.valor) && l.valor > 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!hasta.length) return null;
  const fnc_corte = hasta[hasta.length - 1].valor;
  const v30 = serieRellenada(hasta, sumaDias(corte, -29), corte);
  const r90 = hasta.filter((l) => l.fecha >= sumaDias(corte, -89)).map((l) => l.valor);
  const v180 = serieRellenada(hasta, sumaDias(corte, -179), corte);
  const etiquetas = mesesDelCorte(corte);
  const meses: (MesFnc | null)[] = etiquetas.map((mes) => {
    const [y, m] = mes.split("-").map(Number);
    const oficial = mensual[y]?.[m - 1];
    if (oficial != null) return { mes, valor: oficial, fuente: "oficial", dias: 0 };
    const fin = ultimoDiaDelMes(y, m - 1);
    const dias = serieRellenada(hasta, `${mes}-01`, fin < corte ? fin : corte);
    return dias.length ? { mes, valor: promedio(dias), fuente: "diaria", dias: dias.length } : null;
  });
  // Un mes sin dato toma el más cercano que lo tenga (primero hacia atrás): mejor que un cero en la media ponderada.
  const llenos = meses.map((x, i) => {
    if (x) return x;
    const vecino = meses.slice(0, i).reverse().find(Boolean) ?? meses.slice(i + 1).find(Boolean) ?? null;
    return vecino ? { ...vecino, mes: etiquetas[i], dias: 0 } : null;
  });
  if (llenos.some((x) => x == null)) return null;
  const ms = llenos as MesFnc[];
  return {
    fnc: ms.map((x) => x.valor) as InsumosDeLaFnc["fnc"],
    fnc_30d: promedio(v30),
    fnc_corte,
    fnc_max90: r90.length ? Math.max(...r90) : fnc_corte,
    fnc_prom180: promedio(v180),
    meses: ms,
    cobertura180: v180.length,
  };
}
