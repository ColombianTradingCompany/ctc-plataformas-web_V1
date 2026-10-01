// ── La rueda de sabores · UNA taxonomía: la de la herramienta (V5.81 → V5.131) ─────────────────────────────────────
// PURA: sin red, sin servidor. Es la rueda del sabor con la que el Q-Grader describe un lote en el Centro de Calidad y
// que leen igual el OCP y el productor. `lot_evaluations.rueda` guarda la LISTA de ids marcados; las etiquetas y los
// colores viven solo aquí, para que un cambio de vocabulario no reescriba datos.
//
// V5.131 (owner, 2026-10-01 — «no entiendo por qué la rueda es diferente… ¡deben ser iguales!»): hasta la V5.130 esta
// era una taxonomía RESUMIDA escrita a mano (9 familias, 28 descriptores) y la Rueda del Café del taller traía la completa.
// Ahora los datos son los de la herramienta —9 familias → 22 subcategorías → 85 notas, con sus colores e iconos—,
// generados por `scripts/build-rueda-datos.mjs` en `ruedaDatos.ts` (lo único que este archivo importa). La rueda se marca
// en CUALQUIER nivel, como la física: del centro al borde, hasta donde el catador distinga.
//
// LOS IDS que se guardan:   familia `frutal` · subcategoría `frutal-citricos` · nota `frutal-citricos|lima`
// (la nota lleva su subcategoría delante, como la propia herramienta: hay una nota «verde» y una familia «verde»).

import { RUEDA_DATOS, type FamiliaDeLaRueda, type NotaDeLaRueda, type SubcategoriaDeLaRueda } from "./ruedaDatos";

export type { FamiliaDeLaRueda, NotaDeLaRueda, SubcategoriaDeLaRueda };
export const RUEDA: readonly FamiliaDeLaRueda[] = RUEDA_DATOS;

export type NivelDeLaRueda = 1 | 2 | 3;
/** Un punto marcable de la rueda, en cualquiera de sus tres niveles. `id` es lo que se guarda. */
export type Descriptor = { id: string; nivel: NivelDeLaRueda; es: string; en: string; familia: string; sub: string | null; hoja: string | null };

/** El id con el que se guarda una nota (nivel 3): su subcategoría y la nota. */
export const idDeNota = (subId: string, notaId: string) => `${subId}|${notaId}`;

/** Todos los puntos marcables, en el orden de la rueda: cada familia, y dentro cada subcategoría seguida de sus notas. */
export const DESCRIPTORES: readonly Descriptor[] = RUEDA.flatMap((f) => [
  { id: f.id, nivel: 1 as const, es: f.es, en: f.en, familia: f.id, sub: null, hoja: null },
  ...f.subs.flatMap((s) => [
    { id: s.id, nivel: 2 as const, es: s.es, en: s.en, familia: f.id, sub: s.id, hoja: null },
    ...s.hojas.map((h) => ({ id: idDeNota(s.id, h.id), nivel: 3 as const, es: h.es, en: h.en, familia: f.id, sub: s.id, hoja: h.id })),
  ]),
]);

const POR_ID = new Map(DESCRIPTORES.map((x) => [x.id, x]));
const FAMILIA_POR_ID = new Map(RUEDA.map((f) => [f.id, f]));

/** Los 28 ids de la taxonomía resumida (V5.81–V5.130) y a qué punto de la rueda completa corresponden. Ningún dato vivo
 *  los usaba el 2026-10-01 (comprobado por SQL), pero una planilla vieja en un borrador no puede perder sus notas.
 *  «floral» no está: hoy es la familia, y la familia es justo lo que significaba. */
const IDS_DE_LA_RUEDA_RESUMIDA: Record<string, string> = {
  berry: "frutal-bayas", dried_fruit: "frutal-seca", other_fruit: "frutal-otras", citrus: "frutal-citricos",
  sour: "acido-acidos", alcohol_fermented: "acido-fermentado",
  olive_oil: "verde-crudo|aceite-de-oliva", raw: "verde-crudo|crudo", green_vegetative: "verde-vegetal", beany: "verde-frijol",
  papery_musty: "otros-papel", chemical: "otros-quimico",
  pipe_tobacco: "tostado-tabaco|tabaco-de-pipa", tobacco: "tostado-tabaco|tabaco", burnt: "tostado-quemado", cereal: "tostado-cereal",
  pungent: "especias-pungente|pungente", pepper: "especias-pungente|pimienta", brown_spice: "especias-oscuras",
  nutty: "cacao-secos", cocoa: "cacao-cacao",
  brown_sugar: "dulce-morena", vanilla: "dulce-vainilla|vainilla", vanillin: "dulce-vainilla|vainillina",
  overall_sweet: "dulce-vainilla|dulce-general", sweet_aromatics: "dulce-vainilla|aromatico-dulce",
  black_tea: "floral-te",
};
const idVigente = (id: string) => IDS_DE_LA_RUEDA_RESUMIDA[id] ?? id;

export function esDescriptor(id: unknown): id is string {
  return typeof id === "string" && POR_ID.has(idVigente(id));
}

/** El descriptor de un id (vigente o de la rueda resumida), o null. */
export function descriptorDe(id: string): Descriptor | null {
  return POR_ID.get(idVigente(id)) ?? null;
}

/** La etiqueta de un punto en un idioma; el id crudo si no existe (un dato viejo nunca revienta una pantalla). */
export function descriptorLabel(id: string, lang: "es" | "en" = "es"): string {
  const x = descriptorDe(id);
  return x ? x[lang] : id;
}

/** La familia (color, icono y nombre) de un punto, o null. */
export function familiaDe(id: string): FamiliaDeLaRueda | null {
  const x = descriptorDe(id);
  return x ? (FAMILIA_POR_ID.get(x.familia) ?? null) : null;
}

/** El camino del centro al borde: «Frutal › Cítricos › Lima». Es lo que se enseña en una lista, donde no se ve la rueda. */
export function rutaDe(id: string, lang: "es" | "en" = "es"): string {
  const x = descriptorDe(id);
  if (!x) return id;
  const familia = FAMILIA_POR_ID.get(x.familia);
  const sub = x.sub ? familia?.subs.find((s) => s.id === x.sub) : null;
  const partes = [familia?.[lang], sub?.[lang], x.nivel === 3 ? x[lang] : null].filter((p): p is string => Boolean(p));
  // «Floral › Floral» o «Té negro › Té negro» no dicen nada dos veces.
  return partes.filter((p, i) => i === 0 || p !== partes[i - 1]).join(" › ");
}

/** Limpia lo que venga de la base o de un formulario: solo ids válidos (los resumidos se traducen), sin repetidos, en el
 *  orden de la rueda. */
export function normalizaRueda(raw: unknown): string[] {
  const lista = Array.isArray(raw) ? raw : [];
  const elegidos = new Set(lista.filter(esDescriptor).map(idVigente));
  return DESCRIPTORES.filter((x) => elegidos.has(x.id)).map((x) => x.id);
}
