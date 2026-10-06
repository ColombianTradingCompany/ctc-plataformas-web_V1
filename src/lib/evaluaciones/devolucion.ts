// ── V5.161 (owner, 2026-10-06) · un alta devuelta al Centro NO pierde lo registrado ─────────────────────────────────────
// «Cuando devuelvo un Lote desde OCP hacia el Centro de Calidad después de darlo de alta, toda la información registrada se
// borra cuando llega de vuelta. Esto no debe suceder.» Nunca se borró: la fila devuelta (`lot_evaluations`, status
// `rejected`) conserva la planilla en `physical_data.planilla`, las notas, el código interno y el reporte adjunto. Lo que
// fallaba era la pantalla del Centro, que solo sabía arrancar la planilla desde un BORRADOR y abría la hoja vacía.
//
// Y el motivo de CTC se pegaba dentro de las mismas `notes` del Q-Grader («… · Devuelta por CTC: …»). Aquí se separan:
// lo que escribió el Q-Grader vuelve a su casilla; el motivo de CTC se enseña aparte.
// PURO: lo leen la página del Centro, la acción de devolver y `qa-centro-calidad`.

export const MARCA_DEVOLUCION = "Devuelta por CTC: ";
const SEPARADOR = " · ";

/** Las notas de una fila devuelta, separadas: lo del Q-Grader y el (último) motivo de CTC. */
export function separaNotasDevueltas(notes: string | null | undefined): { notasQGrader: string; motivo: string | null } {
  const s = String(notes ?? "");
  const i = s.lastIndexOf(MARCA_DEVOLUCION);
  if (i < 0) return { notasQGrader: s.trim(), motivo: null };
  const antes = s.slice(0, i);
  const motivo = s.slice(i + MARCA_DEVOLUCION.length).trim() || null;
  // Lo de antes puede traer devoluciones anteriores: se quitan todas, solo quedan las notas del Q-Grader.
  const notasQGrader = antes
    .split(SEPARADOR)
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith(MARCA_DEVOLUCION))
    .join(SEPARADOR);
  return { notasQGrader, motivo };
}

/** Las notas que se guardan al devolver: las del Q-Grader más el motivo de CTC (formato que `separaNotasDevueltas` lee). */
export function notasAlDevolver(notasActuales: string | null | undefined, motivo: string): string {
  const { notasQGrader } = separaNotasDevueltas(notasActuales);
  return [notasQGrader, `${MARCA_DEVOLUCION}${motivo.trim()}`].filter(Boolean).join(SEPARADOR);
}
