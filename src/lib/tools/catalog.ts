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

export type ToolId =
  | "agtron"
  | "mermas-rapida"
  | "mermas-detallada"
  | "qr"
  | "mermas-ctc"
  | "catacion"
  | "green-datasheet"
  | "formula-calidad"
  | "viaje-cafe"
  | "cogs-verde"
  | "costo-empaque";

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
  // 2026-07-24: el mecanismo de herramientas "privadas" (/ecp/herramientas/<key>,
  // HTML embebido) se RETIRÓ — el owner activó qr/formula-calidad/viaje-cafe para
  // Kaffetal Regal en Disponibilidad y una herramienta servida por la consola no
  // puede abrirse fuera de ella (404, segunda vez que pasa). Ahora TODAS viven en
  // public/tools/ y la tabla de Disponibilidad es el único control: no contienen
  // datos ni secretos — lo que se protege son las PÁGINAS, no los archivos.
  qr: { id: "qr", src: "/tools/generador-qr.html", lang: "en" },
  "formula-calidad": { id: "formula-calidad", src: "/tools/formula-calidad.html", lang: "es" },
  "viaje-cafe": { id: "viaje-cafe", src: "/tools/viaje-cafe.html", lang: "es" },
  // Públicas (public/tools/): se ofrecen a productores/compradores igual que las
  // calculadoras de merma y el Agtron. DEBEN ser públicas para funcionar en
  // Kaffetal Regal — una herramienta servida por /ecp/herramientas/ no se puede
  // abrir fuera de la consola (auth de ECP + la reescritura de subdominio de proxy.ts).
  "mermas-ctc": { id: "mermas-ctc", src: "/tools/mermas-ctc.html", lang: "es" },
  catacion: { id: "catacion", src: "/tools/rueda-catacion.html", lang: "es" },
  "green-datasheet": { id: "green-datasheet", src: "/tools/green-coffee-datasheet.html", lang: "en" },
  "cogs-verde": { id: "cogs-verde", src: "/tools/cogs-cafe-verde.html", lang: "es" },
  // Trae su propio conmutador ES/EN dentro; se marca "es" porque arranca en español.
  "costo-empaque": { id: "costo-empaque", src: "/tools/costo-empaque.html", lang: "es" },
};

/** Todas las herramientas, en el orden en que se listan en el panel interno. */
export const ALL_TOOL_IDS: ToolId[] = [
  "mermas-rapida",
  "mermas-detallada",
  "agtron",
  "mermas-ctc",
  "cogs-verde",
  "costo-empaque",
  "catacion",
  "green-datasheet",
  "qr",
  "formula-calidad",
  "viaje-cafe",
];

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
//   · el generador de QR nació interno pero el owner lo activó para KR (2026-07-24).
//
// DOS NIVELES (petición del owner): "default" la ve cualquiera con cuenta en esa
// superficie; "plus" solo quien tiene el estatus correspondiente (hoy:
// Pasaporte del Kaffetal Club en el lado productor, membresía en Cherry Picked).
export type ToolTier = "default" | "plus";
// "web" (V4 · Fase 4) = la superficie pública Herramientas del Café
// (herramientas.ctcexport.com). Ahí "default" lo ve el VISITANTE ANÓNIMO y
// "plus" cualquier cuenta de la plataforma con sesión — la identidad única de
// la red (la cookie viaja entre subdominios), no un login nuevo.
export type ToolSurface = "kr" | "cp" | "web" | "dc";

export type ToolSetting = {
  /** Visible en Kaffetal Regal. */
  kr: boolean;
  /** Visible en Cherry Picked. */
  cp: boolean;
  /** Visible en la superficie pública Herramientas del Café. */
  web: boolean;
  /** Visible en el Directorio del Café (pestaña Herramientas). */
  dc: boolean;
  tier: ToolTier;
};

export type ToolsConfig = Record<ToolId, ToolSetting>;

// Arranque de `web`: las calculadoras del día a día + la rueda + el Agtron se
// ofrecen al público; QR/fórmula/viaje/datasheet arrancan apagadas y el owner
// las enciende desde Disponibilidad si quiere.
export const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
  "mermas-rapida": { kr: true, cp: false, web: true, dc: false, tier: "default" },
  "mermas-detallada": { kr: true, cp: false, web: true, dc: false, tier: "default" },
  agtron: { kr: true, cp: true, web: true, dc: false, tier: "default" },
  // Internas del equipo: no se ofrecen en ninguna superficie pública.
  qr: { kr: false, cp: false, web: false, dc: false, tier: "plus" },
  "formula-calidad": { kr: false, cp: false, web: false, dc: false, tier: "default" },
  "viaje-cafe": { kr: false, cp: false, web: false, dc: false, tier: "default" },
  // Herramientas de trabajo del productor (como las de merma): visibles en KR.
  // El owner ajusta superficie/nivel desde Disponibilidad.
  "mermas-ctc": { kr: true, cp: false, web: true, dc: false, tier: "default" },
  catacion: { kr: true, cp: false, web: true, dc: false, tier: "default" },
  "green-datasheet": { kr: true, cp: false, web: false, dc: false, tier: "default" },
  // CoGS de café verde: la cuenta de costos hasta la cotización EXW/FOB/CIF.
  // Arranca como Plus (petición del owner, 2026-08-04); superficie/nivel se
  // ajustan desde Disponibilidad.
  "cogs-verde": { kr: true, cp: false, web: true, dc: false, tier: "plus" },
  // Costo de empaque por kilo: cuenta de taller del productor que empaca, con la
  // oferta de proveedores de 2026 dentro. Nivel normal (el owner no pidió Plus).
  // `web` ARRANCA APAGADA a propósito: hoy la superficie pública solo ofrece el
  // disco Agtron (tools_config, 2026-08-06) — una herramienta nueva no debe
  // publicarse sola al visitante anónimo. Se enciende desde Disponibilidad.
  "costo-empaque": { kr: true, cp: false, web: false, dc: false, tier: "default" },
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
