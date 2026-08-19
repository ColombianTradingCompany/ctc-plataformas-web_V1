// ── El registro de herramientas ──────────────────────────────────────────────
// Son páginas HTML/CSS/JS AUTOCONTENIDAS que se muestran dentro de un <iframe>.
// No se portan a React a propósito: son ~900 KB de HTML artesanal con su propio
// CSS y su propia lógica; reescribirlas sería mucho trabajo y la garantía de
// romper comportamiento sutil. Embebidas se ven y se comportan EXACTAMENTE igual
// que el archivo original, y el iframe además aísla su CSS del de la plataforma
// (ninguna de las dos hojas puede pisar a la otra).
//
// ⚠️ ESTE ARCHIVO YA NO ES LA FUENTE DE VERDAD (2026-08-15). Antes tenía dentro
// el union `ToolId`, el mapa `TOOLS` con la ruta de cada una y
// `DEFAULT_TOOLS_CONFIG` con el reparto; añadir una herramienta era un deploy y
// cambiar su reparto, otro. Ahora el registro vive en la tabla `tools` y el
// historial en `tool_versions`, para que el ECP pueda SUBIR una versión nueva y
// publicarla sin tocar el repositorio. Aquí quedan solo los tipos y las
// funciones PURAS que las dos orillas comparten — sin `server-only`, para que un
// guardián de QA pueda importarlas con `--experimental-strip-types`.
//
// Lo que NO cambió y sigue mandando:
//   · proxy.ts EXCLUYE `/tools` de su matcher. Sin eso, en un subdominio
//     (kaffetal-regal.ctcexport.com) la reescritura convertiría /tools/x.html en
//     /kaffetal-regal/tools/x.html y daría 404. Es también la razón de que el
//     route handler de las versiones subidas cuelgue de /tools y no de /ecp:
//     ése fue exactamente el error que retiró el mecanismo «privado» anterior.
//   · FUNCIONAN SIN INTERNET: scripts/vendor-tool-assets.mjs bajó a disco las
//     tipografías y el CDN de Tailwind y reescribió los enlaces a rutas locales
//     bajo /tools/assets/. Esa carpeta se queda en public/ pase lo que pase con
//     los HTML: las versiones subidas también apuntan ahí.

/** El identificador de una herramienta. Es un slug LIBRE, no un union cerrado:
 *  desde que se pueden subir herramientas por el panel, el conjunto no se
 *  conoce en tiempo de compilación. */
export type ToolId = string;

/** Dónde se puede ofrecer una herramienta.
 *  "web" (V4 · Fase 4) = la superficie pública Herramientas del Café
 *  (herramientas.ctcexport.com). Ahí "default" lo ve el VISITANTE ANÓNIMO y
 *  "plus" cualquier cuenta de la plataforma con sesión — la identidad única de
 *  la red (la cookie viaja entre subdominios), no un login nuevo. */
export type ToolSurface = "kr" | "cp" | "web" | "dc";

/** DOS NIVELES: "default" la ve cualquiera con cuenta en esa superficie; "plus"
 *  solo quien tiene el estatus. Plus es una ACTIVACIÓN explícita que el ECP
 *  concede (tools_plus_grants), no algo derivado — ver plusGrants.ts. */
export type ToolTier = "default" | "plus";

/** La CLASE de una herramienta (owner, 2026-08-15).
 *
 *  `interna`     — solo para CTC. No se lista en ninguna superficie y su archivo
 *                  solo se sirve a una sesión de consola interna.
 *  `compartible` — se puede ofrecer a productores, compradores y al público.
 *
 *  ⚠️ La clase NO es una etiqueta cosmética, y el guardián `guard_tools_clase`
 *  en la base lo impone: una herramienta cuya versión publicada vive en
 *  `public/tools/` NO puede ser interna, porque ese fichero lo sirve el CDN sin
 *  pasar por la aplicación y ninguna compuerta puede cubrirlo. Para volverla
 *  interna hay que subir una versión por el panel primero. Es la lección de la
 *  gotcha 12 —el mecanismo «privado» anterior protegía la PÁGINA y dejaba el
 *  ARCHIVO abierto— convertida en invariante de la base. */
export type ToolClase = "interna" | "compartible";

/** De dónde sale el archivo de una versión.
 *
 *  `repo`   — un fichero de `public/tools/`. Estático, servido por el CDN,
 *             URL pública e indexable. Es la versión 1 de las que ya existían.
 *  `subida` — subido por el ECP; vive en Storage y lo sirve el route handler
 *             `/tools/h/<slug>`. Es la única que admite compuerta. */
export type VersionOrigen = "repo" | "subida";

export type ToolVersion = {
  id: string;
  numero: number;
  origen: VersionOrigen;
  /** Solo cuando `origen === "repo"`. */
  srcPublico: string | null;
  /** Solo cuando `origen === "subida"`. */
  storagePath: string | null;
  bytes: number | null;
  notas: string;
  subidoAt: string;
  subidoPor: string | null;
};

/** Una herramienta tal y como la ve una SUPERFICIE: ya resuelta, sin nada que
 *  buscar en un diccionario aparte. */
export type ToolPublico = {
  id: ToolId;
  nombre: string;
  descripcion: string;
  lang: "es" | "en";
  /** La URL que va en el `src` del iframe, ya resuelta. */
  src: string;
  /** Agrupa variantes bajo UNA tarjeta (hoy: "mermas"). Null = va sola. */
  familia: string | null;
};

/** La herramienta completa, como la ve la consola interna. */
export type ToolAdmin = ToolPublico & {
  clase: ToolClase;
  tier: ToolTier;
  kr: boolean;
  cp: boolean;
  web: boolean;
  dc: boolean;
  orden: number;
  metaDescription: string | null;
  archivada: boolean;
  /** true = la versión publicada habla el puente de trabajos (A11). */
  soportaMemoria: boolean;
  /** Qué es y cómo funciona — el acordeón del Home Menu (V5.7). */
  guia: string | null;
  versionPublicadaId: string | null;
  versiones: ToolVersion[];
};

/** La URL con la que se sirve una versión SUBIDA. Vive bajo `/tools` a
 *  propósito: ese prefijo está excluido del matcher del proxy, así que la misma
 *  URL funciona en los 18 subdominios sin que la reescritura la rompa. */
export function srcDeVersionSubida(id: ToolId): string {
  return `/tools/h/${id}`;
}

/** Resuelve el `src` del iframe para la versión publicada de una herramienta.
 *  Pura: la usan el servidor, el cliente y el guardián de QA. */
export function srcDeVersion(id: ToolId, v: Pick<ToolVersion, "origen" | "srcPublico"> | null): string | null {
  if (!v) return null;
  return v.origen === "repo" ? v.srcPublico : srcDeVersionSubida(id);
}

/** ¿Esta herramienta se puede ofrecer en esta superficie a esta audiencia?
 *  Una `interna` nunca — el guardián de la base ya le apaga las superficies,
 *  y esto es la segunda vuelta de la misma regla en el lado del código. */
export function seOfreceEn(
  t: Pick<ToolAdmin, "clase" | "tier" | "kr" | "cp" | "web" | "dc" | "archivada">,
  surface: ToolSurface,
  isPlus: boolean
): boolean {
  if (t.clase === "interna" || t.archivada) return false;
  if (!t[surface]) return false;
  return t.tier === "default" || isPlus;
}

/** El límite de una subida. Las que ya existen van de 33 KB a 3 MB (el viaje del
 *  café), así que 8 MB deja margen sin abrir la puerta a que alguien empuje un
 *  video dentro de un HTML. */
export const MAX_TOOL_MB = 8;

/** Lo que se acepta subir. Una herramienta es UN html autocontenido: sus
 *  tipografías y librerías ya están vendorizadas bajo /tools/assets/. */
export const TOOL_ACCEPT = ".html,.htm";
