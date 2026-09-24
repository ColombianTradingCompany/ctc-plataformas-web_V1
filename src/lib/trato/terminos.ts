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
// Lo que TODAVÍA no está aquí (fase 5): compra inicial de CTCx, tramos de retiro, penalidad, mora, ruptura,
// renovación, past crop, ventana de CTCx Selection. Se añaden cuando se construya lo que los lee.

export const TERMINOS_VERSION = "2026-09-24";

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
