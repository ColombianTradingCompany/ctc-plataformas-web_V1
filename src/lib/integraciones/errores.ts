// ── Integraciones · los códigos de error ─────────────────────────────────────
// `integration_events.ultimo_error` guarda UN CÓDIGO de esta lista cerrada y
// nada más. Nunca el `.message` de una excepción, nunca el `detalle` de un
// manejador, nunca una url.
//
// Por qué (S0, 2026-10-23): un valor secreto que estaba mal puesto en
// `MAKE_WEBHOOK_URL` hizo fallar el `fetch`, el mensaje de la excepción lo
// llevaba dentro, el despachador guardó ese mensaje y el tablero de
// Automatizaciones lo enseñó entero. Un campo de error libre es un sitio donde
// cualquier valor de entrada puede acabar a la vista. Con códigos, lo peor que
// se ve es «url_invalida».
//
// Este módulo es PURO (sin `server-only`, sin base de datos) para que el
// guardián `qa-integraciones-check` lo importe tal cual.

/** Lo que el despachador (salida) puede anotar. Además: `http_<3 dígitos>` y `excepcion:<Clase>`. */
export const CODIGOS_SALIDA = ["url_ausente", "url_invalida", "secreto_ausente", "timeout", "red"] as const;
/** Lo que un evento entrante (`aplicar.ts`) puede anotar. */
export const CODIGOS_ENTRADA = ["falta_campo", "ref_no_reconocido", "nota_demasiado_larga", "url_no_https", "error_bd", "excepcion"] as const;
export const CODIGOS = [...CODIGOS_SALIDA, ...CODIGOS_ENTRADA] as const;

export type CodigoSalida = (typeof CODIGOS_SALIDA)[number];
export type CodigoEntrada = (typeof CODIGOS_ENTRADA)[number];

const FIJOS = new Set<string>(CODIGOS);

/** ¿Es un código de la lista? Es una lista EXACTA a propósito, nunca una clase de
 *  caracteres: un token de 64 hex pasaría `^[A-Za-z0-9_.:-]{1,64}$`. */
export function esCodigo(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 64) return false;
  return FIJOS.has(v) || /^http_\d{3}$/.test(v) || /^excepcion:[A-Za-z]{1,40}$/.test(v);
}

/** El webhook de salida tiene que ser `https:` y de Make. Cualquier otra cosa no
 *  se llama: así un valor equivocado en la variable nunca viaja a otro sitio. */
export function validarWebhook(
  url: string | undefined
): { ok: true; url: string } | { ok: false; codigo: "url_ausente" | "url_invalida" } {
  if (!url) return { ok: false, codigo: "url_ausente" };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, codigo: "url_invalida" };
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || !(host === "make.com" || host.endsWith(".make.com"))) {
    return { ok: false, codigo: "url_invalida" };
  }
  return { ok: true, url: u.toString() };
}

/** El código de una respuesta HTTP que no fue 2xx. */
export function codigoHttp(status: number): string {
  const c = `http_${status}`;
  return esCodigo(c) ? c : "excepcion";
}

/** Convierte una excepción en código. Solo mira `e.name`, y solo si son letras:
 *  NUNCA construye nada a partir de `.message`. */
export function limpiarError(e: unknown): string {
  const name = e && typeof e === "object" && "name" in e ? (e as { name: unknown }).name : null;
  if (name === "TimeoutError" || name === "AbortError") return "timeout";
  // `fetch` de Node señala un fallo de red con TypeError («fetch failed»).
  if (name === "TypeError") return "red";
  if (typeof name === "string" && /^[A-Za-z]{1,40}$/.test(name)) return `excepcion:${name}`;
  return "excepcion";
}

/** Para el tablero: lo que no sea código no sale del servidor. */
export function errorParaMostrar(v: string | null): string | null {
  if (v == null) return null;
  return esCodigo(v) ? v : "texto retirado";
}
