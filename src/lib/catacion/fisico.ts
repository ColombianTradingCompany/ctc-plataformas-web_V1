// ── Lo físico y lo descriptivo que la planilla anota además del puntaje (V5.135, owner 2026-10-01) — PURO ────────────
// El owner trajo el formato de Evaluación Física del CVA y dos renglones del formato descriptivo y pidió:
//   · que el Defecto primario y el secundario, que la planilla pide en GRAMOS («me gusta por simplicidad»), tengan un
//     «Registrar detalle» (R) para decir cuál defecto es cuál;
//   · el selector de COLOR del grano verde;
//   · las opciones de «Sensación en boca» (hasta dos) y de «Acidez» (una), que «no están en la rueda como tal».
// Las claves, las equivalencias y los rótulos ES/EN son los MISMOS que ya trae la CTCx Coffee Datasheet Tool del taller
// (`public/tools/coffee-datasheet/…`, V5.132): `qa-centro-calidad` los compara contra su HTML para que no haya dos listas.
// Nada de esto entra en el puntaje ni en el factor: documenta la muestra.

export type CategoriaDeDefecto = 1 | 2;
/** `granos` = cuántos granos hacen UN defecto completo (1:1 · 3:1 · 5:1 · 10:1). */
export type DefectoFisico = { key: string; cat: CategoriaDeDefecto; granos: number; es: string; en: string };

export const DEFECTOS_FISICOS: readonly DefectoFisico[] = [
  { key: "negro", cat: 1, granos: 1, es: "Grano negro", en: "Full black" },
  { key: "agrio", cat: 1, granos: 1, es: "Grano agrio", en: "Full sour" },
  { key: "cereza", cat: 1, granos: 1, es: "Cereza seca", en: "Dried cherry / pod" },
  { key: "hongos", cat: 1, granos: 1, es: "Daño por hongos", en: "Fungus damaged" },
  { key: "extrana", cat: 1, granos: 1, es: "Materia extraña", en: "Foreign matter" },
  { key: "insecto_grave", cat: 1, granos: 5, es: "Daño por insecto grave", en: "Severe insect damage" },
  { key: "negro_parcial", cat: 2, granos: 3, es: "Grano negro parcial", en: "Partial black" },
  { key: "agrio_parcial", cat: 2, granos: 3, es: "Grano agrio parcial", en: "Partial sour" },
  { key: "pergamino", cat: 2, granos: 5, es: "Pergamino", en: "Parchment" },
  { key: "flotador", cat: 2, granos: 5, es: "Flotador", en: "Floater" },
  { key: "inmaduro", cat: 2, granos: 5, es: "Inmaduro", en: "Immature / unripe" },
  { key: "averanado", cat: 2, granos: 5, es: "Averanado", en: "Withered" },
  { key: "concha", cat: 2, granos: 5, es: "Concha", en: "Shell" },
  { key: "partido", cat: 2, granos: 5, es: "Partido / mordido / cortado", en: "Broken / chipped / cut" },
  { key: "cascarilla", cat: 2, granos: 5, es: "Cascarilla", en: "Hull / husk" },
  { key: "insecto_leve", cat: 2, granos: 10, es: "Daño por insecto leve", en: "Slight insect damage" },
];

const entero = (v: unknown): number => {
  const n = Math.floor(Number(String(v ?? "").replace(",", ".")));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Granos → defectos completos (solo enteros), por categoría. La misma cuenta que `calcDefectos` de la Datasheet Tool. */
export function calcDefectos(cuentas: Record<string, string | number> | null | undefined): {
  filas: Record<string, { granos: number; completos: number }>;
  cat1: number;
  cat2: number;
  total: number;
  granos: number;
} {
  const filas: Record<string, { granos: number; completos: number }> = {};
  let cat1 = 0;
  let cat2 = 0;
  let granos = 0;
  for (const d of DEFECTOS_FISICOS) {
    const n = entero(cuentas?.[d.key]);
    const completos = Math.floor(n / d.granos);
    filas[d.key] = { granos: n, completos };
    granos += n;
    if (d.cat === 1) cat1 += completos;
    else cat2 += completos;
  }
  return { filas, cat1, cat2, total: cat1 + cat2, granos };
}

/** Solo los defectos conocidos y con un conteo > 0, como texto. */
export function normalizaDefectos(raw: unknown): Record<string, string> {
  const origen = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const d of DEFECTOS_FISICOS) {
    const n = entero(origen[d.key]);
    if (n > 0) out[d.key] = String(n);
  }
  return out;
}

export type Opcion = { key: string; es: string; en: string };

/** El color del grano verde, del más fresco al más viejo (formato de Evaluación Física del CVA). */
export const COLORES_DEL_VERDE: readonly Opcion[] = [
  { key: "verde_azul", es: "Verde-azul", en: "Blue-green" },
  { key: "verde_azulado", es: "Verde azulado", en: "Bluish-green" },
  { key: "verde", es: "Verde", en: "Green" },
  { key: "verdoso", es: "Verdoso", en: "Greenish" },
  { key: "verde_amarillento", es: "Verde amarillento", en: "Yellow-green" },
  { key: "amarillo_palido", es: "Amarillo pálido", en: "Pale yellow" },
  { key: "amarillento", es: "Amarillento", en: "Yellowish" },
  { key: "parduzco", es: "Parduzco", en: "Brownish" },
];

/** Sensación en boca · «select up to two» del formato descriptivo. */
export const TEXTURAS_EN_BOCA: readonly Opcion[] = [
  { key: "rough", es: "Áspero (arenoso, rugoso, rasposo)", en: "Rough (gritty, chalky, sandy)" },
  { key: "oily", es: "Aceitoso (untuoso, cremoso)", en: "Oily" },
  { key: "smooth", es: "Suave (aterciopelado, sedoso, almibarado)", en: "Smooth (velvety, silky, syrupy)" },
  { key: "drying", es: "Deja seca la boca (astringente)", en: "Mouth-drying" },
  { key: "metallic", es: "Metálico", en: "Metallic" },
];
export const MAX_TEXTURAS = 2;

/** Acidez · «select one» del formato descriptivo. */
export const TIPOS_DE_ACIDEZ: readonly Opcion[] = [
  { key: "seca", es: "Acidez seca (herbal, a pasto, agria)", en: "Dry acidity (herby, grassy, tart)" },
  { key: "dulce", es: "Acidez dulce (jugosa, frutal, brillante)", en: "Sweet acidity (juicy, fruit-like, bright)" },
];

const claves = (lista: readonly Opcion[]) => new Set(lista.map((o) => o.key));
const COLORES = claves(COLORES_DEL_VERDE);
const TEXTURAS = claves(TEXTURAS_EN_BOCA);
const ACIDECES = claves(TIPOS_DE_ACIDEZ);

export const esColor = (v: unknown): v is string => typeof v === "string" && COLORES.has(v);
export const esAcidez = (v: unknown): v is string => typeof v === "string" && ACIDECES.has(v);
/** Hasta dos texturas conocidas, sin repetir, en el orden del formato. */
export function normalizaTexturas(raw: unknown): string[] {
  const elegidas = new Set((Array.isArray(raw) ? raw : []).filter((x): x is string => typeof x === "string" && TEXTURAS.has(x)));
  return TEXTURAS_EN_BOCA.filter((o) => elegidas.has(o.key)).map((o) => o.key).slice(0, MAX_TEXTURAS);
}
export const opcionLabel = (lista: readonly Opcion[], key: string, lang: "es" | "en" = "es") => lista.find((o) => o.key === key)?.[lang] ?? key;
