// ── Los límites de una Campaña de Subvención (V5.77, owner 2026-09-24) ───────
// Un archivo «use server» solo puede exportar funciones async, así que las cifras viven aquí,
// puras, y las leen las acciones (`subvencionesActions.ts`), la pantalla y el guardián.
// La tarifa plana de la evaluación es `EVALUATION_FEE_COP` (`./inscriptions.ts`); la subvención
// que una campaña puede dar sobre ella va del 30 al 70 % (respuesta 2 del owner al plan).
export const SUBVENCION_MIN_PCT = 30;
export const SUBVENCION_MAX_PCT = 70;
