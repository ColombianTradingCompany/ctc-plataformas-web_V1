// ── Interfaz de Leads · el REGISTRO de formularios (V6.2) — PURO ──────────────────────────────────────────────────────────────
// Cada formulario de captación de la casa es una entrada aquí (su página, su etiqueta en la cabecera de CTC Home, sus idiomas y sus
// textos) y una fila en `lead_forms` (si está ENCENDIDO y su configuración: lo que el owner cambia sin desplegar). Un formulario nuevo
// es: una carpeta con su `textos.json`, una entrada en `FORMULARIOS`, una página `src/app/<ruta>/page.tsx` de tres líneas y una fila
// en la base (la consola la crea si falta: `asegurarFormularios`).
//
// Los textos viven en JSON a propósito (el owner, sobre el japonés: «déjalo fácil de corregir sin tocar el código»).

import { IDIOMAS, type IdiomaDeFormulario } from "./campos";
// `with { type: "json" }`: lo exige Node al correr el guardián con --experimental-strip-types; Next y TypeScript lo aceptan igual.
import textosScaj2026 from "./scaj2026/textos.json" with { type: "json" };

export type TextosDeIdioma = { ui: Record<string, string>; options: Record<string, Record<string, string>> };
export type TextosDeFormulario = Record<IdiomaDeFormulario, TextosDeIdioma>;

export type DefinicionDeFormulario = {
  key: string;
  nombre: string;
  ruta: string;
  etiquetaCabecera: string;
  idiomas: readonly IdiomaDeFormulario[];
  textos: TextosDeFormulario;
};

const aTextos = (raw: Record<string, unknown>): TextosDeFormulario =>
  Object.fromEntries(IDIOMAS.map((l) => [l, raw[l] as TextosDeIdioma])) as TextosDeFormulario;

export const FORMULARIOS: Record<string, DefinicionDeFormulario> = {
  scaj2026: {
    key: "scaj2026",
    nombre: "SCAJ 2026 · Tokio",
    ruta: "/scaj2026",
    etiquetaCabecera: "SCAJ2026",
    idiomas: IDIOMAS,
    textos: aTextos(textosScaj2026 as unknown as Record<string, unknown>),
  },
};

export function formulario(key: string | null | undefined): DefinicionDeFormulario | null {
  return key && Object.prototype.hasOwnProperty.call(FORMULARIOS, key) ? FORMULARIOS[key] : null;
}

/** Lo que el owner configura desde la LCP sin desplegar (jsonb `lead_forms.config`), con sus valores por defecto. */
export type ConfigDeFormulario = {
  /** ¿Sale el correo inmediato al guardar el lead? Nace apagado: el owner aprueba los textos y lo enciende. */
  correo_inmediato: boolean;
  /** ¿Sale el seguimiento a los `seguimiento_dias`? Nace apagado. */
  seguimiento: boolean;
  seguimiento_dias: number;
  /** Mientras el japonés de los correos no tenga revisión nativa, quien llenó en japonés recibe el correo en inglés. */
  ja_correo_en: boolean;
  /** El enlace de agenda para la videollamada (vacío: se le pide al lead que proponga dos horarios). */
  agenda_url: string;
  /** El aviso de privacidad que enlaza el consentimiento (relativo al sitio o absoluto). */
  privacy_url: string;
  /** A dónde llegan las respuestas (Reply-To). */
  reply_to: string;
  /** Quién firma (nombre y cargo); vacío: firma la casa. */
  firma: string;
};

export const CONFIG_POR_DEFECTO: ConfigDeFormulario = {
  correo_inmediato: false,
  seguimiento: false,
  seguimiento_dias: 7,
  ja_correo_en: true,
  agenda_url: "",
  privacy_url: "",
  reply_to: "info@ctcexport.com",
  firma: "",
};

const esUrl = (s: string) => /^(https?:\/\/[^\s]+|\/[^\s]*)$/.test(s);

export function configDe(raw: unknown): ConfigDeFormulario {
  const r = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const dias = Number(r.seguimiento_dias);
  const agenda = typeof r.agenda_url === "string" ? r.agenda_url.trim() : "";
  const privacy = typeof r.privacy_url === "string" ? r.privacy_url.trim() : "";
  const replyTo = typeof r.reply_to === "string" ? r.reply_to.trim() : "";
  return {
    correo_inmediato: r.correo_inmediato === true,
    seguimiento: r.seguimiento === true,
    seguimiento_dias: Number.isFinite(dias) && dias >= 1 && dias <= 60 ? Math.round(dias) : CONFIG_POR_DEFECTO.seguimiento_dias,
    ja_correo_en: r.ja_correo_en !== false,
    agenda_url: esUrl(agenda) ? agenda : "",
    privacy_url: esUrl(privacy) ? privacy : "",
    reply_to: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(replyTo) ? replyTo : CONFIG_POR_DEFECTO.reply_to,
    firma: typeof r.firma === "string" ? r.firma.trim().slice(0, 120) : "",
  };
}

/** La fila de `lead_forms` como la lee todo el mundo. */
export type FormularioDeLaBase = {
  key: string;
  nombre: string;
  descripcion: string | null;
  ruta: string;
  etiqueta_cabecera: string;
  activo: boolean;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  config: unknown;
  created_at: string;
  updated_at: string;
};

/** Lo que la cabecera de CTC Home enseña del formulario activo. */
export type FormularioActivo = { key: string; etiqueta: string; href: string; nombre: string };

/** PURO: dado el registro de la base, el formulario que la portada enseña (uno, el activo, que además exista en el código y cuya
 *  ventana de vigencia —si la tiene— incluya `ahora`). El `source=web` distingue la portada de los QR impresos. */
export function formularioActivoDe(filas: readonly FormularioDeLaBase[], ahoraIso: string): FormularioActivo | null {
  const ahora = Date.parse(ahoraIso);
  for (const f of filas) {
    if (!f.activo) continue;
    const def = formulario(f.key);
    if (!def) continue;
    if (f.vigente_desde && Date.parse(f.vigente_desde) > ahora) continue;
    if (f.vigente_hasta && Date.parse(f.vigente_hasta) < ahora) continue;
    return { key: f.key, etiqueta: f.etiqueta_cabecera, href: `${def.ruta}?source=web`, nombre: f.nombre };
  }
  return null;
}
