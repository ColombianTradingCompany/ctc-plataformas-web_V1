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

/** Todas las herramientas, en el orden en que se listan en el panel interno. */
export const ALL_TOOL_IDS: ToolId[] = ["mermas-rapida", "mermas-detallada", "agtron", "qr"];

// ── El reparto por superficie, ahora CONFIGURABLE ────────────────────────────
// Antes eran tres listas fijas en este archivo. Desde 2026-07-20 el reparto se
// administra desde la consola interna (Herramientas → Disponibilidad) y vive en
// platform_settings.tools_config; lo de aquí abajo es solo el ARRANQUE, que
// reproduce exactamente el reparto que había:
//   · las calculadoras de merma son la matemática diaria del CAFICULTOR (y
//     están en español) ⇒ solo Kaffetal Regal;
//   · el disco Agtron va en LAS DOS: es el instrumento del tostador, pero
//     también el idioma con el que el comprador le hablará al productor de su
//     tueste — por eso el productor necesita poder mirarlo;
//   · el generador de QR es interno (no se sirve desde public/, ver privateTools).
//
// DOS NIVELES (petición del owner): "default" la ve cualquiera con cuenta en esa
// superficie; "plus" solo quien tiene el estatus correspondiente (hoy:
// Pasaporte del Kaffetal Club en el lado productor, membresía en Cherry Picked).
export type ToolTier = "default" | "plus";
export type ToolSurface = "kr" | "cp";

export type ToolSetting = {
  /** Visible en Kaffetal Regal. */
  kr: boolean;
  /** Visible en Cherry Picked. */
  cp: boolean;
  tier: ToolTier;
};

export type ToolsConfig = Record<ToolId, ToolSetting>;

export const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
  "mermas-rapida": { kr: true, cp: false, tier: "default" },
  "mermas-detallada": { kr: true, cp: false, tier: "default" },
  agtron: { kr: true, cp: true, tier: "default" },
  // Interna: no se ofrece en ninguna superficie pública.
  qr: { kr: false, cp: false, tier: "plus" },
};

/** Merge sobre el arranque: una herramienta nueva nunca queda sin configuración. */
export function toToolsConfig(raw: unknown): ToolsConfig {
  const stored = (raw ?? {}) as Partial<Record<ToolId, Partial<ToolSetting>>>;
  const out = {} as ToolsConfig;
  for (const id of ALL_TOOL_IDS) {
    out[id] = { ...DEFAULT_TOOLS_CONFIG[id], ...(stored[id] ?? {}) };
  }
  return out;
}

/** Las herramientas visibles en una superficie para una audiencia dada. */
export function toolsForSurface(config: ToolsConfig, surface: ToolSurface, isPlus: boolean): ToolId[] {
  return ALL_TOOL_IDS.filter((id) => config[id][surface] && (config[id].tier === "default" || isPlus));
}

/** Las que existen en la superficie pero están reservadas al nivel Plus. */
export function plusOnlyForSurface(config: ToolsConfig, surface: ToolSurface): ToolId[] {
  return ALL_TOOL_IDS.filter((id) => config[id][surface] && config[id].tier === "plus");
}
