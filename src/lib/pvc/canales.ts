// ── Programas × incoterm × región ────────────────────────────────────────────
// Decisión del CEO del 2026-09-16 (docs/PVC_BCP_PLAN.md §12.1–§12.4), que
// REEMPLAZA la matriz de V5.46. Lo que cambió, y por qué importa:
//
//   · Cherry Picked NO tiene FOB ni entrega en puerto. Es un envío CONSOLIDADO a
//     través del master roaster de la región, así que solo existe entregado:
//     DDP. Si alguien quiere su café en un envío propio, eso ya es CaaS.
//   · CaaS es el envío DEDICADO, con tres tramos: FOB Colombia, puerto de
//     destino y DDP.
//   · Las habilitaciones son DOS y NO son intercambiables: el master roaster
//     abre Cherry Picked; el «regional enablement» (un operador logístico que
//     CTC contrata en la región) abre el puerto de destino y el DDP de CaaS.
//   · FOB está SIEMPRE disponible, en cualquier parte del mundo: nadie queda
//     fuera, lo que cambia es cuánta logística asume el comprador.
//
// PURO y sin `server-only`, como motor.ts, lectura.ts y escala.ts.

import type { Nivel } from "./motor";

export type Programa = "cherry-picked" | "caas";
export type Tramo = "fob" | "puerto" | "ddp";

/** La columna de la pila del motor de la que sale cada tramo.
 *
 *  ⚠️ `puerto` → `n3` es la aproximación honesta que hay hoy, no una
 *  equivalencia: el `n3` del motor es CIP en AEROPUERTO (flete aéreo por
 *  escalones), y «puerto de destino» es marítimo. El motor ya tiene
 *  `params.flete_mar` pero no lo usa para una columna propia. Modelar el
 *  tramo marítimo es parte de la versión v2.2.0 del modelo (plan §12.10). */
export const TRAMOS: {
  id: Tramo;
  nombre: string;
  nivel: Nivel;
  campo: "n2" | "n3" | "n4";
  dependeDelDestino: boolean;
}[] = [
  { id: "fob", nombre: "FOB Colombia", nivel: "FCA", campo: "n2", dependeDelDestino: false },
  { id: "puerto", nombre: "Puerto de destino", nivel: "CIP", campo: "n3", dependeDelDestino: true },
  { id: "ddp", nombre: "DDP", nivel: "DDP", campo: "n4", dependeDelDestino: true },
];

export const tramo = (id: Tramo) => TRAMOS.find((t) => t.id === id)!;

export type Habilitacion = "master-roaster" | "regional-enablement";

export const HABILITACIONES: Record<Habilitacion, { nombre: string; queEs: string; abre: string }> = {
  "master-roaster": {
    nombre: "Región con master roaster",
    queEs: "Un master roaster habilitado en la región. Es un cliente tipo partner: le compra a CTC por el mismo canal de Cherry Picked que él habilita.",
    abre: "Cherry Picked (DDP)",
  },
  "regional-enablement": {
    nombre: "Regional enablement",
    queEs: "Un operador logístico contratado por CTC en la región (por ejemplo, Estados Unidos).",
    abre: "El puerto de destino y el DDP de CaaS",
  },
};

export const PROGRAMAS: {
  id: Programa;
  nombre: string;
  envio: string;
  tramos: Tramo[];
}[] = [
  {
    id: "cherry-picked",
    nombre: "Cherry Picked",
    envio: "Consolidado a través del master roaster de la región",
    tramos: ["ddp"],
  },
  {
    id: "caas",
    nombre: "CaaS",
    envio: "Dedicado / personal",
    tramos: ["fob", "puerto", "ddp"],
  },
];

export const programa = (id: Programa) => PROGRAMAS.find((p) => p.id === id)!;

/** Lo que una región tiene habilitado. Una región puede tener una, la otra o las
 *  dos. Hoy esto NO vive en la base (no hay tabla de regiones): la pantalla
 *  muestra la condición, no un permiso concreto. */
export type Region = { masterRoaster: boolean; regionalEnablement: boolean };

/** Qué habilitación exige una casilla, o null si no exige ninguna. */
export function habilitacionRequerida(p: Programa, t: Tramo): Habilitacion | null {
  if (p === "cherry-picked") return "master-roaster";
  if (t === "fob") return null;
  return "regional-enablement";
}

export type Cotizable = { puede: true } | { puede: false; motivo: string };

/**
 * ¿Se puede cotizar esta casilla en esta región? Regla de NEGOCIO, no de
 * interfaz: quien pinte un precio sin preguntarla promete una entrega que la casa
 * no puede sostener — o, en Cherry Picked, un FOB que el programa no tiene.
 */
export function puedeCotizar(p: Programa, t: Tramo, region: Region): Cotizable {
  if (!programa(p).tramos.includes(t)) {
    return {
      puede: false,
      motivo: p === "cherry-picked"
        ? "Cherry Picked solo se entrega DDP: es un envío consolidado. Un envío propio es CaaS."
        : `CaaS no ofrece ${tramo(t).nombre}.`,
    };
  }
  const h = habilitacionRequerida(p, t);
  if (h === null) return { puede: true };
  const tiene = h === "master-roaster" ? region.masterRoaster : region.regionalEnablement;
  return tiene ? { puede: true } : { puede: false, motivo: `Requiere: ${HABILITACIONES[h].nombre}.` };
}

export type OpcionAcceso = { programa: Programa; tramos: Tramo[]; preferida: boolean; nota: string };

/**
 * La escalera de acceso del comprador (plan §12.3). Devuelve las opciones de una
 * región en orden de preferencia.
 *
 *  1. Con master roaster → Cherry Picked es el preferido POR DEFECTO (flexible y
 *     consolidado). CaaS queda como segunda opción para volúmenes grandes o una
 *     periodicidad distinta a la de los consolidados.
 *  2. Con regional enablement y sin master roaster → solo CaaS, puerto o DDP.
 *  3. Sin habilitación → FOB. Nadie queda fuera.
 */
export function accesoDelComprador(region: Region): OpcionAcceso[] {
  const out: OpcionAcceso[] = [];
  if (region.masterRoaster) {
    out.push({ programa: "cherry-picked", tramos: ["ddp"], preferida: true, nota: "Preferido por defecto: flexible y con costo consolidado." });
  }
  const caas: Tramo[] = region.regionalEnablement ? ["fob", "puerto", "ddp"] : ["fob"];
  out.push({
    programa: "caas",
    tramos: caas,
    preferida: !region.masterRoaster,
    nota: region.masterRoaster
      ? "Segunda opción: volúmenes grandes o periodicidad distinta a la de los consolidados."
      : region.regionalEnablement
        ? "Envío dedicado hasta puerto o puerta."
        : "Solo FOB: el comprador asume toda la logística.",
  });
  return out;
}

/** El precio de una casilla, sacado de la fila de la pila del grado. */
export function precioDeTramo(fila: { n2: number; n3: number; n4: number }, t: Tramo): number {
  return fila[tramo(t).campo];
}
