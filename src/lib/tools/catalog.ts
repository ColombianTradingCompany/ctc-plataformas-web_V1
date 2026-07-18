// ── Las herramientas embebidas ───────────────────────────────────────────────
// Son páginas HTML/CSS/JS AUTOCONTENIDAS que se muestran dentro de un <iframe>.
// No se portan a React a propósito: son ~900 KB de HTML artesanal con su propio
// CSS y su propia lógica; reescribirlas sería mucho trabajo y la garantía de
// romper comportamiento sutil. Embebidas se ven y se comportan EXACTAMENTE igual
// que el archivo original, y el iframe además aísla su CSS del de la plataforma
// (ninguna de las dos hojas puede pisar a la otra).
//
// FUNCIONAN SIN INTERNET: scripts/vendor-tool-assets.mjs bajó a disco las
// tipografías y el CDN de Tailwind y reescribió los enlaces a rutas locales.
// Importa de verdad — la calculadora rápida sacaba TODO su CSS del CDN, así que
// una finca sin señal la veía sin un solo estilo.
//
// OJO: proxy.ts EXCLUYE /tools del matcher. Sin eso, en un subdominio
// (kaffetal-regal.ctcexport.com) la reescritura convertiría /tools/x.html en
// /kaffetal-regal/tools/x.html y daría 404.

export type ToolId = "agtron" | "mermas-rapida" | "mermas-detallada" | "qr";

export type ToolDef = {
  id: ToolId;
  /** De dónde se sirve. Las privadas pasan por un route handler autenticado. */
  src: string;
  /** Idioma en el que está escrita la herramienta (no se traduce su interior). */
  lang: "es" | "en";
};

export const TOOLS: Record<ToolId, ToolDef> = {
  agtron: { id: "agtron", src: "/tools/agtron-dial.html", lang: "en" },
  "mermas-rapida": { id: "mermas-rapida", src: "/tools/mermas-rapida.html", lang: "es" },
  "mermas-detallada": { id: "mermas-detallada", src: "/tools/mermas-detallada.html", lang: "es" },
  // Fuera de public/: solo se sirve con sesión de consola (ver privateTools.ts).
  qr: { id: "qr", src: "/ecp/herramientas/qr", lang: "en" },
};

// ── El reparto por superficie ────────────────────────────────────────────────
// El idioma decide, y coincide con la audiencia: las calculadoras de merma están
// escritas en español y son la matemática diaria del caficultor; el disco Agtron
// está en inglés y es EL instrumento del tostador. Cada superficie recibe lo que
// su gente de verdad usa, en el idioma en que lo va a leer.
/** Kaffetal Regal · "Herramientas Cafeteras" — el rendimiento de su cosecha. */
export const KR_TOOL_IDS: ToolId[] = ["mermas-rapida", "mermas-detallada"];
/** Cherry Picked · "Coffee Gadgets" — el color de tueste. */
export const CP_TOOL_IDS: ToolId[] = ["agtron"];
/** ECP · herramientas internas del equipo. */
export const ECP_TOOL_IDS: ToolId[] = ["qr"];
