import "server-only";

import { createEphemeralClient } from "@/lib/supabase/server";
import { esGradoValido, GRADO_POR_ID, SCA_DECIMALES, type GradoId } from "@/lib/grados/definicion";
import type { AtributoSCA } from "./atributosSca";
import { SNEAK_PEEK_MOCK } from "./sneakPeekMock";
import { CTC_RAZON } from "@/lib/legal";

// ── «Active Catalogue Sneak Peek» · el dato ──────────────────────────────────
// El vistazo al Catálogo Activo que se enseña SIN sesión: en CTC Home y en la
// landing de Kaffetal Regal como anzuelo, y en las landings de Cherry Picked
// EN LUGAR del catálogo directo — desde el 2026-08-17 el catálogo completo (con
// precios, MOQ y kilos) vive solo detrás del login. Plan: docs/V5_CONSOLAS_PLAN.md §1.
//
// DE DÓNDE LEE, Y POR QUÉ DE AHÍ. De la vista `public_lot_catalog` y de nada
// más. Es una vista `SECURITY DEFINER` estrecha, legible por `anon`, que ya
// existe para la tienda: expone las columnas de exhibición de los lotes
// publicados y deja fuera la Ficha Técnica cruda (`lots.datasheet`) y la
// geolocalización de la finca. La regla de la casa es esa vista y no una
// política RLS amplia sobre `lots`/`fincas` — ver el patrón en HANDOFF y en
// `lib/coffeed/wallActions.ts`.
//
// LO QUE NO PUEDE SALIR DE AQUÍ. `SneakPeekLot` no tiene ningún campo comercial
// y eso es la garantía, no una promesa: no hay dónde poner el precio, el MOQ,
// los kilos, el anticipo, la fecha de llegada ni nada de
// `public_transparency_pricing`. Si algún día hace falta un campo nuevo en la
// tarjeta, se añade al tipo a propósito y el guardián
// (`scripts/qa-sneak-peek-check.mjs`) obliga a justificarlo.

/** Los tres idiomas de la red. Se declara aquí, y no se importa de un `i18n`,
 *  porque las dos familias de superficies tienen su propio proveedor de idioma
 *  (`components/lang/i18n` en Home/KR, `components/cherry-picked/i18n` en la
 *  familia CP) con la misma unión: el módulo recibe el VALOR y no se ata a
 *  ninguno de los dos. */
export type SneakPeekLang = "es" | "en" | "de";

/** Tyrian queda fuera por definición: es solo de subasta y `publishLot` lo
 *  rechaza en el catálogo, así que no puede aparecer en un teaser del catálogo. */
export type SneakPeekGrade = Exclude<GradoId, "tyrian">;

// Los diez atributos viven en `atributosSca.ts`, SIN `server-only`, para que un
// componente de cliente pueda importarlos como VALOR (ver la cabecera de aquel
// archivo: importar un valor desde aquí arrastraba Supabase al navegador). Aquí
// se reexportan para que quien ya lee este módulo no tenga que saberlo.
export { ATRIBUTOS_SCA, type AtributoSCA } from "./atributosSca";

export type SneakPeekLot = {
  /** `lot_id` de la vista, o un id del espacio `mock-lote-NN`. */
  id: string;
  /** El código corto que ve el comprador (`GD-…`), nunca el UUID. */
  code: string;
  name: string;
  grade: SneakPeekGrade;
  /** Formateado con los dos decimales de la escala, o «—». */
  score: string;
  /** El puntaje es el autorreporte del productor, no una evaluación aceptada.
   *  La tarjeta lo rotula: un estimado no puede parecer verificado. */
  scoreEstimated: boolean;
  finca: string;
  municipio: string | null;
  departamento: string | null;
  altitudeM: number | null;
  variety: string | null;
  process: string | null;
  cup: string | null;
  /** Rótulo de temporada por idioma. Viaja en el dato para que un mock no pueda
   *  pintarse sin él. Los lotes vivos llevan el de la temporada en curso. */
  season: Record<SneakPeekLang, string>;
  mock: boolean;
  /** Referencia interna del trimestre de cosecha (Notion `Harvest Season`). */
  harvestQuarter?: string;
  /** La foto de la cara frontal de la tarjeta. Sin ella, la tarjeta cae al sello
   *  del grado, que nunca falta. */
  image?: string;
  /** Los diez atributos del formulario SCA. El reverso los dibuja como telaraña
   *  («Análisis Intrínseco»). Son datos de CATA, no comerciales: el puntaje ya
   *  se enseña, y su desglose es lo que un tostador mira para saber POR QUÉ ese
   *  café puntúa lo que puntúa. En los lotes mock están inventados por encargo
   *  del owner (ver `sneakPeekMock.ts`); los vivos los traerán de
   *  `lot_evaluations` cuando la Arena los llene. */
  intrinseco?: Record<AtributoSCA, number>;
  /** El extracto de la RUEDA DE CATACIÓN del lote (SVG), que el reverso enseña
   *  bajo las notas. La dibuja `scripts/build-ruedas-mock.mjs` con la propia
   *  herramienta de la casa (`public/tools/rueda-catacion.html`), no con una
   *  rueda paralela. Los lotes vivos aún no la traen — misma historia que la
   *  ficha: falta dónde guardarla. */
  wheel?: string;
  /** La ficha técnica del lote, que abre el botón del reverso. Los lotes VIVOS
   *  todavía no tienen dónde guardarla —no hay columna para ella en
   *  `lot_listings` ni en `lots`— así que hoy solo la traen los mock; sin ella,
   *  el reverso no dibuja el botón. Ver docs/V5_CONSOLAS_PLAN.md §9. */
  datasheetUrl?: string;
};

export type SneakPeekPayload = {
  lots: SneakPeekLot[];
  /** Honestidad del conjunto: todo vivo, mezcla, o todo mock. */
  source: "live" | "mixed" | "mock";
  generatedAt: string;
};

/** Cuántas tarjetas quiere la cinta. Los mock solo rellenan hasta aquí, así que
 *  cada lote real que se publica desplaza a uno. */
export const SNEAK_PEEK_CARDS = 7;

const TEMPORADA_ACTUAL: Record<SneakPeekLang, string> = {
  es: "Temporada actual",
  en: "Current season",
  de: "Aktuelle Saison",
};

const CODIGO_GRADO: Record<SneakPeekGrade, string> = { black: "BK", red: "RD", blue: "BL", gold: "GD" };

/** Mismo criterio que `listingCode()` en la tienda: el comprador ve un código
 *  corto derivado del id, nunca el UUID entero. */
function codigoDeLote(lotId: string, grade: SneakPeekGrade): string {
  return `${CODIGO_GRADO[grade]}-${lotId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

type FilaCatalogo = {
  lot_id: string;
  name: string;
  grade: string | null;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  ficha_puntaje_estimado: number | null;
  official_score: number | null;
  ficha_notas_cata: string | null;
  finca_name: string | null;
  ctc_selection: boolean;
  municipio: string | null;
  departamento: string | null;
};

function aTarjeta(fila: FilaCatalogo): SneakPeekLot | null {
  // El grado que se pinta es el que la plataforma tiene GUARDADO, igual que en
  // la tienda: si la cinta lo derivara del puntaje y la tienda no, las dos
  // dirían cosas distintas del mismo lote. (Los mock sí lo derivan, porque su
  // origen es Notion y allí el grado no es de fiar — ver `sneakPeekMock.ts`.)
  const id = fila.grade;
  if (!id || !esGradoValido(id) || id === "tyrian") return null;
  const grade: SneakPeekGrade = id;

  const oficial = fila.official_score;
  const estimado = fila.ficha_puntaje_estimado;
  const puntaje = oficial ?? estimado;

  return {
    id: fila.lot_id,
    code: codigoDeLote(fila.lot_id, grade),
    name: fila.name,
    grade,
    score: puntaje != null ? Number(puntaje).toFixed(SCA_DECIMALES) : "—",
    scoreEstimated: oficial == null && estimado != null,
    // La vitrina de un lote que CTC compró en firme lleva a CTC, no a la
    // finca (decisión del owner, D3.1). La vista ya NO devuelve el nombre
    // real en ese caso —es legible por `anon`, taparlo aquí no serviría de
    // nada—, así que esto pone el RÓTULO desde su fuente única.
    finca: fila.ctc_selection ? CTC_RAZON : fila.finca_name ?? "—",
    municipio: fila.municipio,
    departamento: fila.departamento,
    altitudeM: fila.ficha_altitud_m,
    variety: fila.ficha_variedad,
    process: fila.ficha_proceso,
    cup: fila.ficha_notas_cata,
    season: TEMPORADA_ACTUAL,
    mock: false,
  };
}

async function leeCatalogoVivo(): Promise<SneakPeekLot[]> {
  // Cliente anónimo y sin cookies: esto es dato público y no debe depender de
  // ninguna sesión (ni heredarla). La vista ya filtra por publicado.
  const supabase = createEphemeralClient();

  const [{ data: publicadas }, { data: filas }] = await Promise.all([
    supabase.from("lot_listings").select("lot_id").eq("status", "published"),
    supabase
      .from("public_lot_catalog")
      .select(
        "lot_id, name, grade, ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_puntaje_estimado, official_score, ficha_notas_cata, finca_name, municipio, departamento, ctc_selection"
      ),
  ]);

  // La vista incluye `sold_out` además de `published` (la tienda los sigue
  // enseñando agotados). Un teaser que invita a entrar no debe anunciar lo que
  // ya no se puede comprar, así que se cruza con las publicaciones vivas.
  const vivas = new Set((publicadas ?? []).map((p) => p.lot_id as string));

  return ((filas ?? []) as FilaCatalogo[])
    .filter((f) => vivas.has(f.lot_id))
    .map(aTarjeta)
    .filter((l): l is SneakPeekLot => l !== null);
}

/**
 * Lo que sirve `/api/catalogo/sneak-peek`. Nunca lanza: la cinta es un vistazo,
 * y si la base calla la página no se entera (el componente no pinta nada).
 */
export async function getSneakPeekPayload(): Promise<SneakPeekPayload> {
  let vivos: SneakPeekLot[] = [];
  try {
    vivos = await leeCatalogoVivo();
  } catch {
    vivos = [];
  }

  // ── El relleno con mock (se va solo) ───────────────────────────────────────
  // Mientras no haya siete lotes publicados, se completa con los de
  // `sneakPeekMock.ts`, cada uno rotulado «Temporada anterior». En cuanto haya
  // siete vivos, `faltan` es 0 y los mock dejan de aparecer sin tocar código.
  // ESTE es el bloque que se borra el día que sobren (receta en ese archivo).
  const faltan = Math.max(0, SNEAK_PEEK_CARDS - vivos.length);
  const mocks = faltan > 0 ? SNEAK_PEEK_MOCK.slice(0, faltan) : [];

  return {
    lots: [...vivos, ...mocks],
    source: vivos.length === 0 ? "mock" : mocks.length === 0 ? "live" : "mixed",
    generatedAt: new Date().toISOString(),
  };
}

/** El sello del grado, para que la tarjeta no dependa de una foto. Sale de la
 *  definición única de grados, que es la cara oficial de cada uno. */
export function selloDeGrado(grade: SneakPeekGrade): string {
  return GRADO_POR_ID[grade].logo;
}
