// El CÓDIGO PÚBLICO del lote — la fuente única del identificador tecleable
// (V5.48, mitad delantera de la tanda CN-7 del plan de narrativa).
//
// POR QUÉ EXISTE. «Find my Lot» (/ctcx-public-catalogue) pide un código corto
// que alguien pueda leer de una bolsa y teclear. Hasta hoy había DOS códigos
// para el mismo lote, derivados y contradictorios:
//
//   · `codigoDeLote(lot_id, grade)`  en `lib/catalogo/sneakPeek.ts`  → «GD-A1B2»
//   · `listingCode(lot_listings.id, grade)` en `cherry-picked/data.ts` → «GD-7F3C»
//
// Dos superficies enseñando cadenas distintas del mismo café. Este módulo, con
// la columna `lots.public_code` que lo respalda, es lo que las reemplaza; la
// migración del lado de la base es `lots_codigo_publico`.
//
// ── TRES COSAS QUE EL SIGUIENTE BARRIDO TIENE QUE LEER AQUÍ ─────────────────
//
// 1. EL CÓDIGO NO ES UNA CREDENCIAL, y no puede convertirse en una.
//    `public_lot_catalog` tiene `select` para `anon`, y la clave anónima viaja
//    en el bundle del navegador: una sola petición
//    `GET /rest/v1/public_lot_catalog?select=public_code,name` devuelve el
//    catálogo publicado ENTERO con sus códigos. Buscar por fuerza bruta en
//    32⁸ ≈ 1,1·10¹² es irrelevante cuando el listado está abierto. «Find my
//    Lot» es un índice de conveniencia — jamás un control de acceso. Si algún
//    día alguien razona «este código solo lo tiene quien compró el lote» y
//    construye una puerta encima, esa puerta nace abierta.
//
// 2. EL MAPEO DE AMBIGUOS ESTÁ CONGELADO. `/ctcx-public-catalogue/[codigo]`
//    responde 308 (permanente, y el navegador lo cachea para siempre) desde
//    cualquier forma no canónica hacia la canónica. Cambiar este mapeo mañana
//    re-apunta redirecciones ya emitidas y ya cacheadas. Si hace falta tocarlo,
//    es una migración de URLs, no un arreglo.
//
// 3. NO SE DERIVA DE NADA. El código es aleatorio y vive en su columna. No sale
//    de `lot_id` (sería otro `codigoDeLote` con otra cara), ni de
//    `lot_listings.id` (un lote republicado estrenaría código y rompería la
//    bolsa ya impresa), ni de `datasheet.ctc_uid` — ese identificador está en
//    `NUNCA_PUBLICOS` de `fichaPublica.ts`, y un identificador privado que se
//    vuelve público es una puerta de un solo sentido.
//
// Módulo PURO a propósito: sin `server-only`, sin imports. El formulario de
// «Find my Lot» es un componente de cliente y necesita importar
// `normalizaCodigo` como VALOR — la lección ya pagada de `atributosSca.ts`, que
// se separó de `sneakPeek.ts` justamente porque importar un valor desde un
// módulo `server-only` arrastra Supabase al navegador.

/** Crockford base32: sin I, L, O ni U — las cuatro que se confunden al leer una
 *  etiqueta. La MISMA cadena está en `public.ctc_public_code()`, que es quien
 *  acuña; si una cambia sin la otra, el generador produce códigos que el
 *  normalizador rechaza. Lo vigila `qa-catalogo-publico-check.mjs`. */
export const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Cuántos caracteres de alfabeto lleva un código, sin el prefijo ni los guiones. */
export const LARGO_CUERPO = 8;

const PREFIJO = "CTCX";

/** Lo que alguien teclea mirando una bolsa mal impresa, y lo que quiso decir.
 *  Ninguno de los tres está en el alfabeto, así que el mapeo nunca puede tapar
 *  un carácter legítimo. CONGELADO — ver la nota 2 de la cabecera. */
const AMBIGUOS: Record<string, string> = { O: "0", I: "1", L: "1" };

const EN_ALFABETO = new Set(ALFABETO.split(""));

/**
 * Lleva lo que sea que teclearon a la forma canónica `CTCX-XXXX-XXXX`, o
 * devuelve `null` si no es un código.
 *
 * Perdona lo que un humano hace de verdad: minúsculas, espacios, guiones de
 * más o de menos, el prefijo escrito o ausente, y las tres letras que se
 * confunden con cifras. No perdona longitudes: un código no es «lo que se
 * parezca», porque la ruta que lo recibe redirige con un 308 permanente.
 */
export function normalizaCodigo(entrada: string): string | null {
  if (typeof entrada !== "string") return null;

  // Fuera todo lo que no sea letra o cifra: guiones, espacios, puntos, y el
  // carácter invisible que a veces acompaña a un pegado desde WhatsApp.
  let limpio = entrada.toUpperCase().replace(/[^0-9A-Z]/g, "");

  // El prefijo es opcional al teclear («A1B2-C3D4» vale), pero solo cuenta si
  // lo que queda tiene el largo justo — así «CTCXCTCX» no se come a sí mismo.
  if (limpio.startsWith(PREFIJO) && limpio.length === PREFIJO.length + LARGO_CUERPO) {
    limpio = limpio.slice(PREFIJO.length);
  }

  if (limpio.length !== LARGO_CUERPO) return null;

  let cuerpo = "";
  for (const c of limpio) {
    const ch = AMBIGUOS[c] ?? c;
    if (!EN_ALFABETO.has(ch)) return null;
    cuerpo += ch;
  }

  return `${PREFIJO}-${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}`;
}

/** `true` si la cadena YA está en la forma canónica exacta. Lo usa la ruta para
 *  decidir si redirige: comparar contra `normalizaCodigo()` y no contra una
 *  expresión regular aparte evita que las dos reglas se separen. */
export function esCanonico(entrada: string): boolean {
  return normalizaCodigo(entrada) === entrada;
}

/** La URL pública de un lote, relativa. Cuelga de `www` y NO de un subdominio:
 *  el matcher de `src/proxy.ts` no excluye esta ruta, así que en cualquier host
 *  de subdominio se reescribiría y daría 404. Todo enlace que salga de otra
 *  superficie tiene que ser ABSOLUTO contra `WWW_ORIGIN`. */
export function rutaDelCodigo(codigo: string): string {
  return `/ctcx-public-catalogue/${codigo}`;
}
