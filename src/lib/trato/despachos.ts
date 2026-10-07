// ── Los despachos del trato por ventanas (V5.175 · docs/PLAN_CICLOS.md §3, owner 2026-10-07) ──────────────────────────────────
// PURO. Tres clases de envío: el SACO inicial (primer contrato del lote, 70–200 kg fuera de lo declarado), el ADELANTO de una
// renovación (0–200 kg) y lo VENDIDO (confirmado semana a semana). El productor paga el transporte; CTCx paga el 60 % con el
// tiquete de despacho y el 40 % al recibir, después de medir humedad y actividad de agua.
//
//   · El saco/adelanto sale al cierre de la SEMANA DE FIRMA (domingo). Si no sale: prórroga de una semana con advertencia (si aún
//     hay tiempo — un contrato firmado en la semana 1 del ciclo NO tiene: su saco tiene que llegar al procesamiento de la semana
//     2), cancelar el contrato, o pasarlo a la ventana siguiente.
//   · Lo vendido sale en la SEMANA 1 DEL CICLO SIGUIENTE. Si no sale: una semana de prórroga con advertencia; después el faltante
//     se cobra como retiro penalizado (4 % por carga) y CTCx puede declarar la ruptura (decisión del owner).
//   · Fuera de rango al recibir: devolución (el productor devuelve el 60 %, CTCx paga el flete de vuelta) o compra con un pago
//     adicional de 0–15 % (el café queda pagado al 60–75 %).

import { sumaDias } from "./calendario";
import { AJUSTE_FUERA_DE_RANGO_MAX_PCT, BACHES_DE_DESPACHO, CALIDAD_POR_DEFECTO, CARGA_KG, PAGO_AL_DESPACHO_PCT, PENALIDAD_RETIRO_PCT, PRORROGA_DIAS } from "./terminos";

export type TipoDeDespacho = "saco" | "adelanto" | "vendido";
export type RangosDeCalidad = { humedad_min: number; humedad_max: number; aw_max: number };

/** El domingo de la semana ISO de una fecha. */
export function finDeSemana(iso: string): string {
  const dow = (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
  return sumaDias(iso, 6 - dow);
}

/** El plazo del saco o del adelanto: el domingo de la semana en que se firma. */
export const plazoDelSaco = (firma: string) => finDeSemana(firma);

/** V5.183 (owner): lo vendido sale por BACHES. El plazo de un bache es el domingo de la 5.ª semana contando la de su primera venta
 *  confirmada (puede salir antes: cada 2 o 3 semanas es lo recomendado). Reemplaza «la semana 1 del ciclo siguiente» (V5.175). */
export const plazoDelBache = (semanaDeLaPrimeraVenta: string) => sumaDias(finDeSemana(semanaDeLaPrimeraVenta), (BACHES_DE_DESPACHO.maxSemanas - 1) * 7);

export type OpcionesSiNoSale = { prorroga: boolean; cancelar: boolean; siguienteVentana: boolean; motivoSinProrroga: string | null };

/** Qué puede hacer el productor con un despacho que no sale a tiempo. */
export function opcionesSiNoSale(o: { tipo: TipoDeDespacho; firmadoEnSemana1: boolean; yaProrrogado: boolean }): OpcionesSiNoSale {
  if (o.tipo === "vendido") {
    return { prorroga: !o.yaProrrogado, cancelar: false, siguienteVentana: false, motivoSinProrroga: o.yaProrrogado ? "La prórroga ya se usó: el faltante se cobra como retiro penalizado." : null };
  }
  const motivo = o.firmadoEnSemana1 ? "Firmado en la semana 1 del ciclo: el saco tiene que llegar al procesamiento de la semana 2." : o.yaProrrogado ? "La prórroga ya se usó." : null;
  return { prorroga: motivo === null, cancelar: true, siguienteVentana: true, motivoSinProrroga: motivo };
}

/** El nuevo plazo con la prórroga (una semana). */
export const plazoProrrogado = (plazo: string) => sumaDias(plazo, PRORROGA_DIAS);

/** El pago de un despacho: 60 % con el tiquete, 40 % al recibir. */
export function pagosDeDespacho(totalCop: number): { alDespacho: number; alRecibir: number } {
  const alDespacho = Math.round((totalCop * PAGO_AL_DESPACHO_PCT) / 100);
  return { alDespacho, alRecibir: Math.round(totalCop) - alDespacho };
}

/** ¿El café llegó en rango? */
export function calidadAlRecibir(m: { humedadPct: number | null; aw: number | null }, rangos: RangosDeCalidad | null): { enRango: boolean; motivo: string | null } {
  const r = rangos ?? CALIDAD_POR_DEFECTO;
  if (m.humedadPct == null || m.aw == null) return { enRango: false, motivo: "Faltan la humedad y la actividad de agua." };
  if (m.humedadPct < r.humedad_min || m.humedadPct > r.humedad_max) return { enRango: false, motivo: `Humedad ${m.humedadPct} % fuera de ${r.humedad_min}–${r.humedad_max} %.` };
  if (m.aw > r.aw_max) return { enRango: false, motivo: `Actividad de agua ${m.aw} sobre ${r.aw_max}.` };
  return { enRango: true, motivo: null };
}

/** Fuera de rango, CTCx compra con un pago adicional de 0–15 % sobre el 60 % ya pagado. */
export function pagoAdicionalFueraDeRango(totalCop: number, ajustePct: number): number | null {
  if (!(ajustePct >= 0 && ajustePct <= AJUSTE_FUERA_DE_RANGO_MAX_PCT)) return null;
  return Math.round((totalCop * ajustePct) / 100);
}

/** Lo vendido que no salió tras la prórroga se cobra como retiro penalizado: el 4 % del precio de cada carga. */
export const penalidadPorFaltante = (kg: number, copKg: number) => Math.round(((kg / CARGA_KG) * copKg * CARGA_KG * PENALIDAD_RETIRO_PCT) / 100);
