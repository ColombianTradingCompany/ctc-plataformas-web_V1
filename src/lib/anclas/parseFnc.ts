// ── Anclas de mercado · el parseo del precio FNC ─────────────────────────────
// PURO a propósito y sin `server-only`: es la pieza que puede fallar en silencio
// —si la Federación cambia el formato y esto devuelve un número que no es el
// precio, el cron lo anota igual y las calculadoras cotizan con él— así que
// tiene que poder probarse desde node. Guardián: scripts/qa-anclas-check.mjs.

/** Suelo y techo de cordura: el precio interno por carga de 125 kg lleva años
 *  entre uno y cuatro millones. Fuera de eso, lo leído no es el precio. */
export const MIN_COP = 1_000_000;
export const MAX_COP = 4_000_000;

/** Saca el precio de carga del HTML. Devuelve null si no lo reconoce — es
 *  preferible un hueco en la serie a un número inventado. */
export function parseFncPrice(html: string | null | undefined): number | null {
  if (!html) return null;
  const txt = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  // Números con separador de miles que estén CERCA de la palabra "carga": la
  // página publica también precios por libra y por kilo.
  const candidates: number[] = [];
  const re = /\$?\s?(\d{1,3}(?:[.,]\d{3}){1,3})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt)) !== null) {
    const n = parseInt(m[1].replace(/[.,]/g, ""), 10);
    if (!Number.isFinite(n) || n < MIN_COP || n > MAX_COP) continue;
    const around = txt.slice(Math.max(0, m.index - 120), m.index + 120).toLowerCase();
    if (around.includes("carga")) candidates.push(n);
  }
  if (candidates.length === 0) return null;
  // Si hay varios, el mayor suele ser el precio de compra base del día.
  return Math.max(...candidates);
}
