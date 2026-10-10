// ── Interfaz de Leads · los CAMPOS de un formulario de captación y sus reglas (V6.2) — PURO ────────────────────────────────────
// El owner (2026-10-10): una «Interfaz de Leads» en LCP · General con formularios que se encienden uno a la vez en la portada de
// ctcexport.com; el primero es SCAJ 2026 (feria de Tokio, 14-17 oct 2026), especificado campo a campo por el owner en
// `reference/Web_Lead_Form/prompt-formulario-leads-scaj2026.md` (fuera del repo). Aquí vive lo que NO toca red ni servidor: qué
// campos existen, a quién se le muestra cada uno, qué valores se guardan, cómo se limpia y valida un envío, cómo se exporta.
// Lo leen el formulario (cliente), la acción pública (servidor), la consola y el guardián `qa-lead-forms-check`.
//
// Nombres en inglés y en snake_case, como los pide la especificación (son los que ve el owner al exportar). Las preguntas
// ADICIONALES de la casa van en `extra` (jsonb) con claves conocidas: un formulario futuro puede traer otras sin migrar.

/** El bucket PRIVADO de las fotos de tarjeta y su tope (el mismo `file_size_limit` del bucket). Viven aquí, en el módulo puro,
 *  porque un archivo "use server" solo puede exportar funciones async y los leen el cliente y el servidor. */
export const BUCKET_LEADS = "event-leads";
export const MAX_MB_TARJETA = 5;

export const IDIOMAS = ["es", "en", "ja"] as const;
export type IdiomaDeFormulario = (typeof IDIOMAS)[number];

export const TIPOS_DE_PARTICIPANTE = ["roaster", "importer", "cafe_horeca", "distributor", "producer", "barista", "press", "other"] as const;
export type TipoDeParticipante = (typeof TIPOS_DE_PARTICIPANTE)[number];

/** «Comprador» en la especificación: tostador, importador, cafetería/HORECA y distribuidor. Los demás son «no comprador». */
export const COMPRADORES: readonly TipoDeParticipante[] = ["roaster", "importer", "cafe_horeca", "distributor"];
export const esComprador = (tipo: string): boolean => (COMPRADORES as readonly string[]).includes(tipo);

/** Las opciones de cada pregunta cerrada: las CLAVES son lo que se guarda; los rótulos viven en `textos.json` de cada formulario. */
export const OPCIONES = {
  green_volume: ["lt_1t", "1_5t", "5_20t", "20_100t", "gt_100t", "none"],
  buys_colombian: ["regular", "sometimes", "not_yet"],
  profiles: ["washed", "natural", "honey", "experimental", "rare_varieties", "decaf"],
  values: ["traceability", "cup_quality", "direct_relationship", "consistency", "small_lots", "sustainability", "price", "origin_story"],
  timing: ["lt_3m", "3_6m", "exploring"],
  wants: ["sample_pack", "lot_list", "video_call"],
  // Las preguntas de la casa (V6.2): grados CTCx, formato de compra, certificaciones del mercado, verde o tostado en destino.
  grades_interest: ["black", "red", "blue", "gold", "tyrian"],
  purchase_format: ["fractions", "bags", "container", "undecided"],
  certifications: ["jas_organic", "rainforest", "fairtrade", "deforestation_free", "none"],
  roast_in_destination: ["green", "roasted", "both"],
} as const;
export type PreguntaCerrada = keyof typeof OPCIONES;

export const CLAVES_EXTRA = ["grades_interest", "purchase_format", "certifications", "roast_in_destination", "regional_node_interest", "producer_interest"] as const;
export type ClaveExtra = (typeof CLAVES_EXTRA)[number];

/** A quién se le muestra cada campo condicionado (un campo que no está aquí se muestra siempre). La tabla de la especificación
 *  más las preguntas de la casa: el nodo logístico regional es para quien importa o distribuye (Regional Operation Enablement,
 *  `PVC_BCP_PLAN` §12); evaluar y vender con CTCx, para el productor; verde o tostado, para quien no tuesta (cafetería, distribuidor). */
export const VISIBILIDAD: Record<string, (tipo: string) => boolean> = {
  participant_other: (t) => t === "other",
  green_volume: esComprador,
  buys_colombian: esComprador,
  profiles: esComprador,
  grades_interest: esComprador,
  purchase_format: esComprador,
  certifications: esComprador,
  roast_in_destination: (t) => t === "cafe_horeca" || t === "distributor",
  regional_node_interest: (t) => t === "importer" || t === "distributor",
  producer_interest: (t) => t === "producer",
  about: (t) => !esComprador(t),
  values: (t) => t !== "producer" && t !== "press",
  timing: esComprador,
  master_roaster_interest: (t) => t === "roaster",
};
export function visible(campo: string, tipo: string): boolean {
  const regla = VISIBILIDAD[campo];
  return regla ? regla(tipo) : true;
}

/** Lo que manda el navegador. Todo opcional menos lo obligatorio de la tabla; `website` es el honeypot (oculto; un bot lo llena);
 *  `sello` es el testigo de tiempo que emite el servidor al pintar la página (anti-bot invisible). */
export type EnvioDeFormulario = {
  formKey: string;
  idempotencyKey: string;
  lang: string;
  source?: string | null;
  sello?: string | null;
  website?: string | null;
  participant_type: string;
  participant_other?: string | null;
  full_name: string;
  company: string;
  email: string;
  country_city?: string | null;
  card_photo_path?: string | null;
  green_volume?: string | null;
  buys_colombian?: string | null;
  profiles?: string[] | null;
  about?: string | null;
  values?: Record<string, number> | null;
  looking_for?: string | null;
  timing?: string | null;
  wants?: string[] | null;
  master_roaster_interest?: boolean | null;
  extra?: Partial<Record<ClaveExtra, unknown>> | null;
  consent: boolean;
};

/** La fila LIMPIA que se inserta (las columnas de `event_leads` que vienen del formulario). */
export type LeadLimpio = {
  form_key: string;
  idempotency_key: string;
  lang: IdiomaDeFormulario;
  source: string | null;
  participant_type: TipoDeParticipante;
  participant_other: string | null;
  full_name: string;
  company: string;
  email: string;
  country_city: string | null;
  card_photo_path: string | null;
  green_volume: string | null;
  buys_colombian: string | null;
  profiles: string[];
  about: string | null;
  values_beans: Record<string, number>;
  looking_for: string | null;
  timing: string | null;
  wants: string[];
  master_roaster_interest: boolean;
  extra: Record<string, unknown>;
  consent: true;
};

export type MotivoDeRechazo = "form" | "idempotency" | "lang" | "type" | "required" | "email" | "consent";
export type Validacion = { ok: true; lead: LeadLimpio } | { ok: false; motivo: MotivoDeRechazo; campo?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FORM_KEY_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const SOURCE_RE = /^[a-z0-9][a-z0-9._-]{0,59}$/i;

const texto = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return s ? s.slice(0, max) : null;
};
const parrafo = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim() : "";
  return s ? s.slice(0, max) : null;
};
const opcion = (v: unknown, pregunta: PreguntaCerrada): string | null => {
  const lista = OPCIONES[pregunta] as readonly string[];
  return typeof v === "string" && lista.includes(v) ? v : null;
};
const opciones = (v: unknown, pregunta: PreguntaCerrada): string[] => {
  const lista = OPCIONES[pregunta] as readonly string[];
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === "string" && lista.includes(x)))];
};

/** «Qué valoras»: una clave por opción marcada y sus granos (entero 0-5; marcada sin tocar los granos = 0). Lo desconocido se cae. */
export function limpiarValores(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const clave of OPCIONES.values) {
    const n = (v as Record<string, unknown>)[clave];
    if (n === undefined || n === null) continue;
    const num = Number(n);
    if (!Number.isFinite(num)) continue;
    out[clave] = Math.max(0, Math.min(5, Math.round(num)));
  }
  return out;
}

/** Las preguntas de la casa, limpias y solo las visibles para el tipo. */
export function limpiarExtra(v: unknown, tipo: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const raw = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  if (visible("grades_interest", tipo)) {
    const g = opciones(raw.grades_interest, "grades_interest");
    if (g.length) out.grades_interest = g;
  }
  if (visible("purchase_format", tipo)) {
    const f = opcion(raw.purchase_format, "purchase_format");
    if (f) out.purchase_format = f;
  }
  if (visible("certifications", tipo)) {
    const c = opciones(raw.certifications, "certifications");
    if (c.length) out.certifications = c;
  }
  if (visible("roast_in_destination", tipo)) {
    const r = opcion(raw.roast_in_destination, "roast_in_destination");
    if (r) out.roast_in_destination = r;
  }
  if (visible("regional_node_interest", tipo) && raw.regional_node_interest === true) out.regional_node_interest = true;
  if (visible("producer_interest", tipo) && raw.producer_interest === true) out.producer_interest = true;
  return out;
}

/** Limpia y valida un envío. Lo invisible para el tipo NO se guarda aunque venga (la regla de la especificación: «lo que no se
 *  marca no se guarda», y un campo que el formulario no mostró tampoco). Devuelve el motivo del rechazo, nunca lanza. */
export function validarEnvio(raw: EnvioDeFormulario): Validacion {
  const formKey = typeof raw.formKey === "string" && FORM_KEY_RE.test(raw.formKey) ? raw.formKey : null;
  if (!formKey) return { ok: false, motivo: "form" };
  if (typeof raw.idempotencyKey !== "string" || !UUID_RE.test(raw.idempotencyKey)) return { ok: false, motivo: "idempotency" };
  const lang = (IDIOMAS as readonly string[]).includes(raw.lang) ? (raw.lang as IdiomaDeFormulario) : null;
  if (!lang) return { ok: false, motivo: "lang" };
  const tipo = (TIPOS_DE_PARTICIPANTE as readonly string[]).includes(raw.participant_type) ? (raw.participant_type as TipoDeParticipante) : null;
  if (!tipo) return { ok: false, motivo: "type", campo: "participant_type" };
  const participantOther = tipo === "other" ? texto(raw.participant_other, 120) : null;
  if (tipo === "other" && !participantOther) return { ok: false, motivo: "required", campo: "participant_other" };
  const fullName = texto(raw.full_name, 160);
  if (!fullName) return { ok: false, motivo: "required", campo: "full_name" };
  const company = texto(raw.company, 160);
  if (!company) return { ok: false, motivo: "required", campo: "company" };
  const email = texto(raw.email, 254)?.toLowerCase() ?? null;
  if (!email) return { ok: false, motivo: "required", campo: "email" };
  if (!EMAIL_RE.test(email)) return { ok: false, motivo: "email", campo: "email" };
  if (raw.consent !== true) return { ok: false, motivo: "consent", campo: "consent" };

  const source = typeof raw.source === "string" && SOURCE_RE.test(raw.source.trim()) ? raw.source.trim().slice(0, 60) : null;
  const cardPath = typeof raw.card_photo_path === "string" && raw.card_photo_path.startsWith(`${formKey}/`) && raw.card_photo_path.length < 200 ? raw.card_photo_path : null;

  const lead: LeadLimpio = {
    form_key: formKey,
    idempotency_key: raw.idempotencyKey.toLowerCase(),
    lang,
    source,
    participant_type: tipo,
    participant_other: participantOther,
    full_name: fullName,
    company,
    email,
    country_city: texto(raw.country_city, 160),
    card_photo_path: cardPath,
    green_volume: visible("green_volume", tipo) ? opcion(raw.green_volume, "green_volume") : null,
    buys_colombian: visible("buys_colombian", tipo) ? opcion(raw.buys_colombian, "buys_colombian") : null,
    profiles: visible("profiles", tipo) ? opciones(raw.profiles, "profiles") : [],
    about: visible("about", tipo) ? parrafo(raw.about, 2000) : null,
    values_beans: visible("values", tipo) ? limpiarValores(raw.values) : {},
    looking_for: parrafo(raw.looking_for, 2000),
    timing: visible("timing", tipo) ? opcion(raw.timing, "timing") : null,
    wants: opciones(raw.wants, "wants"),
    master_roaster_interest: visible("master_roaster_interest", tipo) && raw.master_roaster_interest === true,
    extra: limpiarExtra(raw.extra, tipo),
    consent: true,
  };
  return { ok: true, lead };
}

/** Las dos o tres opciones de «Qué valoras» con más granos (desempata el orden de la lista), para abrir el correo con ellas. */
export function valoresPrincipales(values: Record<string, number> | null | undefined, n = 3): string[] {
  const entradas = Object.entries(values ?? {}).filter(([k, v]) => (OPCIONES.values as readonly string[]).includes(k) && Number(v) > 0);
  const orden = (k: string) => (OPCIONES.values as readonly string[]).indexOf(k);
  return entradas
    .sort((a, b) => Number(b[1]) - Number(a[1]) || orden(a[0]) - orden(b[0]))
    .slice(0, n)
    .map(([k]) => k);
}

/** Cuándo vence el seguimiento: exactamente `dias` después del envío (mismo instante del día). */
export function venceElSeguimiento(createdAtIso: string, dias: number): string {
  const d = new Date(createdAtIso);
  d.setUTCDate(d.getUTCDate() + Math.max(1, Math.round(dias)));
  return d.toISOString();
}

/** El idioma inicial: el del navegador si es uno de los tres; si no, inglés (la regla de la especificación). */
export function idiomaInicial(acceptLanguage: string | null | undefined): IdiomaDeFormulario {
  const primero = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (primero.startsWith("ja")) return "ja";
  if (primero.startsWith("es")) return "es";
  return "en";
}

/** Una fila tal cual la lee la consola (las columnas de la base). */
export type LeadDeEvento = LeadLimpio & {
  id: string;
  status: string;
  consent_at: string;
  submitted_ip: string | null;
  user_agent: string | null;
  email_immediate_sent_at: string | null;
  email_immediate_error: string | null;
  followup_due_at: string;
  followup_sent_at: string | null;
  followup_error: string | null;
  replied_at: string | null;
  unsubscribed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const ESTADOS_DE_LEAD = ["nuevo", "en_conversacion", "convertido", "cerrado"] as const;
export const ESTADO_LABEL: Record<(typeof ESTADOS_DE_LEAD)[number], string> = {
  nuevo: "Nuevo",
  en_conversacion: "En conversación",
  convertido: "Convertido",
  cerrado: "Cerrado",
};

/** El CSV de un formulario: una fila por lead, columnas fijas (las de la especificación, luego las de la casa, luego el estado de
 *  los correos). Con BOM para que Excel lea el UTF-8 (nombres japoneses). */
export const COLUMNAS_CSV = [
  "created_at", "status", "lang", "source", "participant_type", "participant_other", "full_name", "company", "email", "country_city",
  "green_volume", "buys_colombian", "profiles", "about", "values", "looking_for", "timing", "wants", "master_roaster_interest",
  "grades_interest", "purchase_format", "certifications", "roast_in_destination", "regional_node_interest", "producer_interest",
  "card_photo", "consent_at", "email_immediate_sent_at", "email_immediate_error", "followup_due_at", "followup_sent_at", "followup_error",
  "replied_at", "unsubscribed_at", "notes", "id",
] as const;

const celda = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("|") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function csvDeLeads(filas: readonly LeadDeEvento[]): string {
  const lineas = [COLUMNAS_CSV.join(",")];
  for (const f of filas) {
    const x = f.extra ?? {};
    lineas.push(
      [
        f.created_at, f.status, f.lang, f.source, f.participant_type, f.participant_other, f.full_name, f.company, f.email, f.country_city,
        f.green_volume, f.buys_colombian, f.profiles, f.about, f.values_beans, f.looking_for, f.timing, f.wants, f.master_roaster_interest,
        x.grades_interest ?? null, x.purchase_format ?? null, x.certifications ?? null, x.roast_in_destination ?? null,
        x.regional_node_interest === true, x.producer_interest === true,
        f.card_photo_path ? "sí" : "", f.consent_at, f.email_immediate_sent_at, f.email_immediate_error, f.followup_due_at, f.followup_sent_at,
        f.followup_error, f.replied_at, f.unsubscribed_at, f.notes, f.id,
      ]
        .map(celda)
        .join(",")
    );
  }
  return "﻿" + lineas.join("\r\n") + "\r\n";
}
