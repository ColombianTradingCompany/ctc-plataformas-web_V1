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

// ── MOQ por grado (addendum del owner, 2026-09-16; precisado el 2026-09-19; REESCRITO por el owner el 2026-09-25) ──
// Hasta el 2026-09-25 este archivo decía que Black y Red eran mezclas de TRES o CUATRO productores a una carga por
// productor (3 → 3 cargas · 4 → 4; ni de dos ni de cinco). El owner retiró esa regla DE RAÍZ (PVC_BCP_PLAN §14.8):
//
//   · Cada lote especifica su COMPOSICIÓN: variedades, procesos y marcador de origen (la finca —el estate— y su región).
//   · Blue, Gold y Tyrian son casi exclusivamente SINGLE ESTATE (pueden combinar variedades y procesos del mismo terroir).
//   · Black y Red los usa CTCx de forma ESTRATÉGICA: SINGLE ORIGIN de varios estates (misma variedad y proceso) o
//     REGIONAL BLEND de varios lotes de la región (Santander, Huila, Boyacá…).
//   · El mínimo ya no sale de contar productores: lo pone el MOQ DE COMPRA, que busca una demanda de al menos TRES
//     cargas (la compra mínima esperada de cara al productor). Para estas mezclas CTCx asegura un mínimo por temporada
//     desde Adquisición de Stock.
//
// Blue, Gold y Tyrian: el mínimo es del lote (2 · 1 · 1 cargas), como antes.
//
// FUNDAMENTO (CEO, 2026-09-16, plan §12.6): el MOQ sale de la cantidad de café que se puede comprar y procesar de forma
// significativa e INDIVIDUAL en Colombia. Por eso se dice en cargas y no en kilos de empaque, y por eso vale igual para
// Cherry Picked que para CaaS: es una restricción del origen, no del canal.
//
// Quien arma las mezclas (`src/lib/compras/mezclas.ts`, OCP) LEE de aquí los tipos y el MOQ; el guard `guard_mezcla_cerrada`
// deriva el mismo tipo en la base. `LOTES_EN_MEZCLA`, `CARGAS_POR_PRODUCTOR`, `MOQ_MEZCLA` y `COMPOSICION_MEZCLA` se
// RETIRARON con la regla (V5.91): no hay conteo de productores que exhibir.

/** El MOQ de compra de Black y Red: una demanda de al menos tres cargas. */
export const MOQ_CARGAS_BLACK_RED = 3;
/** Los dos tipos de mezcla de Black y Red, en el orden en que los nombra el owner. */
export const TIPOS_DE_MEZCLA = ["Single Origin", "Regional Blend"] as const;
const NOTA_BLACK_RED = "estratégico de CTCx: Single Origin de varios estates (misma variedad y proceso) o Regional Blend de varios lotes de la región";
const NOTA_SINGLE_ESTATE = "casi siempre Single Estate; puede combinar variedades y procesos del mismo terroir";
/** Cómo se compone cada grado. Se EXHIBE (ECP · Lectura) y la hace cumplir el OCP al armar mezclas. */
export const COMPOSICION_POR_GRADO = {
  Black: { tipos: TIPOS_DE_MEZCLA, nota: NOTA_BLACK_RED },
  Red: { tipos: TIPOS_DE_MEZCLA, nota: NOTA_BLACK_RED },
  Blue: { tipos: ["Single Estate"], nota: NOTA_SINGLE_ESTATE },
  Gold: { tipos: ["Single Estate"], nota: NOTA_SINGLE_ESTATE },
  Tyrian: { tipos: ["Single Estate"], nota: NOTA_SINGLE_ESTATE },
} as const;

/** Cargas mínimas de un grado: el MOQ de compra. */
export function moqCargas(b: Banda5): number {
  if (b === "Black" || b === "Red") return MOQ_CARGAS_BLACK_RED;
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
