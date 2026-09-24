// ── La calculadora del trato (fase 6 del PLAN_CIRCUITO_DEL_LOTE, V5.83) ──────────────────────
// PURA: sin red, sin servidor. Folio 8, paso 15: «acepta con claridad: una calculadora que simula escenarios y
// sobre la que decide la cantidad». Dada la cantidad que el productor piensa comprometer, el precio anclado de la
// oferta (COP/kg de CPS) y su declaración (trimestre o 30 días), dice: cuánto compra CTCx de inmediato (una carga),
// cuánto pediría y pagaría cada mes, cuánto puede retirar sin costo al cerrar cada mes (25 % · 25 %) y cuánto
// costaría retirar TODO en cada mes (4 % del precio de cada carga por encima del tramo libre). Las cifras salen de
// `terminos.ts`; la penalidad reproduce el ejemplo del §12.9 del PVC plan (`qa-trato-check` lo exige).
//
// Es un ESCENARIO, no un pedido: el pedido real de CTCx mes a mes lo hace el trato (fase 7). El reparto mensual se
// enseña parejo porque es lo único honesto sin conocer la cosecha; el productor decide con eso la cantidad.

import { CARGA_KG, COMPRA_INICIAL_CTCX_CARGAS, PENALIDAD_RETIRO_PCT, PERIODO_MESES, TRAMO_LIBRE_ACUMULADO_PCT, minimoKg, type DECLARACIONES } from "./terminos";

export type Declaracion = (typeof DECLARACIONES)[number];

export type EscenarioDelTrato = {
  /** Lo que el productor compromete, kg de CPS. */
  declaradoKg: number;
  /** El precio de la oferta, COP por kg de CPS (ya con su % de modificación). */
  copKg: number;
  declaracion: Declaracion;
  /** El grado del lote (minúscula), para el mínimo. */
  grado?: string | null;
};

export type MesDelTrato = {
  mes: number;
  /** Lo que CTCx pediría ese mes (reparto parejo del resto tras la compra inicial). */
  pedidoKg: number;
  /** Lo que CTCx pagaría por ese pedido (en la primera semana del mes siguiente, paso 17). */
  pagoCop: number;
  /** El tramo libre ACUMULADO al cerrar el mes anterior: lo que puede retirar sin penalidad. */
  retiroLibrePct: number;
  retiroLibreKg: number;
  /** Si retirara TODO lo declarado en ese mes: las cargas que pagan penalidad y cuánto costaría. */
  cargasPenalizadasSiRetiraTodo: number;
  penalidadSiRetiraTodoCop: number;
};

export type SimulacionDelTrato = {
  meses: number;
  declaradoKg: number;
  cargas: number;
  copKg: number;
  copCarga: number;
  compraInicial: { kg: number; cop: number };
  restanteKg: number;
  porMes: MesDelTrato[];
  /** Todo lo declarado al precio de la oferta: compra inicial + los pedidos. */
  totalCop: number;
  minimoKg: number | null;
  cumpleMinimo: boolean;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const cop = (n: number) => Math.round(n);

export function simularTrato(e: EscenarioDelTrato): SimulacionDelTrato {
  const declaradoKg = Math.max(0, Number(e.declaradoKg) || 0);
  const copKg = Math.max(0, Number(e.copKg) || 0);
  const meses = e.declaracion === "30_dias" ? 1 : PERIODO_MESES;
  const copCarga = copKg * CARGA_KG;
  const cargas = declaradoKg / CARGA_KG;
  const compraInicialKg = Math.min(declaradoKg, COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG);
  const restanteKg = r1(declaradoKg - compraInicialKg);
  const porMes: MesDelTrato[] = [];
  let repartido = 0;
  for (let mes = 1; mes <= meses; mes++) {
    const pedidoKg = mes === meses ? r1(restanteKg - repartido) : r1(restanteKg / meses);
    repartido = r1(repartido + pedidoKg);
    // Por 30 días (el periodo en curso) no hay tramo libre: es el mes 1 del periodo.
    const retiroLibrePct = e.declaracion === "30_dias" ? 0 : (TRAMO_LIBRE_ACUMULADO_PCT[mes as 1 | 2 | 3] ?? 0);
    const cargasPenalizadas = cargas * (1 - retiroLibrePct / 100);
    porMes.push({
      mes,
      pedidoKg,
      pagoCop: cop(pedidoKg * copKg),
      retiroLibrePct,
      retiroLibreKg: r1((declaradoKg * retiroLibrePct) / 100),
      cargasPenalizadasSiRetiraTodo: Math.round(cargasPenalizadas * 100) / 100,
      penalidadSiRetiraTodoCop: cop((cargasPenalizadas * copCarga * PENALIDAD_RETIRO_PCT) / 100),
    });
  }
  const minimo = minimoKg(e.grado);
  return {
    meses,
    declaradoKg,
    cargas: Math.round(cargas * 100) / 100,
    copKg,
    copCarga,
    compraInicial: { kg: compraInicialKg, cop: cop(compraInicialKg * copKg) },
    restanteKg,
    porMes,
    totalCop: cop(declaradoKg * copKg),
    minimoKg: minimo,
    cumpleMinimo: minimo == null ? declaradoKg > 0 : declaradoKg >= minimo,
  };
}
