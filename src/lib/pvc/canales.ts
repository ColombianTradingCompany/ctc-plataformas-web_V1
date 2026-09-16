// ── Canales comerciales y tramos de incoterm ─────────────────────────────────
// La matriz del owner (2026-09-16, docs/PVC_BCP_PLAN.md §9.6): DOS canales por
// TRES tramos, y no todas las casillas se pueden cotizar.
//
// Lo que esto resuelve: el motor calcula `n2` (FCA Bogotá ≈ FOB), `n3` (CIP ≈
// CIF) y `n4` (DDP) para TODOS los grados y para cualquier destino de la tabla
// de parámetros — nada en el código impedía que una superficie cotizara un DDP
// a un país donde CTCx no tiene con quién entregarlo. La regla que faltaba es
// que los dos tramos de arriba **dependen de una habilitación regional**, y que
// esa habilitación es distinta en cada canal.
//
// PURO y sin `server-only`, como `motor.ts`, `lectura.ts` y `escala.ts`.

import type { Banda5, Nivel } from "./motor";

export type Canal = "cherry-picked" | "caas";
export type Tramo = "fob" | "cif" | "ddp";

/** Los tres tramos, en el orden en que se cotizan. `nivel` es la columna de la
 *  pila del motor: FCA → `n2`, CIP → `n3`, DDP → `n4`. */
export const TRAMOS: {
  id: Tramo;
  nombre: string;
  nivel: Nivel;
  /** La clave de la pila (`FilaPila`) de la que sale el precio. */
  campo: "n2" | "n3" | "n4";
  /** El precio base no depende del destino; los otros dos sí. */
  dependeDelDestino: boolean;
  /** Los dos de arriba exigen habilitación regional. */
  exigeHabilitacion: boolean;
}[] = [
  { id: "fob", nombre: "FOB / FCA", nivel: "FCA", campo: "n2", dependeDelDestino: false, exigeHabilitacion: false },
  { id: "cif", nombre: "CIF / CIP", nivel: "CIP", campo: "n3", dependeDelDestino: true, exigeHabilitacion: true },
  { id: "ddp", nombre: "DDP", nivel: "DDP", campo: "n4", dependeDelDestino: true, exigeHabilitacion: true },
];

export const tramo = (id: Tramo) => TRAMOS.find((t) => t.id === id)!;

/** El MOQ de Cherry Picked se dice en CARGAS EQUIVALENTES — la unidad del
 *  origen, porque el lote es de un productor con nombre. Black y Red son
 *  mezclas y su mínimo depende de cuántos lotes las componen (§9.2). */
export const MOQ_CHERRY_CARGAS: Record<Banda5, number[]> = {
  Black: [3, 4],
  Red: [3, 4],
  Blue: [2],
  Gold: [1],
  Tyrian: [0.5],
};

/** El de CaaS se dice en KILOS de verde: no es el lote de nadie, es volumen de
 *  servicio, y puede componerse de FRACCIONES de varios cafés. */
export const MOQ_CAAS_KG: Record<Banda5, number> = {
  Black: 1000,
  Red: 1000,
  Blue: 500,
  Gold: 100,
  Tyrian: 100,
};

export const CANALES: {
  id: Canal;
  nombre: string;
  /** Cómo se expresa su mínimo. Son unidades distintas a propósito. */
  unidadMoq: "cargas" | "kg";
  /** Qué hace falta en la región para poder cotizar CIF/CIP y DDP. */
  habilitacion: string;
  queEs: string;
}[] = [
  {
    id: "cherry-picked",
    nombre: "Cherry Picked",
    unidadMoq: "cargas",
    habilitacion: "Master Roaster regional",
    queEs: "Un tostador de referencia que opera el mercado junto a CTCx. Sin él no hay quién reciba, almacene ni entregue en destino, así que solo se cotiza el tramo base.",
  },
  {
    id: "caas",
    nombre: "CaaS",
    unidadMoq: "kg",
    habilitacion: "Regional Operation Enablement",
    queEs: "El papeleo y el conocimiento para operar en esa geografía: importación, aduana, fitosanitario y quién responde. Es capacidad propia, no un socio.",
  },
];

export const canal = (id: Canal) => CANALES.find((c) => c.id === id)!;

/** El MOQ de un grado en su canal, ya normalizado a kilos de verde para poder
 *  compararlos y para saber en qué escalón de flete cae.
 *  `kgGarantizados` son los kilos que una carga entrega (78 en el modelo). */
export function moqKgVerde(c: Canal, b: Banda5, kgGarantizados: number): { kg: number; etiqueta: string } {
  if (c === "caas") {
    const kg = MOQ_CAAS_KG[b];
    return { kg, etiqueta: `${kg} kg` };
  }
  const cargas = MOQ_CHERRY_CARGAS[b];
  const kg = cargas[0] * kgGarantizados;
  const etiqueta = cargas.length > 1
    ? `${cargas[0]} o ${cargas[1]} cargas`
    : `${cargas[0] === 0.5 ? "½" : cargas[0]} carga${cargas[0] === 1 || cargas[0] === 0.5 ? "" : "s"}`;
  return { kg, etiqueta };
}

export type Cotizable =
  | { puede: true }
  | { puede: false; motivo: string };

/**
 * ¿Se puede cotizar esta casilla? El tramo base siempre; los otros dos solo con
 * la habilitación regional del canal.
 *
 * Es una regla de NEGOCIO, no de interfaz: quien pinte un precio CIF o DDP sin
 * preguntar esto está prometiendo una entrega que la casa no puede sostener.
 */
export function puedeCotizar(c: Canal, t: Tramo, habilitacionEnLaRegion: boolean): Cotizable {
  const tr = tramo(t);
  if (!tr.exigeHabilitacion) return { puede: true };
  if (habilitacionEnLaRegion) return { puede: true };
  return { puede: false, motivo: `Requiere ${canal(c).habilitacion} en la región de destino.` };
}

/** El precio de una casilla, sacado de la fila de la pila del grado. */
export function precioDeTramo(fila: { n2: number; n3: number; n4: number }, t: Tramo): number {
  return fila[tramo(t).campo];
}
