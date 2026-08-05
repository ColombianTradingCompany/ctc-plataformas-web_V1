// ── Integraciones · el vocabulario compartido ────────────────────────────────
// NO se inventó una taxonomía: esta es la que el negocio YA usa. Las etiquetas
// de Gmail (`0. ADMIN Y ESTRATEGIA`, `1. ORIGEN Y SUMINISTRO`, …) y los hubs del
// Notion de CTC son la misma lista. Todo lo que cruce sistemas —un evento, un
// escenario de Make, un correo clasificado, una página espejada— se etiqueta
// con ESTO, para que las tres herramientas hablen el mismo idioma.
//
// Si algún día cambia, cambia aquí y en el enum `integration_domain` de Postgres.

export const DOMINIOS = [
  { id: "admin_estrategia",      n: "0", label: "Admin y Estrategia",       gmail: "0. ADMIN Y ESTRATEGIA" },
  { id: "origen_suministro",     n: "1", label: "Origen y Suministro",      gmail: "1. ORIGEN Y SUMINISTRO" },
  { id: "transito_importacion",  n: "2", label: "Tránsito e Importación",   gmail: "2. TRÁNSITO E IMPORTACIÓN" },
  { id: "tostadores_inventario", n: "3", label: "Tostadores e Inventario",  gmail: "3. TOSTADORES E INVENTARIO" },
  { id: "ventas_marketing",      n: "4", label: "Ventas y Marketing",       gmail: "4. VENTAS Y MARKETING" },
  { id: "it_plataforma",         n: "5", label: "IT y Plataforma",          gmail: "5.IT" },
  { id: "investigacion",         n: "6", label: "Investigación y Desarrollo", gmail: "6.INVESTIGACION Y DESARROLLO" },
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
