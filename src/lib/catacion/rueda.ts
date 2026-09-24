// ── La rueda de sabores · UNA taxonomía (fase 4 del PLAN_CIRCUITO_DEL_LOTE, V5.81) ──────────
// PURA: sin red, sin servidor. Es la estructura de la rueda SCA / World Coffee Research (nueve familias y sus
// descriptores de segundo nivel) con la que el Q-Grader describe un lote en el Centro de Calidad y que el OCP,
// el productor y —cuando llegue la variante interna— la Datasheet Tool leen igual. `lot_evaluations.rueda` guarda
// la LISTA de ids de descriptor elegidos; las etiquetas y los colores viven solo aquí, para que un cambio de
// vocabulario no reescriba datos. Dos idiomas desde el día uno: el dossier del lote sale en ES y EN.

export type Descriptor = { id: string; es: string; en: string };
export type FamiliaDeLaRueda = { id: string; es: string; en: string; color: string; descriptores: Descriptor[] };

const d = (id: string, es: string, en: string): Descriptor => ({ id, es, en });

export const RUEDA: readonly FamiliaDeLaRueda[] = [
  {
    id: "frutal",
    es: "Frutal",
    en: "Fruity",
    color: "#DA1D23",
    descriptores: [d("berry", "Bayas", "Berry"), d("dried_fruit", "Fruta deshidratada", "Dried fruit"), d("other_fruit", "Otras frutas", "Other fruit"), d("citrus", "Cítricos", "Citrus fruit")],
  },
  {
    id: "acido_fermentado",
    es: "Ácido / Fermentado",
    en: "Sour / Fermented",
    color: "#EBB40F",
    descriptores: [d("sour", "Ácido", "Sour"), d("alcohol_fermented", "Alcohol / Fermentado", "Alcohol / Fermented")],
  },
  {
    id: "verde_vegetal",
    es: "Verde / Vegetal",
    en: "Green / Vegetative",
    color: "#187A2F",
    descriptores: [d("olive_oil", "Aceite de oliva", "Olive oil"), d("raw", "Crudo", "Raw"), d("green_vegetative", "Verde / Vegetal", "Green / Vegetative"), d("beany", "Frijol", "Beany")],
  },
  {
    id: "otros",
    es: "Otros",
    en: "Other",
    color: "#0AA3B5",
    descriptores: [d("papery_musty", "Papel / Moho", "Papery / Musty"), d("chemical", "Químico", "Chemical")],
  },
  {
    id: "tostado",
    es: "Tostado",
    en: "Roasted",
    color: "#C94930",
    descriptores: [d("pipe_tobacco", "Tabaco de pipa", "Pipe tobacco"), d("tobacco", "Tabaco", "Tobacco"), d("burnt", "Quemado", "Burnt"), d("cereal", "Cereal", "Cereal")],
  },
  {
    id: "especias",
    es: "Especias",
    en: "Spices",
    color: "#AD213E",
    descriptores: [d("pungent", "Pungente", "Pungent"), d("pepper", "Pimienta", "Pepper"), d("brown_spice", "Especias dulces", "Brown spice")],
  },
  {
    id: "nuez_cacao",
    es: "Nuez / Cacao",
    en: "Nutty / Cocoa",
    color: "#A87B2F",
    descriptores: [d("nutty", "Nuez", "Nutty"), d("cocoa", "Cacao", "Cocoa")],
  },
  {
    id: "dulce",
    es: "Dulce",
    en: "Sweet",
    color: "#E65832",
    descriptores: [d("brown_sugar", "Panela / Azúcar morena", "Brown sugar"), d("vanilla", "Vainilla", "Vanilla"), d("vanillin", "Vainillina", "Vanillin"), d("overall_sweet", "Dulce general", "Overall sweet"), d("sweet_aromatics", "Aromáticos dulces", "Sweet aromatics")],
  },
  {
    id: "floral",
    es: "Floral",
    en: "Floral",
    color: "#DA5C9A",
    descriptores: [d("black_tea", "Té negro", "Black tea"), d("floral", "Floral", "Floral")],
  },
];

/** Todos los descriptores, planos, con su familia. */
export const DESCRIPTORES: readonly (Descriptor & { familia: string })[] = RUEDA.flatMap((f) => f.descriptores.map((x) => ({ ...x, familia: f.id })));

const POR_ID = new Map(DESCRIPTORES.map((x) => [x.id, x]));

export function esDescriptor(id: unknown): id is string {
  return typeof id === "string" && POR_ID.has(id);
}

/** La etiqueta de un descriptor en un idioma; el id crudo si no existe (un dato viejo nunca revienta una pantalla). */
export function descriptorLabel(id: string, lang: "es" | "en" = "es"): string {
  const x = POR_ID.get(id);
  return x ? x[lang] : id;
}

/** La familia (color y nombre) de un descriptor, o null. */
export function familiaDe(id: string): FamiliaDeLaRueda | null {
  const x = POR_ID.get(id);
  return x ? (RUEDA.find((f) => f.id === x.familia) ?? null) : null;
}

/** Limpia lo que venga de la base o de un formulario: solo ids válidos, sin repetidos, en el orden de la rueda. */
export function normalizaRueda(raw: unknown): string[] {
  const lista = Array.isArray(raw) ? raw : [];
  const elegidos = new Set(lista.filter(esDescriptor));
  return DESCRIPTORES.filter((x) => elegidos.has(x.id)).map((x) => x.id);
}
