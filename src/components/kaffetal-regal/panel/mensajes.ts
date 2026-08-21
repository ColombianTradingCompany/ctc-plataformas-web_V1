import type { FeedbackNote } from "../data";

// ── La partición del feed (V4.35; movida aquí en V5.16) ─────────────────────
// Una nota con `leadId` nació de un servicio —CTC Tech, Varietales, CaaS— y va
// a «Solicitudes»; el resto es retroalimentación sobre fincas y lotes. Se parte
// por el CAMPO y no por el texto de la etiqueta: el label es copy y el día que
// alguien lo mejore, una partición basada en él se rompe sin que nada falle.
//
// ⚠️ Y NO BASTA CON MIRAR `leadId` EN CADA NOTA. Solo la nota de CTC lleva el
// lead; la RESPUESTA del productor a ese mismo hilo se guarda con `parentId`
// apuntando a ella y `leadId` nulo. Partiendo solo por `leadId`, la mitad de
// cada conversación —justo lo que escribió el productor— se habría quedado en
// Retroalimentación: el hilo partido en dos pantallas, sin un solo error.
// Encontrado con datos reales antes de salir (2 respuestas de 15 notas).
//
// Las dos mitades son COMPLEMENTARIAS por construcción (`esDeServicio` y su
// negación): ninguna nota se pierde ni se cuenta dos veces. Lo vigila
// scripts/qa-solicitudes-kr-check.mjs.
export function partirFeed(feedback: FeedbackNote[]): {
  solicitudes: FeedbackNote[];
  retroalimentacion: FeedbackNote[];
} {
  const idsDeServicio = new Set(feedback.filter((n) => n.leadId !== null).map((n) => n.id));
  const esDeServicio = (n: FeedbackNote) => n.leadId !== null || (n.parentId !== null && idsDeServicio.has(n.parentId));
  return {
    solicitudes: feedback.filter(esDeServicio),
    retroalimentacion: feedback.filter((n) => !esDeServicio(n)),
  };
}

/** Notas de CTC sin leer dentro de una mitad (alimenta insignias y contadores). */
export function sinLeer(notas: FeedbackNote[]): number {
  return notas.filter((n) => n.authorRole === "bcp" && !n.acknowledgedAt).length;
}
