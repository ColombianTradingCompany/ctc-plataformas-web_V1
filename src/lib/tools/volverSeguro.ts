// ── La vuelta segura de la concha de herramientas ───────────────────────────
// Módulo PURO — lo comprueba un guardián sin levantar nada.
//
// EL REQUISITO DEL OWNER (A5, subrayado por él): «las herramientas tienen que
// funcionar DENTRO de la webapp, con botones seguros que le permitan al usuario
// volver a lo que estaba haciendo». No a la portada: a lo que estaba haciendo.
// Por eso la concha recibe la URL del panel de origen y vuelve ahí.
//
// ⚠️ Y POR ESO MISMO HAY QUE VALIDARLA. Un `?volver=` que se obedezca a ciegas
// es un REDIRECT ABIERTO: basta mandarle a alguien
// `…/herramientas/agtron?volver=https://sitio-falso/login` para que la
// plataforma le ponga un botón «Volver a Kaffetal Regal» que lleva a una copia
// del login. Es phishing con el dominio de CTC delante, y no falla nada.
//
// La regla es de lista blanca y deliberadamente estrecha: solo rutas RELATIVAS
// de la superficie que abrió la herramienta. Cualquier otra cosa cae al inicio
// de esa superficie, que siempre es un destino válido.

// "herramientas" (A8/A11, 2026-08-19): la superficie propia — el taller de
// herramientas.ctcexport.com — abre las herramientas DENTRO, igual que KR y CP.
export type SuperficieHerramientas = "kaffetal-regal" | "cherry-picked-green" | "herramientas";

/** El inicio de cada superficie. Es el destino cuando no hay vuelta fiable. */
export const INICIO: Record<SuperficieHerramientas, string> = {
  "kaffetal-regal": "/kaffetal-regal",
  "cherry-picked-green": "/cherry-picked-green",
  herramientas: "/herramientas",
};

export const NOMBRE_SUPERFICIE: Record<SuperficieHerramientas, string> = {
  "kaffetal-regal": "Kaffetal Regal",
  "cherry-picked-green": "Cherry Picked",
  herramientas: "Herramientas del Café",
};

/**
 * La URL a la que puede volver el botón, saneada.
 *
 * Se acepta SOLO si:
 *   · es una ruta relativa que empieza por una sola `/`  — nada de `//host`,
 *     que el navegador trata como absoluta hacia otro dominio;
 *   · cae dentro de la superficie que abrió la herramienta;
 *   · no trae `\` ni saltos de línea (trucos clásicos para colar un host).
 *
 * Cualquier otra cosa devuelve el inicio de la superficie. Nunca `null`: el
 * botón de volver SIEMPRE tiene destino, porque una concha sin salida es
 * justo lo que el owner pidió evitar.
 */
export function vueltaSegura(volver: string | null | undefined, superficie: SuperficieHerramientas): string {
  const inicio = INICIO[superficie];
  if (!volver) return inicio;

  const v = volver.trim();
  if (!v.startsWith("/")) return inicio; // absoluta, esquema raro, o relativa suelta
  if (v.startsWith("//")) return inicio; // `//otro-host` es absoluta para el navegador
  if (/[\\\n\r\t]/.test(v)) return inicio;
  if (v.includes("://")) return inicio;

  // Frontera de SEGMENTO, no prefijo de cadena: `/kaffetal-regal-falso` no
  // puede colarse por empezar igual. Misma lección que el proxy y el rail.
  if (v !== inicio && !v.startsWith(inicio + "/") && !v.startsWith(inicio + "?")) return inicio;

  return v;
}

/** La ruta de una herramienta dentro de su superficie. */
export function rutaHerramienta(superficie: SuperficieHerramientas, slug: string, volver?: string): string {
  const base = `${INICIO[superficie]}/herramientas/${slug}`;
  return volver ? `${base}?volver=${encodeURIComponent(volver)}` : base;
}
