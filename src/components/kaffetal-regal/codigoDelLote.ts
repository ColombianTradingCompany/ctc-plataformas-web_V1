// ── V6.23 (owner, 2026-11-06, TAR-149) · el código del lote en el panel del productor ───────────────────────────────────
// El código del lote ya no se deriva del id: es el GUARDADO (`lots.public_code`, que llega al panel como `Lot.codigo`) y lo asigna
// la base cuando el lote tiene finca. Un lote SIN finca no tiene código y no sale en ninguna lista pública («This Lot does not show
// up listed»), pero su dueño lo sigue viendo en su panel para completarlo: donde iría el código se le dice qué le falta.
// Módulo PURO (sin hooks ni `server-only`): lo usan la Ficha, las pestañas y el panel de mensajes.

/** Lo que ve el productor donde iría el código de un lote sin finca. */
export const SIN_CODIGO_LOTE = "Sin código: asígnele una finca";

/** El código del lote para el panel del productor: el guardado, o el aviso de que le falta la finca. Nunca lo calcula. */
export function codigoDelLote(codigo: string | null | undefined): string {
  const c = (codigo ?? "").trim();
  return c || SIN_CODIGO_LOTE;
}
