// ── Los términos del trato · datos con VERSIÓN (fase 3 del PLAN_CIRCUITO_DEL_LOTE, V5.80) ────
// PURO a propósito: sin Supabase, sin "use server", sin importaciones. Lo leen las acciones (la solicitud, la
// factura, la oferta cuando llegue la fase 5), las pantallas de las dos caras (OCP y Kaffetal Regal) y los
// guardianes — que comparan estas cifras con lo que el owner escribió en el plan (§0 y §6), no con este archivo.
//
// POR QUÉ UN ARCHIVO Y NO UNA TABLA. Los términos cambian con el owner, no con el operador: se versionan como
// código y cada trato guarda la versión con la que nació (`terms_version`, fase 6), para que un cambio nunca
// reescriba un acuerdo vivo. La tarifa de la evaluación vivía antes en `arena/inscriptions.ts` como «80.000»;
// desde aquí la fija la respuesta 2 del owner (2026-09-24): «$200.000 COP es la tarifa plana (2026); los
// descuentos los da el código de Subvención (30 % a 70 %)».
//
// V5.82 (fase 5): se completan los términos del Lote de Temporada del folio 8 y las respuestas del owner: la
// compra inicial de CTCx, los tramos libres de retiro y la penalidad, la mora y la ruptura, la renovación, el
// past crop y la ventana de CTCx Selection. Los lee la oferta anclada (`ofertasActions.ts`); la mora, la ruptura
// y la renovación los leerá el trato mes a mes (fase 7). `qa-trato-check` compara cada cifra con §0 del plan.

export const TERMINOS_VERSION = "2026-09-24";

/** Folio 8, paso 14: CTCx compra de inmediato UNA carga al precio acordado, como inversión en la promoción. */
export const COMPRA_INICIAL_CTCX_CARGAS = 1;

/** Folio 8: la oferta cubre el trimestre por comenzar (el periodo del PVC). */
export const PERIODO_MESES = 3;

/** Folio 6/8, paso 16: al cerrar el mes 1 el productor puede retirar el 25 % sin penalidad; al cerrar el mes 2, otro 25 %
 *  (acumulado 50 %). Es la misma escalera de `src/lib/pvc/compromiso.ts` (§12.9 del PVC plan), dicha por mes del periodo. */
export const TRAMO_LIBRE_ACUMULADO_PCT: Record<1 | 2 | 3, number> = { 1: 0, 2: 25, 3: 50 };

/** Paso 16: lo retirado por encima del tramo libre paga el 4 % del precio de cada carga. */
export const PENALIDAD_RETIRO_PCT = 4;

/** Paso 16: mora — dos semanas sin cargo, dos más con el 5 %; después, «Ruptura Contractual» (cuenta congelada). */
export const MORA = { semanasSinCargo: 2, semanasConRecargo: 2, recargoPct: 5 } as const;

/** Paso 18: a los ~90 días CTCx ofrece renovar con el PVC nuevo. */
export const RENOVACION_DIAS = 90;

/** Paso 18: Past Crop — recolección final a más de 3 periodos (9 meses) → PVC − 10 %. */
export const PAST_CROP_MESES = 9;
export const MODIFICADOR_PAST_CROP_PCT = -10;

/** Paso 19: CTCx Selection — oferta directa al PVC − 8 %, con ventana de 30 días y cantidad mínima y máxima. */
export const MODIFICADOR_DIRECTA_PCT = -8;
export const VENTANA_DIRECTA_DIAS = 30;

/** Paso 15: la declaración del productor al aceptar — trimestre por empezar, o 30 días del periodo en curso (fase 6). */
export const DECLARACIONES = ["trimestre", "30_dias"] as const;

/** El % de modificación de una oferta anclada al PVC: directa (−8 %) y/o past crop (−10 %), aditivos. */
export function modificadorDeOferta(o: { directa?: boolean; pastCrop?: boolean }): number {
  return (o.directa ? MODIFICADOR_DIRECTA_PCT : 0) + (o.pastCrop ? MODIFICADOR_PAST_CROP_PCT : 0);
}

/** Tarifa plana de la evaluación de un lote, COP (respuesta 2 del owner). La subvención se aplica sobre ella. */
export const TARIFA_EVALUACION_COP = 200000;

/** La muestra que el productor envía para la evaluación (folio 7, paso 9): 2 kg de café pergamino seco. */
export const MUESTRA_EVALUACION_KG = 2;

/** Folio 7, paso 9: la muestra viaja CONTRA ENTREGA — el flete lo paga CTCx al recibir; al productor no le cuesta. */
export const PAGO_CONTRA_ENTREGA = true;

/** Folio 6: re-evaluación a tarifa plena, con el 80 % de reembolso si el lote sube un grado (fase 5). */
export const REEVALUACION = { tarifaPlena: true, reembolsoPctSiSubeGrado: 80 } as const;

/** Una carga de café pergamino seco, kg. */
export const CARGA_KG = 125;

/** Respuesta 1 del owner: cantidad MÍNIMA declarada por cada lote, según su grado. Tyrian no entra por oferta. */
export const MINIMO_POR_GRADO: Record<"black" | "red" | "blue" | "gold", { cargas?: number; kg?: number }> = {
  black: { cargas: 6 },
  red: { cargas: 6 },
  blue: { cargas: 3 },
  gold: { kg: 200 },
};

/** Respuesta 3 del owner: la subasta Tyrian sigue, con MOQ de 100 kg de CPS. */
export const MOQ_SUBASTA_TYRIAN_KG = 100;

/** El mínimo declarable de un grado, en kg (las cargas se convierten con `CARGA_KG`). null = ese grado no se oferta. */
export function minimoKg(grado: string | null | undefined): number | null {
  if (!grado) return null;
  const m = MINIMO_POR_GRADO[grado as keyof typeof MINIMO_POR_GRADO];
  if (!m) return null;
  return m.kg ?? (m.cargas ?? 0) * CARGA_KG;
}
