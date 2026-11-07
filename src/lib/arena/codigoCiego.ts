// ── El código CIEGO de la cata (V6.24 · TAR-149, punto 4, owner 2026-11-07) ──────────────────────────────────────────────
// «3 caps letters + 1 number (XXX#) "floating" code … the evaluator only sees the real one once the Lote has been evaluated
// (dado de alta)». El código ciego es el que va en la bolsa de la muestra que viaja al Centro de Calidad y el ÚNICO que ve el
// Q-Grader mientras cata. Lo emite la base (`ctc_codigo_ciego`, docs/migraciones/2026-11-08_codigo_ciego_flotante.sql) al azar, y
// queda en el libro `codigos_ctc` para siempre (tipo `ciego`): no se repite nunca. Es FLOTANTE: no identifica al lote, solo lo
// nombra en la cata, y una re-evaluación recibe otro. Al leer valen tres formas, porque hay bolsas impresas de cada época:
//   · el flotante (desde la V6.24);
//   · el QG- de la V6.23;
//   · el CTC-L- de 8 que llevan las bolsas de antes de la V6.23.
// Puro: lo leen el servidor (las acciones del Centro, la página) y el guardián. La forma del código no se explica en ninguna página
// pública (`qa-codigos-ctc-check` §5).

/** Las 22 letras del código flotante: el alfabeto Crockford sin sus cifras (sin I, L, O ni U). La MISMA cadena es `letras` en
 *  `ctc_codigo_ciego` (lo vigila `qa-codigos-ctc-check`). */
export const LETRAS_CIEGO = "ABCDEFGHJKMNPQRSTVWXYZ";

/** El código flotante de la V6.24. */
export const FORMATO_CIEGO_FLOTANTE = /^[A-HJKMNP-TV-Z]{3}[0-9]$/;

/** Lo que acepta `arena_inscriptions_codigo_ciego_formato`: el flotante, el QG- de la V6.23 y el CTC-L- + 8 de las bolsas de antes. */
export const FORMATO_CODIGO_CIEGO = /^(?:[A-HJKMNP-TV-Z]{3}[0-9]|QG-[0-9A-HJKMNP-TV-Z]{5}|CTC-L-[0-9A-F]{8})$/;

/** ¿Es un código ciego que la base pudo emitir (o conservar)? Tal cual se guarda: mayúsculas, sin espacios. */
export function esCodigoCiego(v: unknown): v is string {
  return typeof v === "string" && FORMATO_CODIGO_CIEGO.test(v);
}

/** ¿Es un código flotante de la V6.24? */
export function esCodigoFlotante(v: unknown): v is string {
  return typeof v === "string" && FORMATO_CIEGO_FLOTANTE.test(v);
}

// ── El código real después del alta ──────────────────────────────────────────────────────────────────────────────────────
// El panel del Centro enseña el código del lote (`lots.public_code`) junto al ciego SOLO cuando ESTE catador ya dio de alta ESA
// muestra y CTC ya decidió sobre esa alta (la confirmó o se la devolvió). Antes, el código real no se lee siquiera: la página pide a
// la base los códigos de los lotes que esta función devuelve, y de ningún otro. Un alta en espera de CTC todavía no lo enseña: el
// catador puede anularla y rehacerla, y lo que rehace sigue siendo a ciegas.

/** Los estados de un alta que enseñan el código del lote: confirmada o devuelta por CTC (lo devuelto se rehace con el lote ya
 *  conocido; el owner lo aceptó). Un alta en espera (`pending`) no cuenta: se puede anular, y la cata que la reemplace sigue a ciegas. */
export const ESTADOS_DE_ALTA: readonly string[] = ["accepted", "rejected"];

/** Una muestra del panel: su lote, el bache en que está y su código ciego de hoy. */
export type MuestraDelCentro = { lot_id: string; sondeo_batch_id: string | null; codigo_ciego: string | null };

/** Un alta tal como la lee el panel del Centro (`lot_evaluations`). */
export type AltaDelCentro = { lot_id: string; batch_id: string | null; status: string; submitted_by: string | null; uid_anonimo: string | null };

/**
 * ¿Tiene ESTA muestra un alta de ESTE catador sobre la que CTC ya decidió? El alta tiene que ser suya (`submitted_by`), del mismo
 * bache, con el código ciego de HOY (`uid_anonimo`) y confirmada o devuelta (`ESTADOS_DE_ALTA`): el alta de una evaluación anterior
 * del mismo lote llevaba otro código y no cuenta, y una en espera tampoco. Sin código ciego, sin bache o sin catador, nunca.
 */
export function altaPropia(m: MuestraDelCentro, altas: readonly AltaDelCentro[], catadorId: string): boolean {
  if (!m.codigo_ciego || !m.sondeo_batch_id || !catadorId) return false;
  return altas.some(
    (e) =>
      e.lot_id === m.lot_id &&
      e.batch_id === m.sondeo_batch_id &&
      e.submitted_by === catadorId &&
      e.uid_anonimo === m.codigo_ciego &&
      ESTADOS_DE_ALTA.includes(e.status)
  );
}

/** Los lotes cuyo código real puede leer la página: los de las muestras con un alta de este catador que CTC confirmó o devolvió. */
export function lotesConAlta(muestras: readonly MuestraDelCentro[], altas: readonly AltaDelCentro[], catadorId: string): string[] {
  return [...new Set(muestras.filter((m) => altaPropia(m, altas, catadorId)).map((m) => m.lot_id))];
}
