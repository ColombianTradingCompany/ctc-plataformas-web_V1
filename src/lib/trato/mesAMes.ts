// ── El trato mes a mes · lo derivado (fase 7 del PLAN_CIRCUITO_DEL_LOTE, V5.84) ─────────────
// PURO: sin red, sin servidor. Folio 8, pasos 16–18, y la decisión 6 del owner: «nunca automática; se hace
// visible de manera automática». Aquí se DERIVAN —de las fechas y los kilos de `contract_months`— la mora de cada
// mes, la ruptura POTENCIAL, el tramo libre de retiro y su penalidad, el past crop y si toca renovar. Nada de
// esto se guarda; el OCP y el productor lo leen con las mismas funciones (`qa-trato-check`). Lo único que
// cambia de estado de verdad —la ruptura y la cuenta congelada— lo escribe el owner a mano.

import { CARGA_KG, MORA, PAST_CROP_MESES, PENALIDAD_RETIRO_PCT, PERIODO_MESES, RENOVACION_DIAS, TRAMO_LIBRE_ACUMULADO_PCT } from "./terminos";

export type FilaDelMes = {
  mes: number;
  pedidoKg: number | null;
  pedidoAt: string | null;
  enviadoKg: number | null;
  enviadoAt: string | null;
  pagadoCop: number | null;
  pagadoAt: string | null;
  retiradoKg: number;
  retiradoLibreKg: number;
  retiradoPenalizadoKg: number;
  penalidadCop: number;
};

export type EstadoDeMora = "sin_pedido" | "cumplido" | "sin_cargo" | "con_recargo" | "ruptura_potencial";

export const MORA_LABEL: Record<EstadoDeMora, string> = {
  sin_pedido: "Sin pedido",
  cumplido: "Enviado",
  sin_cargo: "Pedido en curso (sin cargo)",
  con_recargo: `En mora · recargo ${MORA.recargoPct} %`,
  ruptura_potencial: "Ruptura potencial",
};

const SEMANA_MS = 7 * 86_400_000;
const DIA_MS = 86_400_000;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * La mora de un mes: desde que CTCx pidió y mientras el productor no envíe. Paso 16: «2 semanas sin cargo, 2 más con
 * 5 %; después Ruptura Contractual» — que aquí es POTENCIAL: la declara el owner (decisión 6).
 */
export function moraDelMes(fila: Pick<FilaDelMes, "pedidoAt" | "enviadoAt">, hoy: Date): { estado: EstadoDeMora; semanas: number; recargoPct: number } {
  if (!fila.pedidoAt) return { estado: "sin_pedido", semanas: 0, recargoPct: 0 };
  if (fila.enviadoAt) return { estado: "cumplido", semanas: 0, recargoPct: 0 };
  const semanas = Math.floor((hoy.getTime() - new Date(fila.pedidoAt).getTime()) / SEMANA_MS);
  if (semanas < MORA.semanasSinCargo) return { estado: "sin_cargo", semanas, recargoPct: 0 };
  if (semanas < MORA.semanasSinCargo + MORA.semanasConRecargo) return { estado: "con_recargo", semanas, recargoPct: MORA.recargoPct };
  return { estado: "ruptura_potencial", semanas, recargoPct: MORA.recargoPct };
}

const PESO: Record<EstadoDeMora, number> = { sin_pedido: 0, cumplido: 0, sin_cargo: 1, con_recargo: 2, ruptura_potencial: 3 };

/** «En mora» para el circuito (OCP y KR): desde que corre el recargo. Las dos semanas sin cargo NO son mora. */
export function enMora(estado: EstadoDeMora): boolean {
  return estado === "con_recargo" || estado === "ruptura_potencial";
}

/** La peor mora entre los meses de un trato (lo que se pinta en la tabla y en la barra). */
export function moraDelTrato(filas: readonly Pick<FilaDelMes, "pedidoAt" | "enviadoAt">[], hoy: Date): EstadoDeMora {
  let peor: EstadoDeMora = "sin_pedido";
  for (const f of filas) {
    const m = moraDelMes(f, hoy).estado;
    if (PESO[m] > PESO[peor]) peor = m;
  }
  return peor;
}

/** El mes del periodo en que estamos: tramos de 30 días desde la firma, 1..meses. */
export function mesEnCurso(signedAt: string | null, hoy: Date, meses = PERIODO_MESES): number {
  if (!signedAt) return 1;
  const dias = Math.floor((hoy.getTime() - new Date(signedAt).getTime()) / DIA_MS);
  return Math.min(meses, Math.max(1, Math.floor(dias / 30) + 1));
}

/** El tramo libre ACUMULADO al cerrar el mes anterior al que corre (paso 16: 25 % al cerrar el mes 1, 50 % al cerrar el 2). */
export function tramoLibrePct(mes: number, meses = PERIODO_MESES): number {
  if (meses <= 1) return 0;
  return TRAMO_LIBRE_ACUMULADO_PCT[Math.min(3, Math.max(1, mes)) as 1 | 2 | 3] ?? 0;
}

export type Retiro = { libreDisponibleKg: number; libreKg: number; penalizadoKg: number; penalidadCop: number; cargasPenalizadas: number };

/**
 * Un retiro: lo que cabe en el tramo libre acumulado (descontando lo ya retirado libre) sale sin costo; el resto paga el
 * 4 % del precio de cada carga (§12.9: cargas penalizadas × COP/carga × 4 %).
 */
export function retiro(o: { declaradoKg: number; mes: number; meses?: number; retiradoLibreAcumKg: number; retiraKg: number; copKg: number }): Retiro {
  const pct = tramoLibrePct(o.mes, o.meses ?? PERIODO_MESES);
  const libreAcumKg = (o.declaradoKg * pct) / 100;
  const libreDisponibleKg = Math.max(0, r1(libreAcumKg - o.retiradoLibreAcumKg));
  const retira = Math.max(0, Number(o.retiraKg) || 0);
  const libreKg = r1(Math.min(retira, libreDisponibleKg));
  const penalizadoKg = r1(retira - libreKg);
  const cargasPenalizadas = penalizadoKg / CARGA_KG;
  const penalidadCop = Math.round((cargasPenalizadas * o.copKg * CARGA_KG * PENALIDAD_RETIRO_PCT) / 100);
  return { libreDisponibleKg, libreKg, penalizadoKg, penalidadCop, cargasPenalizadas: Math.round(cargasPenalizadas * 100) / 100 };
}

/** Paso 18: past crop = recolección final a más de 3 periodos (9 meses) de la fecha. */
export function esPastCrop(harvestTo: string | null | undefined, hoy: Date): boolean {
  if (!harvestTo) return false;
  const limite = new Date(harvestTo);
  limite.setMonth(limite.getMonth() + PAST_CROP_MESES);
  return hoy.getTime() > limite.getTime();
}

/** Paso 18: a los ~90 días de la firma toca ofrecer la renovación. */
export function renovacionDebida(signedAt: string | null | undefined, hoy: Date): boolean {
  if (!signedAt) return false;
  return hoy.getTime() - new Date(signedAt).getTime() >= RENOVACION_DIAS * DIA_MS;
}

export type ResumenDelTrato = {
  comprometidoKg: number;
  retiradoKg: number;
  vigenteKg: number;
  pedidoKg: number;
  enviadoKg: number;
  pagadoCop: number;
  penalidadCop: number;
  mesEnCurso: number;
  mora: EstadoDeMora;
  renovacionDebida: boolean;
  /** Todos los meses del periodo enviados y pagados. */
  cerrado: boolean;
};

export function resumenDelTrato(
  c: { quantityFrozenKg: number | null; freezeMonths: number | null; signedAt: string | null },
  filas: readonly FilaDelMes[],
  hoy: Date
): ResumenDelTrato {
  const meses = c.freezeMonths && c.freezeMonths > 0 ? Math.min(3, c.freezeMonths) : PERIODO_MESES;
  const comprometidoKg = Number(c.quantityFrozenKg ?? 0);
  const suma = (k: (f: FilaDelMes) => number | null) => r1(filas.reduce((a, f) => a + (Number(k(f)) || 0), 0));
  const retiradoKg = suma((f) => f.retiradoKg);
  const cerrado = filas.length >= meses && filas.every((f) => f.enviadoAt && f.pagadoAt);
  return {
    comprometidoKg,
    retiradoKg,
    vigenteKg: r1(comprometidoKg - retiradoKg),
    pedidoKg: suma((f) => f.pedidoKg),
    enviadoKg: suma((f) => f.enviadoKg),
    pagadoCop: Math.round(filas.reduce((a, f) => a + (Number(f.pagadoCop) || 0), 0)),
    penalidadCop: Math.round(filas.reduce((a, f) => a + (Number(f.penalidadCop) || 0), 0)),
    mesEnCurso: mesEnCurso(c.signedAt, hoy, meses),
    mora: moraDelTrato(filas, hoy),
    renovacionDebida: renovacionDebida(c.signedAt, hoy),
    cerrado,
  };
}
