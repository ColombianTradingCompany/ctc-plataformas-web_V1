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

// ── Etapa e intensidad de cada marca (V5.133, owner 2026-10-01) ──────────────────────────────────────────────────────
// El formato descriptivo SCA-CVA, tal como lo lleva el modo Catar de la herramienta: de cada nota marcada se registra QUÉ
// (el punto de la rueda), DÓNDE se percibió (la etapa — una sola por nota, la dominante) y CON QUÉ INTENSIDAD (0–15 en
// pasos de 0,5: 0–4 baja · 5–9 media · 10–15 alta). La intensidad dice cuánto HAY de esa nota en esa etapa, no cuánto
// gusta: eso es la evaluación afectiva. Los valores por defecto son los de la herramienta (sabor · 10).
// `lot_evaluations.rueda_detalle` guarda `{ [id]: { etapas, intensidad, nota } }`, una entrada por cada id de `rueda`.
//
// V5.140 (owner, 2026-10-02): «debo poder seleccionar una nota de la rueda y resaltarla en uno o VARIOS ítems (Fragancia,
// Aroma, Sabor, Sabor Residual)… de la misma manera sería útil poder insertar un comentario (opcional) en cada nota».
// El informe de un catador lo dice así: «en fragancia y aroma se perciben notas a frutal, vinoso, chocolate; en sabor,
// chocolate, ciruela pasa, vinoso» — la misma nota en varias etapas. Por eso `etapas` es una LISTA (en el orden de la
// cata, sin repetir y nunca vacía) y cada marca lleva su `nota`. La intensidad sigue siendo UNA por nota. Lo guardado
// con la V5.133 (`etapa`, una sola) se lee como una lista de una.

export const ETAPAS_DE_LA_RUEDA = ["fragancia", "aroma", "sabor", "residual"] as const;
export type EtapaDeLaRueda = (typeof ETAPAS_DE_LA_RUEDA)[number];
export const ETAPA_LABEL: Record<"es" | "en", Record<EtapaDeLaRueda, string>> = {
  es: { fragancia: "Fragancia", aroma: "Aroma", sabor: "Sabor", residual: "Sabor residual" },
  en: { fragancia: "Fragrance", aroma: "Aroma", sabor: "Flavor", residual: "Aftertaste" },
};

export const INTENSIDAD = { min: 0, max: 15, paso: 0.5 } as const;
export const MARCA_POR_DEFECTO: { readonly etapas: readonly EtapaDeLaRueda[]; readonly intensidad: number; readonly nota: string } = { etapas: ["sabor"], intensidad: 10, nota: "" };
/** El comentario de una marca es una línea, no un párrafo: el perfil de taza completo tiene su propio campo. */
export const NOTA_MAX = 240;

export type ZonaDeIntensidad = "baja" | "media" | "alta";
export const ZONA_LABEL: Record<"es" | "en", Record<ZonaDeIntensidad, string>> = {
  es: { baja: "BAJA", media: "MEDIA", alta: "ALTA" },
  en: { baja: "LOW", media: "MEDIUM", alta: "HIGH" },
};
export function zonaDeIntensidad(v: number): ZonaDeIntensidad {
  if (v < 5) return "baja";
  if (v < 10) return "media";
  return "alta";
}

export type DetalleDeMarca = { etapas: EtapaDeLaRueda[]; intensidad: number; nota: string };
export type DetalleDeLaRueda = Record<string, DetalleDeMarca>;

/** La intensidad en la rejilla de la herramienta: entre 0 y 15, en pasos de 0,5. */
export function ajustaIntensidad(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return MARCA_POR_DEFECTO.intensidad;
  return Math.round(Math.max(INTENSIDAD.min, Math.min(INTENSIDAD.max, n)) / INTENSIDAD.paso) * INTENSIDAD.paso;
}
/** Las etapas de una marca: en el orden de la cata, sin repetir y NUNCA vacía (sin ninguna válida, la de por defecto).
 *  Lee también la `etapa` suelta con que se guardó en la V5.133. */
export function normalizaEtapas(etapas: unknown, etapaSuelta?: unknown): EtapaDeLaRueda[] {
  const dichas = new Set<unknown>([...(Array.isArray(etapas) ? etapas : []), etapaSuelta]);
  const out = ETAPAS_DE_LA_RUEDA.filter((e) => dichas.has(e));
  return out.length ? out : [...MARCA_POR_DEFECTO.etapas];
}
/** Marca o desmarca UNA etapa. La última no se puede quitar: una nota sin etapa no dice dónde se percibió. */
export function alternaEtapa(etapas: readonly EtapaDeLaRueda[], etapa: EtapaDeLaRueda): EtapaDeLaRueda[] {
  const tiene = etapas.includes(etapa);
  if (tiene && etapas.length === 1) return [...etapas];
  return normalizaEtapas(tiene ? etapas.filter((e) => e !== etapa) : [...etapas, etapa]);
}
/** «Fragancia + Aroma»: las etapas de una marca, en una línea. */
export const etapasLabel = (etapas: readonly EtapaDeLaRueda[], lang: "es" | "en" = "es") => etapas.map((e) => ETAPA_LABEL[lang][e]).join(" + ");
/** El comentario como se GUARDA: una línea, sin espacios de sobra, con tope. (Mientras se escribe no se recorta: se comería los espacios.) */
export const limpiaNota = (v: unknown): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, NOTA_MAX) : "");
/** «10» · «7.5»: como la escribe la herramienta. */
export const fmtIntensidad = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** El detalle de UNA marca; si no lo trae (una evaluación anterior a la V5.133), el valor por defecto. */
export function detalleDe(detalle: DetalleDeLaRueda | null | undefined, id: string): DetalleDeMarca {
  const x = detalle?.[id];
  return x ? x : { etapas: [...MARCA_POR_DEFECTO.etapas], intensidad: MARCA_POR_DEFECTO.intensidad, nota: MARCA_POR_DEFECTO.nota };
}

/** Limpia el detalle que venga de la base o de un formulario: UNA entrada por cada id de `ids` (ya normalizados), ninguna más. */
export function normalizaDetalle(raw: unknown, ids: readonly string[]): DetalleDeLaRueda {
  const origen = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  // Lo que venga con un id de la rueda resumida se lee con su id vigente.
  const porId = new Map<string, unknown>(Object.entries(origen).map(([k, v]) => [idVigente(k), v]));
  const out: DetalleDeLaRueda = {};
  for (const id of ids) {
    const x = porId.get(id);
    const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
    out[id] = {
      etapas: normalizaEtapas(o.etapas, o.etapa),
      intensidad: "intensidad" in o ? ajustaIntensidad(o.intensidad) : MARCA_POR_DEFECTO.intensidad,
      nota: limpiaNota(o.nota),
    };
  }
  return out;
}

/** Una marca completa en una línea: «Frutal › Cítricos › Lima · Fragancia + Sabor · 10/15 — «a cáscara»». */
export function marcaLabel(id: string, detalle: DetalleDeLaRueda | null | undefined, lang: "es" | "en" = "es"): string {
  const d = detalleDe(detalle, id);
  return `${rutaDe(id, lang)} · ${etapasLabel(d.etapas, lang)} · ${fmtIntensidad(d.intensidad)}/${INTENSIDAD.max}${d.nota ? ` — «${d.nota}»` : ""}`;
}

// ── V5.165 (owner, 2026-10-06) · las anotaciones de mejora de la Rueda del Sabor ────────────────────────────────────
// «Incorporemos las anotaciones de mejora que la herramienta Rueda del Sabor ya genera, incluyéndolas en lo que se obtiene
// después de hacer la evaluación.» La herramienta da, para las notas de DEFECTO (acético, butírico, mohoso, papa…), una
// «posible causa en el beneficio» con lo que hay que revisar. Llega aquí por `ruedaDatos.ts` (generado de la herramienta).
// Una marca de nivel 3 con causa produce su anotación; las de nivel 1 y 2 no (la herramienta solo anota notas concretas).
export type AnotacionDeMejora = { id: string; nota: string; ruta: string; causa: string };

const CAUSA_POR_ID = new Map<string, { es: string; en: string }>(
  RUEDA.flatMap((f) => f.subs.flatMap((s) => s.hojas.filter((h) => h.causa).map((h) => [idDeNota(s.id, h.id), h.causa!] as const)))
);

/** Las anotaciones de mejora de las notas marcadas (en el orden de la rueda). Vacío si ninguna nota marcada es de defecto. */
export function anotacionesDeMejora(rueda: unknown, lang: "es" | "en" = "es"): AnotacionDeMejora[] {
  return normalizaRueda(rueda)
    .filter((id) => CAUSA_POR_ID.has(id))
    .map((id) => ({ id, nota: descriptorLabel(id, lang), ruta: rutaDe(id, lang), causa: CAUSA_POR_ID.get(id)![lang] }));
}
