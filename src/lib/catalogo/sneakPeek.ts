import "server-only";

import { createEphemeralClient, createServiceRoleClient } from "@/lib/supabase/server";
import { esGradoValido, GRADO_POR_ID, SCA_DECIMALES, type GradoId } from "@/lib/grados/definicion";
import { caracterizacionDelDossier, planillaDeEvaluacion } from "@/lib/kaffetal/dossierEvaluacion";
import { aPerfilCtcx, rotuloCtcx, urlDeImagenCtcx, PERFIL_CTCX_SELECT, VISTA_PERFIL_CTCX, type FilaPerfilCtcx, type PerfilCtcx } from "./perfilCtcx";
import { rutaDelLote } from "./codigoPublico";
import { COLUMNAS_VITRINA, VISTA_VITRINA, type FilaVitrina } from "./vitrinaVista";

// ── «Active Catalogue Sneak Peek» · el dato ──────────────────────────────────
// El vistazo al Catálogo Activo que se enseña SIN sesión: en CTC Home y en la
// landing de Kaffetal Regal como anzuelo, y en las landings de Cherry Picked
// EN LUGAR del catálogo directo — desde el 2026-08-17 el catálogo completo (con
// precios, MOQ y kilos) vive solo detrás del login. Plan: docs/V5_CONSOLAS_PLAN.md §1.
//
// V5.198 (owner, 2026-10-10): «quiero que los lotes que lleguen al Triage de Catálogo Activo aparezcan ya en el bloque que usamos
// en las páginas (CTC, KR, CP), reemplazando los Mock que teníamos y usando la información real». Los siete lotes mock de la
// temporada anterior (`sneakPeekMock.ts`, sus fotos, sus ruedas y sus fichas en PDF) se retiraron: la cinta enseña SOLO lotes
// reales, los que llegaron al Triage (un trato por ventana vigente, una declaración viva o una partida en el Stock CTCx), los más
// recientes primero. Si todavía no está declarado en el Catálogo Activo, la tarjeta lo dice («Próximamente»).
//
// DE DÓNDE LEE, Y POR QUÉ DE AHÍ. De la vista `public_lot_vitrina` (V5.198), con el cliente anónimo: una vista estrecha, legible
// por `anon`, con las columnas de exhibición de esos lotes y nada más (ni la Ficha cruda, ni la georreferencia, ni el productor).
// La regla de la casa es esa vista y no una política RLS amplia sobre `lots`/`fincas` — ver HANDOFF y `lib/coffeed/wallActions.ts`.
// DESPUÉS de esa compuerta, y solo para los lotes que pasaron, se lee con el service role la evaluación que rige, reducida a lo que
// pinta el reverso: los ocho atributos del CVA y las notas de la rueda con su intensidad.
//
// LO QUE NO PUEDE SALIR DE AQUÍ. `SneakPeekLot` no tiene ningún campo comercial
// y eso es la garantía, no una promesa: no hay dónde poner el precio, el MOQ,
// los kilos, el anticipo, la fecha de llegada ni el FOB mínimo. Si algún día hace
// falta un campo nuevo en la tarjeta, se añade al tipo a propósito y el guardián
// (`scripts/qa-sneak-peek-check.mjs`) obliga a justificarlo.

/** Los tres idiomas de la red. Se declara aquí, y no se importa de un `i18n`,
 *  porque las dos familias de superficies tienen su propio proveedor de idioma
 *  (`components/lang/i18n` en Home/KR, `components/cherry-picked/i18n` en la
 *  familia CP) con la misma unión: el módulo recibe el VALOR y no se ata a
 *  ninguno de los dos. */
export type SneakPeekLang = "es" | "en" | "de";

/** Tyrian queda fuera por definición: es solo de subasta y el Triage de Catálogo Activo
 *  lo rechaza (`triage_declarar`, V5.196) — la vista tampoco lo trae. */
export type SneakPeekGrade = Exclude<GradoId, "tyrian">;

/** Una nota de la rueda para la tarjeta: su id (el ícono y el nombre salen de la rueda, en el idioma de la página) y cuánta hay. */
export type SneakPeekNota = { id: string; intensidad: number };

export type SneakPeekLot = {
  /** `lot_id` de la vista. */
  id: string;
  /** La referencia que ve el comprador y que busca «Find my Lot»: `CTC-L-XXXXXXXX`. */
  code: string;
  name: string;
  grade: SneakPeekGrade;
  /** El Punto que rige el grado, con los dos decimales de la escala, o «—». */
  score: string;
  /** El protocolo de ese Punto: CVA (el principal desde la V5.189) o SCA 2004, que vale lo mismo. */
  scoreProtocol: "CVA" | "SCA";
  finca: string;
  municipio: string | null;
  departamento: string | null;
  altitudeM: number | null;
  variety: string | null;
  process: string | null;
  /** Las notas que marcó el Q-Grader en la rueda, las más intensas primero (hasta seis). Datos de CATA, no comerciales. */
  notes: SneakPeekNota[];
  /** Los ocho atributos del CVA (evaluación afectiva, 1 a 9) en el orden del formulario; null si la evaluación no es CVA. */
  cva: { k: string; v: number }[] | null;
  /** ¿Ya está declarado en el Catálogo Activo? Si no, la tarjeta dice «Próximamente». */
  inCatalogue: boolean;
  /** La foto de la cara frontal: la de la finca o del lote (`/api/catalogo/foto/…`), o la imagen de CTCx Selection. Sin ella, la
   *  tarjeta cae al sello del grado, que nunca falta. */
  image?: string;
  /** El Dossier público del lote (CTCx Public Catalogue), RELATIVO: el componente lo hace absoluto contra `www`. */
  dossierPath: string;
};

export type SneakPeekPayload = {
  lots: SneakPeekLot[];
  generatedAt: string;
};

/** Cuántas tarjetas lleva la cinta como mucho (los más recientes en el Triage). */
export const SNEAK_PEEK_CARDS = 12;

type FilaEvaluacion = { lot_id: string; created_at: string; physical_data: unknown; sca_data: unknown; rueda: unknown; rueda_detalle: unknown };

/** La taza que rige de cada lote, reducida a lo que pinta el reverso. Se lee DESPUÉS de la compuerta, solo para esos lotes. */
async function tazasDe(lotIds: string[]): Promise<Map<string, { cva: { k: string; v: number }[] | null; notas: SneakPeekNota[] }>> {
  const tazas = new Map<string, { cva: { k: string; v: number }[] | null; notas: SneakPeekNota[] }>();
  if (!lotIds.length) return tazas;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("lot_evaluations")
    .select("lot_id, created_at, physical_data, sca_data, rueda, rueda_detalle")
    .in("lot_id", lotIds)
    .eq("status", "accepted")
    .eq("rige_grado", true)
    .order("created_at", { ascending: false });
  for (const fila of (data ?? []) as FilaEvaluacion[]) {
    if (tazas.has(fila.lot_id)) continue;
    const cifras = caracterizacionDelDossier({}, planillaDeEvaluacion(fila), "es").cifras;
    if (!cifras) continue;
    tazas.set(fila.lot_id, {
      cva: cifras.cva.length === 8 ? cifras.cva.map((x) => ({ k: x.k, v: x.v })) : null,
      notas: [...cifras.rueda].sort((a, b) => b.intensidad - a.intensidad).slice(0, 6).map((x) => ({ id: x.id, intensidad: x.intensidad })),
    });
  }
  return tazas;
}

function aTarjeta(fila: FilaVitrina, perfil: PerfilCtcx, taza: { cva: { k: string; v: number }[] | null; notas: SneakPeekNota[] } | null): SneakPeekLot | null {
  // El grado que se pinta es el que la plataforma tiene GUARDADO (lo puso CTCx al galardonar), igual que en la tienda.
  const id = fila.grade;
  if (!id || !esGradoValido(id) || id === "tyrian") return null;
  const grade: SneakPeekGrade = id;
  return {
    id: fila.lot_id,
    code: fila.referencia,
    name: fila.nombre,
    grade,
    score: fila.punto != null ? Number(fila.punto).toFixed(SCA_DECIMALES) : "—",
    scoreProtocol: fila.protocolo === "sca2004" ? "SCA" : "CVA",
    // La vitrina de un lote que CTC compró en firme lleva a CTC, no a la finca (decisión del owner, D3.1). La vista ya NO devuelve
    // el nombre real en ese caso —es legible por `anon`, taparlo aquí no serviría de nada—, así que esto pone el RÓTULO desde su
    // fuente única.
    finca: fila.ctc_selection ? rotuloCtcx(perfil) : fila.finca_name ?? "—",
    // V5.85: la imagen por lote de CTCx Selection (o la del perfil); V5.198: la de la finca o el lote, servida por la compuerta.
    image: fila.ctc_selection ? (urlDeImagenCtcx(fila.ctcx_imagen_path) ?? perfil.imagenUrl ?? undefined) : fila.tiene_foto ? `/api/catalogo/foto/${fila.referencia}` : undefined,
    municipio: fila.municipio,
    departamento: fila.departamento,
    altitudeM: fila.altitud_m,
    variety: fila.variedad,
    process: fila.proceso,
    notes: taza?.notas ?? [],
    cva: taza?.cva ?? null,
    inCatalogue: fila.en_catalogo,
    dossierPath: rutaDelLote(fila.referencia),
  };
}

async function leeVitrina(): Promise<SneakPeekLot[]> {
  // Cliente anónimo y sin cookies: esto es dato público y no debe depender de ninguna sesión (ni heredarla).
  const supabase = createEphemeralClient();
  const [{ data: filas }, { data: perfilRaw }] = await Promise.all([
    supabase.from(VISTA_VITRINA).select(COLUMNAS_VITRINA).order("desde", { ascending: false }).limit(SNEAK_PEEK_CARDS),
    // V5.85: el perfil ÚNICO de CTCx Selection (respuesta 7): lo que la tarjeta enseña en vez de la finca.
    supabase.from(VISTA_PERFIL_CTCX).select(PERFIL_CTCX_SELECT).maybeSingle(),
  ]);
  const perfil = aPerfilCtcx((perfilRaw as FilaPerfilCtcx | null) ?? null);
  const vivas = (filas ?? []) as FilaVitrina[];
  const tazas = await tazasDe(vivas.map((f) => f.lot_id));
  return vivas.map((f) => aTarjeta(f, perfil, tazas.get(f.lot_id) ?? null)).filter((l): l is SneakPeekLot => l !== null);
}

/**
 * Lo que sirve `/api/catalogo/sneak-peek`. Nunca lanza: la cinta es un vistazo,
 * y si la base calla la página no se entera (el componente pinta solo «Find my Lot»).
 */
export async function getSneakPeekPayload(): Promise<SneakPeekPayload> {
  let lots: SneakPeekLot[] = [];
  try {
    lots = await leeVitrina();
  } catch {
    lots = [];
  }
  return { lots, generatedAt: new Date().toISOString() };
}

/** El sello del grado, para que la tarjeta no dependa de una foto. Sale de la
 *  definición única de grados, que es la cara oficial de cada uno. */
export function selloDeGrado(grade: SneakPeekGrade): string {
  return GRADO_POR_ID[grade].logo;
}
