// ── La cuenta de una ventana (V5.175 · docs/PLAN_CICLOS.md §4, owner 2026-10-07) ─────────────────────────────────────────────
// PURO. Lo declarado, lo vendido (confirmado semana a semana), lo retirado y lo que queda; y el RETIRO: solo sobre lo no vendido,
// libre hasta el 25 % (ventana de un ciclo) o el 30 % (extendida) de lo declarado, en cualquier momento; por encima, el 4 % del
// precio de cada carga. Una declaración reducida por existencia insuficiente no tiene retiro libre.
//
// El ejemplo del owner (la prueba de `qa-ciclos`): declara 100 kg (25 % → 25 kg libres) · semana 2 retira 15 (libres) · semana 3
// CTCx vende 70 · semana 4 un tercero ofrece 30, pero quedan 15: o los retira (10 libres + 5 al 4 %), o los deja en la vitrina.

import { CARGA_KG, PENALIDAD_RETIRO_PCT } from "./terminos";

const r1 = (n: number) => Math.round(n * 10) / 10;

export type CuentaDeVentana = {
  declaradoKg: number;
  vendidoKg: number;
  retiradoKg: number;
  retiradoLibreKg: number;
  /** Lo que sigue en la vitrina: declarado − vendido − retirado. */
  disponibleKg: number;
  /** El retiro libre total de la ventana y lo que queda de él. */
  libreTotalKg: number;
  libreRestanteKg: number;
  sinRetiro: boolean;
};

export function cuentaDeVentana(o: {
  declaradoKg: number;
  retiroLibrePct: number | null;
  sinRetiro: boolean;
  ventas: readonly { kg: number }[];
  retiros: readonly { kg: number; libreKg: number }[];
}): CuentaDeVentana {
  const declaradoKg = Math.max(0, Number(o.declaradoKg) || 0);
  const vendidoKg = r1(o.ventas.reduce((a, v) => a + (Number(v.kg) || 0), 0));
  const retiradoKg = r1(o.retiros.reduce((a, r) => a + (Number(r.kg) || 0), 0));
  const retiradoLibreKg = r1(o.retiros.reduce((a, r) => a + (Number(r.libreKg) || 0), 0));
  const libreTotalKg = o.sinRetiro ? 0 : r1((declaradoKg * (o.retiroLibrePct ?? 0)) / 100);
  return {
    declaradoKg,
    vendidoKg,
    retiradoKg,
    retiradoLibreKg,
    disponibleKg: Math.max(0, r1(declaradoKg - vendidoKg - retiradoKg)),
    libreTotalKg,
    libreRestanteKg: Math.max(0, r1(libreTotalKg - retiradoLibreKg)),
    sinRetiro: o.sinRetiro,
  };
}

export type RetiroDeVentana =
  | { ok: true; libreKg: number; penalizadoKg: number; penalidadCop: number; cargasPenalizadas: number; quedaKg: number }
  | { ok: false; motivo: string };

/** Un retiro de `retiraKg` sobre la cuenta, al precio `copKg` del trato. No guarda nada. */
export function retiroDeVentana(c: CuentaDeVentana, retiraKg: number, copKg: number): RetiroDeVentana {
  const kg = Number(retiraKg);
  if (!Number.isFinite(kg) || kg <= 0) return { ok: false, motivo: "Escriba cuántos kilos retira." };
  if (kg > c.disponibleKg + 1e-9) return { ok: false, motivo: `Solo quedan ${c.disponibleKg} kg sin vender: lo vendido ya es de CTCx.` };
  const libreKg = r1(Math.min(kg, c.libreRestanteKg));
  const penalizadoKg = r1(kg - libreKg);
  const cargasPenalizadas = penalizadoKg / CARGA_KG;
  return {
    ok: true,
    libreKg,
    penalizadoKg,
    penalidadCop: Math.round((cargasPenalizadas * copKg * CARGA_KG * PENALIDAD_RETIRO_PCT) / 100),
    cargasPenalizadas: Math.round(cargasPenalizadas * 100) / 100,
    quedaKg: r1(c.disponibleKg - kg),
  };
}
