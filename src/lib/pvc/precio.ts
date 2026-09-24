// ── PVC · el precio de UN grado (fase 5 del PLAN_CIRCUITO_DEL_LOTE, V5.82) ─────────────────
// PURO: sin red, sin servidor. Hasta aquí cada tablero buscaba la banda a mano en `outputs.escalera`
// (`escalera.find((e) => e.banda === "Black")`), con la banda en mayúscula y el grado del lote en minúscula, y
// ninguna oferta leía el PVC. Esta es LA puerta: del grado del lote (`definicion.ts`, minúscula) a la banda de
// la escalera (mayúscula, `nombre` del grado) y de ahí a COP/kg y COP/carga, con el % de modificación que
// pida el trato (−8 % directa, −10 % past crop; los porcentajes viven en `src/lib/trato/terminos.ts`).
// `qa-pvc-precio` la reproduce grado por grado contra la escalera publicada (`paridad.json`).
//
// Tyrian NO tiene precio de oferta: se subasta (respuesta 3 del owner). Pedirlo devuelve null, a propósito.

import { CARGA_KG_CPS } from "./lectura";
import { GRADO_POR_ID, type GradoId } from "@/lib/grados/definicion";
import type { Banda5 } from "./motor";

/** Lo que una fila de la escalera publicada tiene que traer para dar un precio. */
export type EscalonPublicado = { banda: string; mult: number; cop: number; cop_kg?: number };

export type PrecioDeGrado = {
  grado: GradoId;
  banda: Banda5;
  mult: number;
  /** COP por carga de 125 kg de CPS, sin modificar (PVC × multiplicador). */
  copCarga: number;
  /** COP por kg de CPS, sin modificar. */
  copKg: number;
  /** El % aplicado (negativo = descuento). */
  modificadorPct: number;
  copCargaFinal: number;
  copKgFinal: number;
};

/** Los grados que no entran por oferta anclada (van a subasta). */
export const GRADOS_SIN_OFERTA: readonly GradoId[] = ["tyrian"];

/** La banda de la escalera para un grado del lote: el `nombre` del grado ("black" → "Black"). */
export function bandaDeGrado(grado: GradoId): Banda5 {
  return GRADO_POR_ID[grado].nombre as Banda5;
}

const entero = (n: number) => Math.round(n);

/**
 * El precio de un grado sobre una escalera publicada. Lee `banda` y `cop` (y `cop_kg` si viene); NUNCA `rango`:
 * una edición publicada es inmutable y las de antes de la V5.82 traen los rangos viejos del motor.
 */
export function precioDeLaEscalera(escalera: readonly EscalonPublicado[], grado: GradoId, modificadorPct = 0): PrecioDeGrado | null {
  if (GRADOS_SIN_OFERTA.includes(grado)) return null;
  const banda = bandaDeGrado(grado);
  const fila = escalera.find((e) => e.banda === banda);
  if (!fila || !Number.isFinite(fila.cop) || fila.cop <= 0) return null;
  const copCarga = fila.cop;
  const copKg = fila.cop_kg && fila.cop_kg > 0 ? fila.cop_kg : copCarga / CARGA_KG_CPS;
  const factor = 1 + modificadorPct / 100;
  return {
    grado,
    banda,
    mult: fila.mult,
    copCarga: entero(copCarga),
    copKg: entero(copKg),
    modificadorPct,
    copCargaFinal: entero(copCarga * factor),
    copKgFinal: entero(copKg * factor),
  };
}
