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

/** V5.173 (owner, 2026-10-06: «solo son 2 meses, la lógica de retirar debe ajustarse»): la escalera del trimestre dicha para
 *  cualquier duración. Cada mes cerrado libera la parte proporcional de este 75 % (en 3 meses, 25 % por mes: 0 · 25 · 50; en 2
 *  meses, 37,5 % al cerrar el primero; en 1 mes, nada). `tramoLibrePct` (mesAMes.ts) la aplica; `qa-trato` exige que reproduzca
 *  la tabla de arriba en 3 meses. */
export const TRAMO_LIBRE_DEL_TRATO_PCT = 75;

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

/** Paso 15: la declaración del productor al aceptar (fase 6). V5.173: «Declarar para Temporada Actual» reemplaza a «Declarar Ahora»
 *  (los 30 días), que nunca llegó a firmarse. */
export const DECLARACIONES = ["trimestre", "temporada_actual", "ahora_y_siguiente"] as const;

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

/** Respuesta 1 del owner (2026-09-24) con su corrección del 2026-09-30: lo que el productor DEBE declarar (CPS) para que se le
 *  pueda ofrecer un contrato, según el grado. Gold bajó de 200 a 150 kg; Tyrian NO tiene mínimo (va a subasta; el «MOQ de 100 kg» de
 *  la respuesta 3 nunca lo aplicó ningún código y se retiró). El MOQ de CaaS de cara al COMPRADOR es otro número: el reflejo en
 *  verde de lo que rinde una carga de CPS (`src/lib/pvc/lectura.ts`, `moqCargas`) — la carga es el común denominador. */
export const MINIMO_POR_GRADO: Record<"black" | "red" | "blue" | "gold", { cargas?: number; kg?: number }> = {
  black: { cargas: 6 },
  red: { cargas: 6 },
  blue: { cargas: 3 },
  gold: { kg: 150 },
};

/** El mínimo declarable de un grado, en kg (las cargas se convierten con `CARGA_KG`). null = ese grado no se oferta. */
export function minimoKg(grado: string | null | undefined): number | null {
  if (!grado) return null;
  const m = MINIMO_POR_GRADO[grado as keyof typeof MINIMO_POR_GRADO];
  if (!m) return null;
  return m.kg ?? (m.cargas ?? 0) * CARGA_KG;
}

/** V5.168 (owner, 2026-10-06): las condiciones de entrega por defecto de una oferta — CTCx las confirma (o cambia) al emitir. */
export const LUGAR_DE_ENTREGA_POR_DEFECTO = "Entregado en Bucaramanga (Santander), en las instalaciones de CTCx.";

// ── V5.169 (owner, 2026-10-06) · las tres modalidades de participar en Cherry Picked ──────────────────────────────────────
// «Declarar para Temporada Actual» ('temporada_actual', V5.173 — reemplaza a «Declarar Ahora», los 30 días renovables): lo que
// queda de la Temporada Trimestral en curso, si faltan al menos 30 días; PVC actual; CTCx compra entre 10 y 25 kg de CPS a su
// discreción al firmar; los meses del trato son los que quedan (redondeados, el último llega al fin de la temporada) y la escalera
// de retiro se reparte en ellos (`TRAMO_LIBRE_DEL_TRATO_PCT`). Owner, 2026-10-06: «este modelo es demasiado inflexible» cuando
// aún no se fija el PVC de la siguiente temporada y faltan más de 50 días.
// «Declarar Siguiente Temporada Trimestral» ('trimestre'): lo usual (los términos de arriba: una carga, tramos 25/50 %).
// «Declarar Ahora y Siguiente Temporada» ('ahora_y_siguiente'): si faltan como máximo 50 días; PVC de esta temporada; retiro
// libre hasta el 30 % sin escalones mensuales; al empezar la siguiente temporada se redeclara al menos el 70 % (y nunca menos
// del mínimo del grado); CTCx compra la carga de 125 kg.
// En TODAS: CTCx no se compromete a comprar fracciones mes a mes (puede no comprar en un mes, o todo el primer día).

/** «Declarar para Temporada Actual» se ofrece si faltan al menos estos días para la siguiente Temporada Trimestral. */
export const VENTANA_TEMPORADA_ACTUAL_DIAS = 30;
/** «Ahora y Siguiente» se ofrece si faltan como máximo estos días para la siguiente Temporada Trimestral. */
export const VENTANA_AHORA_Y_SIGUIENTE_DIAS = 50;
/** «Declarar para Temporada Actual»: CTCx compra entre 10 y 25 kg de CPS, a su discreción, con la firma. */
export const COMPRA_INICIAL_TEMPORADA_ACTUAL_KG = { min: 10, max: 25 } as const;
/** «Ahora y Siguiente»: retiro libre hasta el 30 %, sin escalones mensuales. */
export const RETIRO_LIBRE_AHORA_Y_SIGUIENTE_PCT = 30;
/** «Ahora y Siguiente»: al empezar la siguiente temporada se redeclara al menos este % de lo declarado. */
export const REDECLARAR_MIN_PCT = 70;
/** V5.171 (owner, 2026-10-06 · «la opción 1, que quede en el 70 %»): el botón «Redeclarar» se abre estos días antes de que empiece
 *  la siguiente Temporada Trimestral y se cierra al terminar su primer día. Si el productor no redeclara, la cantidad para la
 *  siguiente temporada queda en el mínimo (`REDECLARAR_MIN_PCT`, nunca menos del mínimo del grado). */
export const DIAS_ANTES_REDECLARAR = 10;
/** La Temporada Trimestral dura tres meses (≈ 91 días). */
export const DIAS_TEMPORADA_TRIMESTRAL = 91;
/** El trato más largo («Ahora y Siguiente» con 50 días de esta temporada + la siguiente) cabe en 6 meses de 30 días. */
export const MESES_MAX_DEL_TRATO = 6;
