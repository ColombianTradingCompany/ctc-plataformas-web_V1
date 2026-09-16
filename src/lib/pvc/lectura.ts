// ── PVC · la lectura de mercado ──────────────────────────────────────────────
// Las tres cifras que traducen una edición publicada a «qué significa esto hoy»
// (docs/PVC_BCP_PLAN.md §11.5). PURO y sin `server-only` a propósito, como
// `motor.ts`: lo importan la página del BCP y el guardián `qa-pvc-lectura.mjs`.
//
// El PVC se fija por tres meses y se publica 7–8 semanas antes de su fecha
// efectiva; el mercado sigue moviéndose durante todo ese tiempo. Estas tres
// cifras son la distancia entre lo que se fijó y lo que el mercado hace hoy —
// NO recalculan el precio (§10.3.1: el ciclo lee, no publica).

import type { Banda5 } from "./motor";

/** La carga colombiana de café pergamino seco. Es la unidad del origen. */
export const CARGA_KG_CPS = 125;

/** Un saco de pergamino (70 kg). Es la referencia de «menos de una carga» que admiten Gold y Tyrian
 *  según disponibilidad real (plan §12.6). No es un mínimo fijo: es hasta dónde se ha bajado. */
export const SACO_KG_CPS = 70;

// ── Empaque (addendum del owner, 2026-09-16) ────────────────────────────────
// Dos estándares, no cinco: lo que cambia con el grado es el formato, no el
// número de estimados de costo. El costo de cada estándar entra como UN
// parámetro del modelo (hoy `params.proc`, un estimado del D2 §13.1; el plan
// §11.5 lo manda traer del Cotizador de Empaque del ECP).

export type EstandarEmpaque = {
  id: "vacio" | "grainpro";
  nombre: string;
  /** Los formatos que admite, en kg de verde. Un solo costo para todos. */
  formatosKg: number[];
  grados: Banda5[];
};

export const EMPAQUES: EstandarEmpaque[] = [
  {
    id: "vacio",
    nombre: "Vacío",
    // Tres formatos, UN estimado de costo (así lo pidió el owner): el vacío se
    // cotiza por el estándar, no por el tamaño de la bolsa.
    formatosKg: [3, 6, 12],
    grados: ["Blue", "Gold", "Tyrian"],
  },
  {
    id: "grainpro",
    nombre: "GrainPro-type + yute",
    formatosKg: [35],
    grados: ["Black", "Red"],
  },
];

export const empaqueDe = (b: Banda5): EstandarEmpaque =>
  EMPAQUES.find((e) => e.grados.includes(b)) ?? EMPAQUES[0];

// ── MOQ por grado (addendum del owner, 2026-09-16) ──────────────────────────
// Black y Red son MEZCLAS. Su mínimo no sale de un kilaje sino de cuántos lotes
// componen la mezcla, porque cada lote tiene que aportar al menos una carga y la
// mezcla no baja de tres. Una mezcla de cinco no existe: con seis lotes se hacen
// dos mezclas de tres.
//
//   2 lotes → 4 cargas (2 de cada uno)
//   3 lotes → 3 cargas (1 de cada uno)
//   4 lotes → 4 cargas (1 de cada uno)
//
// Blue, Gold y Tyrian son lote único: el mínimo es del lote, no de la mezcla.
//
// FUNDAMENTO (CEO, 2026-09-16, plan §12.6): el MOQ sale de la cantidad de café que
// se puede comprar y procesar de forma significativa e INDIVIDUAL en Colombia. Por
// eso se dice en cargas y no en kilos de empaque, y por eso vale igual para
// Cherry Picked que para CaaS: es una restricción del origen, no del canal.

export const MOQ_MEZCLA: Record<number, number> = { 2: 4, 3: 3, 4: 4 };
export const LOTES_EN_MEZCLA = [2, 3, 4] as const;

/** Cargas mínimas de un grado. Para Black y Red hay que decir de cuántos lotes
 *  se compone la mezcla; sin ese dato se devuelve el caso más común (4). */
export function moqCargas(b: Banda5, lotesEnMezcla?: number): number {
  if (b === "Black" || b === "Red") return MOQ_MEZCLA[lotesEnMezcla ?? 4] ?? 4;
  if (b === "Blue") return 2;
  return 1; // Gold y Tyrian: 1 carga — «o menos, según disponibilidad real» (ver moqPuedeBajarDeUnaCarga)
}

/** El incremento después del mínimo es LA MITAD del mínimo — y la casa puede
 *  bajar a cuartos para colocar el resto como upsale a otro cliente. */
export const incrementoCargas = (moq: number): number => moq / 2;

/** ¿Este grado admite el piso excepcional de un saco? (§9.2) */
export const admiteSaco = (b: Banda5): boolean => b === "Gold" || b === "Tyrian";

/** Gold y Tyrian se ofrecen con «1 carga o menos, según disponibilidad real». No
 *  hay un mínimo por debajo fijado: manda lo que de verdad haya del lote. */
export const moqPuedeBajarDeUnaCarga = admiteSaco;

// ── Las tres cifras ─────────────────────────────────────────────────────────

/** La prima mínima: el escalón más bajo de la casa (Black) contra el precio de
 *  la Federación de hoy. Es «cuánto más recibe, como mínimo, un productor que
 *  entra en la escala». */
export function primaMinima(pvcCop: number, multBlack: number, fncHoy: number): number | null {
  if (!(fncHoy > 0)) return null;
  return (pvcCop * multBlack - fncHoy) / fncHoy;
}

/** Lo mismo en pesos, por carga de 125 kg de pergamino. */
export function sobreBasePergamino(pvcCop: number, multBlack: number, fncHoy: number): number {
  return pvcCop * multBlack - fncHoy;
}

/** COP por kg de verde empacado FOB (FCA Bogotá ≈ FOB), desde la pila de la
 *  edición. `n2` ya trae proceso, paletizado, transporte interno, exportación y
 *  la tarifa de la casa; aquí solo se pasa a pesos a la TRM del corte. */
export const verdeFobCop = (n2Usd: number, trm: number): number => n2Usd * trm;

/** Cuánto se ha separado el mercado de la entrada con que se fijó la edición.
 *  Positivo = el mercado está por encima de lo que se supuso. */
export function desviacionDeMercado(fncHoy: number, fncEnEdicion: number): number | null {
  if (!(fncEnEdicion > 0)) return null;
  return fncHoy / fncEnEdicion - 1;
}

/** Cuánto le falta al mercado para tocar el disparador de corrección al alza.
 *  El disparador es FNC ≥ PVC (D2 §7.5): mientras sea holgado, el precio de la
 *  franja aguanta. Devuelve la fracción que le falta subir al FNC. */
export function holguraDisparador(pvcCop: number, fncHoy: number): number | null {
  if (!(fncHoy > 0)) return null;
  return pvcCop / fncHoy - 1;
}

/** El embudo de una carga: de pergamino a bolsas. Es la misma aritmética que
 *  sostiene los MOQ (§11.3) y la que explica por qué el colchón existe. */
export type EscalonEmbudo = { paso: string; kg: number; nota: string };

export function embudoDeCarga(kgExcelsoPorCarga: number, kgGarantizados: number, formatoKg: number): EscalonEmbudo[] {
  return [
    { paso: "Pergamino seco", kg: CARGA_KG_CPS, nota: "1 carga, la unidad del origen" },
    { paso: "Excelso", kg: kgExcelsoPorCarga, nota: "al factor de rendimiento 94" },
    { paso: "Verde garantizado", kg: kgGarantizados, nota: "lo que la casa promete entregar" },
    { paso: `Empaque de ${formatoKg} kg`, kg: Math.floor(kgGarantizados / formatoKg) * formatoKg, nota: `${Math.floor(kgGarantizados / formatoKg)} unidades enteras` },
  ];
}
