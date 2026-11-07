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
//    bolsa ya impresa), ni de `datasheet.ctc_uid` — ese identificador es privado
//    (estaba en `NUNCA_PUBLICOS` de la ficha pública que la V5.198 reemplazó por el
//    Dossier público), y un identificador privado que se vuelve público es una
//    puerta de un solo sentido. (La REFERENCIA de abajo es, desde la V6.23, el
//    código GUARDADO y jerárquico del lote, `lots.public_code`: ver su bloque.)
//
// Módulo PURO a propósito: sin `server-only`, sin imports. El formulario de
// «Find my Lot» es un componente de cliente y necesita importar
// `normalizaCodigo` como VALOR — la lección ya pagada de `atributosSca.ts`, que
// se separó de `sneakPeek.ts` justamente porque importar un valor desde un
// módulo `server-only` arrastra Supabase al navegador.

/** Crockford base32: sin I, L, O ni U — las cuatro que se confunden al leer una
 *  etiqueta. V6.23: la MISMA cadena está en `public.ctc_cuerpo_aleatorio()`, que es
 *  quien acuña los códigos CTC (`2026-11-07_codigos_ctc_a_ampliar.sql`); si una
 *  cambia sin la otra, la base acuña códigos que el normalizador rechaza. Lo vigila
 *  `qa-codigos-ctc-check.mjs`. (`ctc_public_code()` ya no acuña `CTCX-`.) */
export const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Cuántos caracteres de alfabeto lleva un código VIEJO `CTCX-` (V5.48), sin el prefijo ni los guiones. CONGELADO: no es el
 *  largo de la referencia de hoy (`LARGO_REFERENCIA`, abajo). */
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

/** `true` si la cadena YA está en la forma canónica exacta. Lo usaba la ruta para
 *  decidir si redirige: comparar contra `normalizaCodigo()` y no contra una
 *  expresión regular aparte evita que las dos reglas se separen.
 *  V5.199: desde que la dirección pública es la REFERENCIA (abajo) ninguna pantalla
 *  la llama; se conserva —con `rutaDelCodigo`— porque `qa-catalogo-publico` fija con
 *  ellas el contrato CONGELADO de las direcciones viejas `CTCX-…` (nota 2). */
export function esCanonico(entrada: string): boolean {
  return normalizaCodigo(entrada) === entrada;
}

/** La ruta del portal público. Cuelga de `www` y NO de un subdominio: el matcher
 *  de `src/proxy.ts` no excluye esta ruta, así que en cualquier host de
 *  subdominio se reescribiría y daría 404. **Todo enlace que salga de otra
 *  superficie tiene que ser ABSOLUTO** contra `origenDeSuperficie()` — es
 *  exactamente la trampa que ya se pagó con el botón de la ficha técnica.
 *
 *  Vive aquí, y no en `lib/red/subdominios.ts`, porque este módulo es PURO (sin
 *  imports, para que lo pueda usar un componente de cliente) y aquel es la
 *  fuente del mapa de la red. Los dos nombran la ruta y `qa-catalogo-publico`
 *  comprueba que digan lo mismo. */
export const RUTA_PORTAL = "/ctcx-public-catalogue";

/** La URL VIEJA de un lote por su código `CTCX-…` (la ruta la redirige a la referencia desde la V5.198). Ver `esCanonico`. */
export function rutaDelCodigo(codigo: string): string {
  return `${RUTA_PORTAL}/${codigo}`;
}

// ── V5.198 (owner, 2026-10-10) · la REFERENCIA del lote es su dirección pública ─────────────────────────────────────────
// «"Find my Lot" […] con la cual debo escribir solo los […] dígitos después de "CTC-L-"». La referencia es la dirección del lote en el
// portal y lo que va en el paquete de muestra, el Dossier y el OCP. Sigue valiendo la nota 1 de la cabecera: la referencia NO es una
// credencial — la vista `public_lot_vitrina` la expone a `anon`, y lo que se enseña con ella es lo que cualquiera puede ver.
//
// ── V6.23 (owner, 2026-11-06, TAR-149) · la referencia es el código GUARDADO y jerárquico ──────────────────────────────────
// Ya no se deriva del uuid (eso era la V5.100). Es `lots.public_code`: `CTC-L-` + los 5 caracteres de la finca + 4 al azar, en
// el alfabeto de arriba: 9 caracteres. Lo asigna la BASE (`codigos_ctc`, `docs/migraciones/2026-11-07_codigos_ctc_a_ampliar.sql`)
// y la aplicación NUNCA lo calcula ni lee en él una finca o un productor (un prefijo dice dónde NACIÓ el registro, no de quién es
// hoy). El owner: «the syntax is not public but the IDs are visible» — ninguna pantalla explica cómo se arma.
//
// LA SEGUNDA PUERTA (owner, punto 5 de TAR-149): los 3 lotes del catálogo Japan Pioneers, ya enviado a compradores, conservan su
// referencia VIEJA (8 hexadecimales) como una dirección que lleva (308) a la nueva, HASTA el 30.06.2027 incluido (hora de Bogotá).
// La fuente de verdad es el libro (`codigos_ctc.puerta_hasta`, que resuelve `lib/catalogo/vitrina.ts`); esta lista solo deja que el
// buscador, la marca de agua y el formulario la acepten al teclearla o al leerla de un PDF ya enviado. `qa-codigos-ctc-check` exige
// que diga lo mismo que la migración. Ninguna otra referencia vieja abre nada.

/** El prefijo de la referencia, fijo en el buscador: quien busca solo escribe lo que va detrás. */
export const PREFIJO_REFERENCIA = "CTC-L-";

/** Caracteres del código del lote, sin el prefijo (V6.23: 5 de la finca + 4 propios). */
export const LARGO_REFERENCIA = 9;

/** Caracteres de una referencia VIEJA (V5.100, hexadecimal). Solo las segundas puertas la usan. */
const LARGO_REFERENCIA_VIEJA = 8;

/** Las 3 referencias viejas con segunda puerta (TAR-149, punto 5). La MISMA lista y la misma fecha están en la migración. */
export const PUERTAS_DE_LEGADO = ["CTC-L-7E360302", "CTC-L-016DF280", "CTC-L-FDA6B795"] as const;

/** Último día (incluido, hora de Bogotá) en que las segundas puertas abren. Después, la Tarea de retiro las quita. */
export const PUERTA_HASTA = "2027-06-30";

/** Hoy en Bogotá, `AAAA-MM-DD` (las puertas cierran por fecha colombiana, no por la del servidor). */
export function hoyEnBogota(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** `true` si la cadena es una referencia VIEJA (`CTC-L-` + 8 hexadecimales), tenga o no puerta. */
export function esReferenciaVieja(referencia: string): boolean {
  return /^CTC-L-[0-9A-F]{8}$/.test(referencia);
}

/** `true` si es una de las 3 referencias viejas con segunda puerta y la puerta sigue abierta. */
export function esPuertaAbierta(referencia: string, ahora: Date = new Date()): boolean {
  return (PUERTAS_DE_LEGADO as readonly string[]).includes(referencia) && hoyEnBogota(ahora) <= PUERTA_HASTA;
}

/** `true` si la cadena YA es una referencia nueva canónica (`CTC-L-` + 9 del alfabeto). */
export function esReferencia(referencia: string): boolean {
  return new RegExp(`^CTC-L-[${ALFABETO}]{${LARGO_REFERENCIA}}$`).test(referencia);
}

/**
 * Lleva lo que teclearon (o lo que trae un enlace) a una referencia canónica, o `null`:
 *   · 9 caracteres → `CTC-L-XXXXXXXXX`, la referencia de hoy;
 *   · 8 hexadecimales → la referencia VIEJA, SOLO si es una de las 3 segundas puertas y sigue abierta (la ruta la redirige).
 * Perdona minúsculas, espacios, guiones, el prefijo escrito o ausente y las tres letras que se confunden con cifras (O, I, L);
 * no perdona longitudes (la ruta canoniza con un 308 permanente).
 */
export function normalizaReferencia(entrada: string, ahora: Date = new Date()): string | null {
  if (typeof entrada !== "string") return null;
  let limpio = entrada.toUpperCase().replace(/[^0-9A-Z]/g, "");
  // El prefijo se quita ANTES de leer los ambiguos: «CTCL» lleva una L que no es un uno. Ningún cuerpo empieza por «CTCL» (la L
  // no está en el alfabeto) y ningún productor recibe «CTC» (reservado en la migración).
  if (limpio.startsWith("CTCL") && (limpio.length === 4 + LARGO_REFERENCIA || limpio.length === 4 + LARGO_REFERENCIA_VIEJA)) {
    limpio = limpio.slice(4);
  }
  const cuerpo = [...limpio].map((c) => AMBIGUOS[c] ?? c).join("");
  if (cuerpo.length === LARGO_REFERENCIA) {
    // Un cuerpo que empieza por «CTC» no es de ningún lote (el prefijo de productor CTC está reservado): es otro código tecleado
    // en el buscador («CTC-F-…», «CTCX…»). Se rechaza aquí, en vez de canonizarlo con un 308 hacia una dirección que no existe.
    if (cuerpo.startsWith("CTC")) return null;
    return [...cuerpo].every((c) => EN_ALFABETO.has(c)) ? `${PREFIJO_REFERENCIA}${cuerpo}` : null;
  }
  if (cuerpo.length === LARGO_REFERENCIA_VIEJA && /^[0-9A-F]{8}$/.test(cuerpo)) {
    const vieja = `${PREFIJO_REFERENCIA}${cuerpo}`;
    return esPuertaAbierta(vieja, ahora) ? vieja : null;
  }
  return null;
}

/** Lo que queda en el campo de «Find my Lot» mientras se escribe: en mayúsculas, sin el prefijo si lo pegaron entero, sin guiones
 *  ni espacios y nunca más de 9 caracteres (el prefijo va FIJO delante del campo). */
export function cuerpoDeReferencia(entrada: string): string {
  return entrada
    .toUpperCase()
    .replace(/^\s*CTC[\s-]*L[\s-]*/, "")
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, LARGO_REFERENCIA);
}

/** La URL pública de un lote por su referencia (el Dossier público), relativa. Se absolutiza igual que `RUTA_PORTAL`. */
export function rutaDelLote(referencia: string): string {
  return `${RUTA_PORTAL}/${referencia}`;
}
