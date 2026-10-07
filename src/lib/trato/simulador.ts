// ── La calculadora del trato (fase 6 del PLAN_CIRCUITO_DEL_LOTE, V5.83) ──────────────────────
// PURA: sin red, sin servidor. Folio 8, paso 15: «acepta con claridad: una calculadora que simula escenarios y
// sobre la que decide la cantidad». Dada la cantidad que el productor piensa comprometer, el precio anclado de la
// oferta (COP/kg de CPS) y su declaración (la modalidad), dice: cuánto compra CTCx de inmediato (una carga),
// cuánto pediría y pagaría cada mes, cuánto puede retirar sin costo al cerrar cada mes (25 % · 25 %) y cuánto
// costaría retirar TODO en cada mes (4 % del precio de cada carga por encima del tramo libre). Las cifras salen de
// `terminos.ts`; la penalidad reproduce el ejemplo del §12.9 del PVC plan (`qa-trato-check` lo exige).
//
// Es un ESCENARIO, no un pedido: el pedido real de CTCx mes a mes lo hace el trato (fase 7). El reparto mensual se
// enseña parejo porque es lo único honesto sin conocer la cosecha; el productor decide con eso la cantidad.

import { CARGA_KG, COMPRA_INICIAL_CTCX_CARGAS, PENALIDAD_RETIRO_PCT, PERIODO_MESES, RETIRO_LIBRE_AHORA_Y_SIGUIENTE_PCT, minimoKg, type DECLARACIONES } from "./terminos";
import { tramoLibrePct } from "./mesAMes";

export type Declaracion = (typeof DECLARACIONES)[number];

export type EscenarioDelTrato = {
  /** Lo que el productor compromete, kg de CPS. */
  declaradoKg: number;
  /** El precio de la oferta, COP por kg de CPS (ya con su % de modificación). */
  copKg: number;
  declaracion: Declaracion;
  /** El grado del lote (minúscula), para el mínimo. */
  grado?: string | null;
  /** V5.169: los meses del trato cuando no son los de la declaración (p. ej. «Ahora y Siguiente»: los de esta temporada + 3). */
  meses?: number;
  /** V5.169: la compra de CTCx con la firma, si no es la carga de siempre («Temporada Actual»: 10 a 25 kg; se simula con un valor). */
  compraInicialKg?: number;
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
  const meses = e.meses ?? PERIODO_MESES;
  const copCarga = copKg * CARGA_KG;
  const cargas = declaradoKg / CARGA_KG;
  const compraInicialKg = Math.min(declaradoKg, e.compraInicialKg ?? COMPRA_INICIAL_CTCX_CARGAS * CARGA_KG);
  const restanteKg = r1(declaradoKg - compraInicialKg);
  const porMes: MesDelTrato[] = [];
  let repartido = 0;
  for (let mes = 1; mes <= meses; mes++) {
    const pedidoKg = mes === meses ? r1(restanteKg - repartido) : r1(restanteKg / meses);
    repartido = r1(repartido + pedidoKg);
    // V5.169: «Ahora y Siguiente» tiene el 30 % libre desde el primer día, sin escalones. V5.173: las demás, la escalera repartida
    // en los meses del trato (`tramoLibrePct`): 0 · 25 · 50 en el trimestre, 0 · 37,5 en dos meses, nada en un mes.
    const retiroLibrePct = tramoLibrePct(mes, meses, e.declaracion === "ahora_y_siguiente" ? RETIRO_LIBRE_AHORA_Y_SIGUIENTE_PCT : null);
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

// ── V5.169 (owner, 2026-10-06) · los ESCENARIOS de venta ─────────────────────────────────────────────────────────────────
// «CTCx no se está comprometiendo a comprar de manera consistente las fracciones correspondientes mes a mes; es posible tanto
// que no haya ninguna compra en un mes cualquiera, como que todo el café declarado disponible se venda en el primer día. Por
// ello, el Productor debe poder también manipular estos escenarios contando que CTCx vende todo o una parte y en qué medida,
// proporcionando KPIs como %, anclando también con perspectiva en lo ofrecido en comparación por la referencia FNC.»
// El productor elige cuánto de lo declarado vende CTCx (0–100 %) y cómo se reparte en el tiempo; la compra con la firma siempre
// ocurre. Sale: lo vendido mes a mes, lo que recibe, lo que le queda y los KPIs frente a la referencia FNC del día de la oferta.

export type PatronDeVenta = "primer_dia" | "parejo" | "al_final" | "mes_sin_venta";
export const PATRON_LABEL: Record<PatronDeVenta, string> = {
  primer_dia: "Todo apenas empieza",
  parejo: "Parejo, mes a mes",
  al_final: "Todo al final",
  mes_sin_venta: "Un mes sin ventas, luego parejo",
};

export type EscenarioDeVenta = {
  declaradoKg: number;
  copKg: number;
  meses: number;
  /** Lo que CTCx compra con la firma (kg). */
  compraInicialKg: number;
  /** El % de lo declarado que CTCx termina vendiendo (incluye la compra inicial). */
  ventaPct: number;
  patron: PatronDeVenta;
  /** La referencia FNC por carga congelada en la oferta (null si no hay). */
  fncCargaRef: number | null;
};

export type ResultadoDeVenta = {
  porMes: { mes: number; kg: number; cop: number }[];
  compraInicial: { kg: number; cop: number };
  vendidoKg: number;
  vendidoPct: number;
  ingresoCop: number;
  sinVenderKg: number;
  fncKg: number | null;
  /** Lo mismo vendido a la referencia FNC, y cuánto más (o menos) recibe con CTCx. */
  ingresoFncCop: number | null;
  diferenciaFncCop: number | null;
  /** Cuánto paga CTCx por encima (o por debajo) de la FNC, en %. */
  primaFncPct: number | null;
};

export function simularVentas(e: EscenarioDeVenta): ResultadoDeVenta {
  const declarado = Math.max(0, Number(e.declaradoKg) || 0);
  const copKg = Math.max(0, Number(e.copKg) || 0);
  const meses = Math.max(1, Math.round(e.meses));
  const inicial = Math.min(declarado, Math.max(0, e.compraInicialKg));
  const objetivo = Math.max(inicial, (declarado * Math.min(100, Math.max(0, e.ventaPct))) / 100);
  const resto = r1(objetivo - inicial);
  const pesos: number[] = Array.from({ length: meses }, (_, i) => {
    if (e.patron === "primer_dia") return i === 0 ? 1 : 0;
    if (e.patron === "al_final") return i === meses - 1 ? 1 : 0;
    if (e.patron === "mes_sin_venta") return meses === 1 ? 1 : i === 0 ? 0 : 1;
    return 1;
  });
  const suma = pesos.reduce((a, b) => a + b, 0) || 1;
  let repartido = 0;
  const porMes = pesos.map((w, i) => {
    const kg = i === meses - 1 ? r1(resto - repartido) : r1((resto * w) / suma);
    repartido = r1(repartido + kg);
    return { mes: i + 1, kg, cop: cop(kg * copKg) };
  });
  const vendidoKg = r1(inicial + resto);
  const ingresoCop = cop(vendidoKg * copKg);
  const fncKg = e.fncCargaRef && e.fncCargaRef > 0 ? e.fncCargaRef / CARGA_KG : null;
  const ingresoFncCop = fncKg != null ? cop(vendidoKg * fncKg) : null;
  return {
    porMes,
    compraInicial: { kg: inicial, cop: cop(inicial * copKg) },
    vendidoKg,
    vendidoPct: declarado > 0 ? Math.round((vendidoKg / declarado) * 1000) / 10 : 0,
    ingresoCop,
    sinVenderKg: r1(declarado - vendidoKg),
    fncKg,
    ingresoFncCop,
    diferenciaFncCop: ingresoFncCop != null ? ingresoCop - ingresoFncCop : null,
    primaFncPct: fncKg ? Math.round((copKg / fncKg - 1) * 1000) / 10 : null,
  };
}

// ── V5.175 (docs/PLAN_CICLOS.md §3–§4) · el escenario de una VENTANA, por semanas ───────────────────────────────────────────
// Lo mismo que `simularVentas`, contado en semanas y con el SACO inicial FUERA de lo declarado: lo que el productor recibe es el
// saco más lo que CTCx vende de lo declarado. El patrón «un mes sin ventas» se lee aquí como «las primeras semanas sin ventas».
export const PATRON_LABEL_VENTANA: Record<PatronDeVenta, string> = {
  primer_dia: "Todo apenas empieza",
  parejo: "Parejo, semana a semana",
  al_final: "Todo al final",
  mes_sin_venta: "Una semana sin ventas, luego parejo",
};

export type ResultadoDeVentana = {
  porSemana: { semana: number; kg: number; cop: number }[];
  saco: { kg: number; cop: number };
  vendidoKg: number;
  vendidoPct: number;
  ingresoCop: number;
  sinVenderKg: number;
  primaFncPct: number | null;
  diferenciaFncCop: number | null;
};

export function simularVentasDeVentana(e: { declaradoKg: number; copKg: number; semanas: number; sacoKg: number; ventaPct: number; patron: PatronDeVenta; fncCargaRef: number | null }): ResultadoDeVentana {
  const v = simularVentas({ declaradoKg: e.declaradoKg, copKg: e.copKg, meses: Math.max(1, Math.round(e.semanas)), compraInicialKg: 0, ventaPct: e.ventaPct, patron: e.patron, fncCargaRef: e.fncCargaRef });
  const sacoKg = Math.max(0, Number(e.sacoKg) || 0);
  const saco = { kg: sacoKg, cop: Math.round(sacoKg * Math.max(0, Number(e.copKg) || 0)) };
  const fncKg = v.fncKg;
  const ingresoCop = v.ingresoCop + saco.cop;
  const ingresoFnc = fncKg != null ? Math.round((v.vendidoKg + sacoKg) * fncKg) : null;
  return {
    porSemana: v.porMes.map((m) => ({ semana: m.mes, kg: m.kg, cop: m.cop })),
    saco,
    vendidoKg: v.vendidoKg,
    vendidoPct: v.vendidoPct,
    ingresoCop,
    sinVenderKg: v.sinVenderKg,
    primaFncPct: v.primaFncPct,
    diferenciaFncCop: ingresoFnc != null ? ingresoCop - ingresoFnc : null,
  };
}
