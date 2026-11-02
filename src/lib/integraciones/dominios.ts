// ── Integraciones · el vocabulario compartido: el «Mapa CTC» 0–9 (D-007) ─────
// La columna vertebral de la casa (D-007, `docs/UNIFICACION_ALINEACION.md` 2.1):
// los hubs de Notion y Drive, las etiquetas de Gmail, el «Área» de Notion y este
// enum son la MISMA lista. Todo lo que cruce sistemas —un evento, un escenario
// de Make, un correo clasificado, una página espejada— se etiqueta con ESTO,
// para que las herramientas hablen el mismo idioma.
//
// `gmail` es el nombre EXACTO de la etiqueta (`n · label`, «·» U+00B7, NFC): los
// hubs 0–6 y `8 · Ejecución`; 7 y 9 no tienen etiqueta de Gmail. Gmail la
// direcciona por id; aquí solo se nombra, y `qa-integraciones-check` exige la forma.
//
// P20 (2026-11): el enum `integration_domain` se PARTIÓ —no se renombró— desde los
// siete valores viejos; el reparto y su vuelta, en
// `docs/migraciones/2026-11-02_dominios_hub.sql`. Si algún día cambia, cambia aquí,
// en el enum de Postgres y en las cadenas de Make, en la misma tanda.

export const DOMINIOS = [
  { id: "direccion",           n: "0", label: "Dirección",             gmail: "0 · Dirección" },
  { id: "origen",              n: "1", label: "Origen",                gmail: "1 · Origen" },
  { id: "operacion_logistica", n: "2", label: "Operación y Logística", gmail: "2 · Operación y Logística" },
  { id: "comercial",           n: "3", label: "Comercial",             gmail: "3 · Comercial" },
  { id: "marca_contenido",     n: "4", label: "Marca y Contenido",     gmail: "4 · Marca y Contenido" },
  { id: "plataformas_it",      n: "5", label: "Plataformas e IT",      gmail: "5 · Plataformas e IT" },
  { id: "conocimiento",        n: "6", label: "Conocimiento",          gmail: "6 · Conocimiento" },
  { id: "directorios",         n: "7", label: "Directorios",           gmail: "" },
  { id: "ejecucion",           n: "8", label: "Ejecución",             gmail: "8 · Ejecución" },
  { id: "archivo",             n: "9", label: "Archivo",               gmail: "" },
] as const;

export type Dominio = (typeof DOMINIOS)[number]["id"];

export const DOMINIO_LABEL: Record<Dominio, string> = Object.fromEntries(
  DOMINIOS.map((d) => [d.id, d.label])
) as Record<Dominio, string>;

/** Los sistemas que una automatización puede tocar. */
export const SISTEMAS = [
  "plataforma", "notion", "gmail", "drive", "calendar",
  "instagram", "youtube", "whatsapp", "supabase", "otro",
] as const;
export type Sistema = (typeof SISTEMAS)[number];

export const ETAPAS = ["propuesta", "piloto", "activa", "pausada", "deprecada"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const CRITICIDADES = ["experimental", "util", "importante", "critica"] as const;
export type Criticidad = (typeof CRITICIDADES)[number];

export const CRITICIDAD_LABEL: Record<Criticidad, string> = {
  experimental: "Experimental",
  util: "Útil",
  importante: "Importante",
  critica: "Crítica",
};

/** Qué pasa si se cae — es la pregunta que decide la criticidad. */
export const CRITICIDAD_HINT: Record<Criticidad, string> = {
  experimental: "Si se cae no se entera nadie.",
  util: "Se nota, pero se puede hacer a mano.",
  importante: "Se rompe un proceso; hay que arreglarlo el mismo día.",
  critica: "Alguien de fuera lo ve o se pierde información.",
};
