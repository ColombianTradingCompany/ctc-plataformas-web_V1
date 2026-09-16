// ── La oportunidad Cherry Picked: compromiso con escalera de desbloqueo ──────
// Decisión del CEO del 2026-09-16 (docs/PVC_BCP_PLAN.md §12.9).
//
// POR QUÉ HAY COMPROMISO. En Cherry Picked el café se vende a compradores ANTES
// de estar en manos de CTC. Retirarlo después de vendido crea una
// responsabilidad grave frente al comprador; por eso el trato es contractual.
//
// LA MECÁNICA:
//   · el trato cubre los tres meses del periodo PVC;
//   · antes de empezar, el productor declara cuántas cargas compromete;
//   · lo comprometido queda retenido al menos un mes;
//   · se desbloquea en CUARTOS, acumulados: mes 1 nada libre, mes 2 un 25 %,
//     mes 3 otro 25 % — la mitad en total;
//   · siempre puede retirar todo de golpe, pagando una penalización por cada
//     carga retirada por encima del tramo libre.
//
// LA PENALIZACIÓN NO ES UN CASTIGO, ES UN IGUALADOR: debe evitar que el
// productor se vaya por una diferencia mínima frente a otra oferta, sin que se
// sienta atrapado. Es el 4 % del valor de cada carga penalizada — la MITAD del
// 8 % de `params.prima`, así que no es una cifra nueva: se explica en una frase.
//
// La escalera premia ESPERAR, que es lo que CTC necesita para comprometerse con
// sus compradores: quien cumple puede desarmar la mitad en el mes 3 sin costo;
// quien se va de golpe en el mes 1 paga sobre todo lo comprometido.
//
// PURO y sin `server-only`, como el resto de `src/lib/pvc/`.

/** El porcentaje del valor de cada carga penalizada. */
export const PENALIZACION = 0.04;

/** Los meses del periodo PVC que cubre el compromiso. */
export const MESES_DEL_PERIODO = 3;

/** Fracción ACUMULADA de lo comprometido que se puede retirar sin cobro, por mes
 *  (1, 2, 3). Cuartos, no mitades: cambió el 2026-09-16. */
export const TRAMO_LIBRE_ACUMULADO: Record<number, number> = { 1: 0, 2: 0.25, 3: 0.5 };

export function tramoLibre(mes: number): number {
  if (!Number.isInteger(mes) || mes < 1) return 0;
  return TRAMO_LIBRE_ACUMULADO[Math.min(mes, MESES_DEL_PERIODO)];
}

/** Cargas que se pueden retirar sin cobro en un mes. */
export const cargasLibres = (comprometidas: number, mes: number): number => comprometidas * tramoLibre(mes);

/** Las cargas que pagan: las retiradas por encima del tramo libre del mes. */
export function cargasPenalizadas(comprometidas: number, retiradas: number, mes: number): number {
  return Math.max(0, retiradas - cargasLibres(comprometidas, mes));
}

/** El valor de una carga en su grado: el PVC por carga por el multiplicador. */
export const valorPorCarga = (pvcPorCarga: number, multiplicadorGrado: number): number => pvcPorCarga * multiplicadorGrado;

/**
 *   Penalización = cargas penalizadas × PVC por carga × multiplicador de grado × % penalización
 */
export function penalizacion(
  comprometidas: number,
  retiradas: number,
  mes: number,
  pvcPorCarga: number,
  multiplicadorGrado: number,
  pct = PENALIZACION
): number {
  return cargasPenalizadas(comprometidas, retiradas, mes) * valorPorCarga(pvcPorCarga, multiplicadorGrado) * pct;
}

/** La tabla que se le enseña al productor antes de firmar: cuánto le costaría
 *  retirar TODO en cada mes. Es la forma más honesta de explicar la escalera. */
export function tablaDeSalida(comprometidas: number, pvcPorCarga: number, multiplicadorGrado: number, pct = PENALIZACION) {
  return [1, 2, 3].map((mes) => ({
    mes,
    libres: cargasLibres(comprometidas, mes),
    penalizadas: cargasPenalizadas(comprometidas, comprometidas, mes),
    monto: penalizacion(comprometidas, comprometidas, mes, pvcPorCarga, multiplicadorGrado, pct),
  }));
}
