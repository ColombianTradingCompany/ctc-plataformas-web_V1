// ── Triage de Catálogo Activo · el FOB mínimo (V5.196) — PURO ──────────────────────────────────────────────────────────────────
// El owner, 2026-10-09: en el Triage «debo recibir las ofertas que fueron aceptadas y también las cantidades del Stock CTCx,
// añadirles una referencia de costos de empaque hasta FOB, poner el O&P de CTCx y declararlo con ello como parte del catálogo
// activo», con «el ancla fundamental de cada lote en precio FOB mínimo». Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.3 y §3.
//
//   café por kg de verde      = (precio de origen + trilla) ÷ conversión          (lo verde: su costo, conversión 1)
//   FOB mínimo (COP/kg verde) = (café + Empacado hasta FOB) × (1 + O&P %)
//   FOB mínimo (US$/kg verde) = lo anterior ÷ TRM
//
// La base hace la MISMA cuenta en `triage_declarar` (`docs/migraciones/2026-10-09_triage_catalogo.sql`) y la guarda; aquí está para
// enseñarla en vivo antes de declarar. El O&P NO tiene valor aquí ni en ningún archivo del repositorio: vive en
// `platform_settings.triage_catalogo` (es margen de CTCx; `PVC_BCP_PLAN.md`, confidencialidad). Sin red.

import { BANDAS5, PARAMS_V211, type Banda5 } from "@/lib/pvc/motor";

/** Dónde vive el Triage: la ruta de «Ofertas CP Aceptadas» se conservó (los contratos siguen en `/ocp/contratos/<id>`). */
export const TRIAGE_PATH = "/ocp/contratos";
export const CONTRATOS_LISTA_PATH = "/ocp/contratos/lista";

/** V5.203 · corrección (H15): el enlace a una entrada del Triage. `?partida=` / `?contrato=` desplaza hasta ella y la resalta; el
 *  formulario solo se abre solo con `declarar` (los enlaces «Declarar en el Triage →»). Un enlace de CONSULTA («En catálogo CF-…»,
 *  «Triage →» del Stock) ya no abre el formulario de corregir por su cuenta. */
export function rutaDelTriage(e: { partida?: string | null; contrato?: string | null; declarar?: boolean }): string {
  const q = new URLSearchParams();
  if (e.partida) q.set("partida", e.partida);
  else if (e.contrato) q.set("contrato", e.contrato);
  if (e.declarar && (e.partida || e.contrato)) q.set("declarar", "1");
  const qs = q.toString();
  return qs ? `${TRIAGE_PATH}?${qs}` : TRIAGE_PATH;
}
export const CLAVE_AJUSTES_TRIAGE = "triage_catalogo";

/** PVC v2.1.1: 125 kg de CPS dan 93,09 kg de excelso en FR 94, de los que se garantizan 78 (`kg_excelso`, `kg_g`). */
export const FR_DE_REFERENCIA = 94;
const KG_EXCELSO = PARAMS_V211.kg_excelso;
const KG_GARANTIZADO = PARAMS_V211.kg_g;

const r4 = (n: number) => Math.round(n * 10000) / 10000;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** kg de verde por kg de CPS para un factor de rendimiento: 70 ÷ FR × 78 ÷ 93,09. Un FR fuera de 60–140 no se cree. */
export function conversionDeFactor(fr: number | null | undefined): { conversion: number; fuente: "factor" | "pvc"; fr: number } {
  const valido = typeof fr === "number" && Number.isFinite(fr) && fr >= 60 && fr <= 140;
  const f = valido ? fr : FR_DE_REFERENCIA;
  return { conversion: r6((70 / f) * (KG_GARANTIZADO / KG_EXCELSO)), fuente: valido ? "factor" : "pvc", fr: f };
}

export type EntradaFob = {
  /** COP por kg de ORIGEN: el precio del contrato (kg de CPS, flete a CTCx incluido) o el costo de la partida. */
  precioOrigenCopKg: number;
  /** COP por kg de CPS (0 si lo que se declara ya es verde). */
  trillaCopKg: number;
  /** kg de verde por kg de origen (1 si ya es verde). */
  conversion: number;
  /** COP por kg de verde, de la referencia de Empacado hasta FOB. */
  empaqueCopKg: number;
  opPct: number;
  trm: number;
};

export type DesgloseFob = { cafeCopKg: number; baseCopKg: number; opCopKg: number; fobCopKg: number; fobUsdKg: number };

export function calcularFobMinimo(e: EntradaFob): DesgloseFob | null {
  if (!(e.conversion > 0) || !(e.trm > 0) || !(e.precioOrigenCopKg >= 0) || !(e.empaqueCopKg >= 0) || !(e.opPct >= 0) || !(e.trillaCopKg >= 0)) return null;
  const cafeCopKg = (e.precioOrigenCopKg + e.trillaCopKg) / e.conversion;
  const baseCopKg = cafeCopKg + e.empaqueCopKg;
  const fobCopKg = baseCopKg * (1 + e.opPct / 100);
  return { cafeCopKg: r4(cafeCopKg), baseCopKg: r4(baseCopKg), opCopKg: r4(fobCopKg - baseCopKg), fobCopKg: r4(fobCopKg), fobUsdKg: r6(fobCopKg / e.trm) };
}

/** El precio de venta con que nace un listado: el FOB mínimo redondeado HACIA ARRIBA a US$ 0,05 (plan §6.9). El − 1e-6 evita
 *  que la coma flotante suba un múltiplo que llegó calculado (0,1 + 0,2 = 0,30000000000000004 subiría a 0,35). La base lo hace en
 *  `numeric`, que es exacto. */
export const precioInicial = (fobUsdKg: number) => Math.ceil(fobUsdKg * 20 - 1e-6) / 20;

/** El ancla de un listado: el MAYOR FOB mínimo de sus entradas vivas (el lote no se vende por debajo de su entrada más cara). */
export function anclaDelListado(fuentes: readonly { fobUsdKg: number; viva: boolean }[]): number | null {
  const vivas = fuentes.filter((f) => f.viva).map((f) => f.fobUsdKg);
  return vivas.length ? Math.max(...vivas) : null;
}

/** Lo que un trato por ventana puede llegar a ofrecer: declarado − retirado (kg de CPS). Lo VENDIDO sale de lo ya declarado al
 *  catálogo, así que no se resta otra vez. */
export const baseDelContrato = (c: { declaradoKg: number; retiradoKg: number }) => Math.max(0, Math.round((c.declaradoKg - c.retiradoKg) * 10) / 10);

/** Lo que queda por declarar de un contrato y si lo declarado se pasó (el productor retiró café ya declarado). */
export function cuentaDelContrato(c: { declaradoKg: number; retiradoKg: number; declaradoEnCatalogoKg: number }) {
  const base = baseDelContrato(c);
  const enCatalogo = Math.round(c.declaradoEnCatalogoKg * 10) / 10;
  return { baseKg: base, porDeclararKg: Math.max(0, Math.round((base - enCatalogo) * 10) / 10), deMasKg: Math.max(0, Math.round((enCatalogo - base) * 10) / 10) };
}

/** El escalón N2 del Modelo Económico (FCA Bogotá ≈ FOB) para un grado: se EXHIBE al lado del FOB mínimo, no gobierna. */
export function n2DelGrado(pila: readonly { b: string; n2: number }[] | null | undefined, grado: string | null | undefined): number | null {
  if (!pila?.length || !grado) return null;
  const banda = BANDAS5.find((b) => b.toLowerCase() === grado.toLowerCase());
  const fila = banda ? pila.find((f) => f.b === banda) : null;
  return fila && Number.isFinite(fila.n2) ? fila.n2 : null;
}

/** La unidad y el MOQ con que nace un listado: la bolsa del modelo (6 kg de verde) y el MOQ de su banda; se corrigen en Catálogo Activo. */
export function terminosIniciales(grado: string | null | undefined): { unidadKg: number; moqKg: number } {
  const banda = BANDAS5.find((b) => b.toLowerCase() === String(grado ?? "").toLowerCase()) as Banda5 | undefined;
  return { unidadKg: PARAMS_V211.bolsa, moqKg: banda ? PARAMS_V211.moq[banda] : PARAMS_V211.bolsa };
}

/** El componente de empaque de una referencia para una partida que YA está empacada: la referencia sin su sección de empaque. */
export function empaqueSinEmpacar(ref: { copKg: number; secciones: readonly { clave: string; copKg: number }[] }): number {
  const empaque = ref.secciones.find((s) => s.clave === "empaque")?.copKg ?? 0;
  return Math.max(0, r4(ref.copKg - empaque));
}
