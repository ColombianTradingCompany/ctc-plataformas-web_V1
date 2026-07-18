// ── Las herramientas embebidas ───────────────────────────────────────────────
// Son páginas HTML/CSS/JS AUTOCONTENIDAS que viven en public/tools/ y se muestran
// dentro de un <iframe>. No se portan a React a propósito: son ~900 KB de HTML
// artesanal con su propio CSS y su propia lógica; reescribirlas sería mucho
// trabajo y la garantía de romper comportamiento sutil. Embebidas se ven y se
// comportan EXACTAMENTE igual que el archivo original, y el iframe además aísla
// su CSS del de la plataforma (ninguna de las dos hojas puede pisar a la otra).
//
// OJO: proxy.ts EXCLUYE /tools del matcher. Sin eso, en un subdominio
// (kaffetal-regal.ctcexport.com) la reescritura convertiría /tools/x.html en
// /kaffetal-regal/tools/x.html y daría 404.

export type ToolId = "agtron" | "mermas-rapida" | "mermas-detallada" | "qr";

export type ToolDef = {
  id: ToolId;
  /** Ruta pública del archivo dentro de public/tools/. */
  src: string;
  /** Idioma en el que está escrita la herramienta (no se traduce su interior). */
  lang: "es" | "en";
};

export const TOOLS: Record<ToolId, ToolDef> = {
  agtron: { id: "agtron", src: "/tools/agtron-dial.html", lang: "en" },
  "mermas-rapida": { id: "mermas-rapida", src: "/tools/mermas-rapida.html", lang: "es" },
  "mermas-detallada": { id: "mermas-detallada", src: "/tools/mermas-detallada.html", lang: "es" },
  qr: { id: "qr", src: "/tools/generador-qr.html", lang: "en" },
};

/** Las que se ofrecen al productor (KR) y al tostador (CP). */
export const COFFEE_TOOL_IDS: ToolId[] = ["mermas-rapida", "mermas-detallada", "agtron"];
/** Las internas de la consola de dirección. */
export const ECP_TOOL_IDS: ToolId[] = ["qr"];
