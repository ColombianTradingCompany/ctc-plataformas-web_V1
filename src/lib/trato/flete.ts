// ── Flete a CTCx (V5.177 · owner, 2026-10-07 · docs/PLAN_CICLOS.md §6) ─────────────────────────────────────────────────────
// «No hay un "Auxilio de Transporte" […] introducir un valor de "Flete a CTCx" que utilice un código de envío con partnership
// corporativo con Servientrega, y hacer 3 niveles (cada uno se le agrega al precio final a pagar por carga equivalente, el
// Productor paga el resto en la oficina de envíos).» Las cooperativas no le suman flete al precio base: lo DESCUENTAN (la base
// FNC es puesta en bodega de Almacafé). CTCx hace lo contrario: suma un valor fijo por carga según la región de despacho.
// Los tres valores son variables de cada edición del PVC (Modelo Económico); la oferta congela su región y su valor.
// PURO.

import { CARGA_KG } from "./terminos";

export type RegionDeFlete = "santander" | "centro" | "sur";
export type FletePorRegion = Record<RegionDeFlete, number>;
/** El flete que congela una oferta (y su contrato): la región elegida y su valor por carga. */
export type FleteDelTrato = { region: RegionDeFlete; carga: number };

export const REGIONES_DE_FLETE: readonly RegionDeFlete[] = ["santander", "centro", "sur"];

export const REGION_DE_FLETE_LABEL: Record<RegionDeFlete, string> = {
  santander: "Regional Santander",
  centro: "Nacional Centro",
  sur: "Nacional Sur",
};

/** De dónde despacha el productor (los ejemplos de la tarifa corporativa a Bucaramanga). */
export const REGION_DE_FLETE_EJEMPLOS: Record<RegionDeFlete, string> = {
  santander: "Santander y Norte de Santander",
  centro: "Antioquia, Eje Cafetero, Tolima, Cundinamarca, Boyacá, Valle",
  sur: "Huila, Cauca, Nariño, Putumayo, Caquetá",
};

/** Los valores del owner (COP por carga de 125 kg de CPS): 200, 400 y 560 COP por kg. */
export const FLETE_A_CTCX_POR_DEFECTO: FletePorRegion = { santander: 25000, centro: 50000, sur: 70000 };

export const esRegionDeFlete = (v: unknown): v is RegionDeFlete => typeof v === "string" && (REGIONES_DE_FLETE as readonly string[]).includes(v);

/** Los tres valores de una edición; la que no los tiene fijados usa los del owner. */
export function fletesDeLaEdicion(f: Partial<FletePorRegion> | null | undefined): FletePorRegion {
  return {
    santander: f?.santander ?? FLETE_A_CTCX_POR_DEFECTO.santander,
    centro: f?.centro ?? FLETE_A_CTCX_POR_DEFECTO.centro,
    sur: f?.sur ?? FLETE_A_CTCX_POR_DEFECTO.sur,
  };
}

/** El flete congelado en una fila de `lot_offers` o `purchase_contracts` (null si no lleva). */
export function fleteDeLaFila(f: { flete_region?: string | null; flete_carga?: number | string | null }): FleteDelTrato | null {
  return esRegionDeFlete(f.flete_region) && f.flete_carga != null && Number.isFinite(Number(f.flete_carga)) ? { region: f.flete_region, carga: Number(f.flete_carga) } : null;
}

/** COP por kg de CPS de un flete por carga (25.000 → 200). */
export const fletePorKg = (carga: number) => carga / CARGA_KG;

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const SANTANDERES = ["santander", "norte de santander"];
const SUR = ["huila", "cauca", "narino", "putumayo", "caqueta"];

/**
 * La región que se sugiere por el departamento de la finca. Fuera de Colombia, o sin departamento, no se sugiere nada: CTCx la
 * elige en la oferta.
 */
export function regionSugerida(departamento: string | null | undefined, pais?: string | null): RegionDeFlete | null {
  if (pais && sinTildes(pais) !== "colombia") return null;
  if (!departamento?.trim()) return null;
  const d = sinTildes(departamento);
  if (SANTANDERES.includes(d)) return "santander";
  if (SUR.includes(d)) return "sur";
  return "centro";
}

/** La frase del flete para el productor (contrato, calculadora): región, valor por carga y por kg, y quién paga el resto. */
export function textoDelFlete(region: RegionDeFlete, carga: number): string {
  const cop = (n: number) => `$${Math.round(n).toLocaleString("es-CO")} COP`;
  return `El precio incluye el Flete a CTCx de la región ${REGION_DE_FLETE_LABEL[region]}: ${cop(carga)} por carga equivalente (${cop(fletePorKg(carga))} por kg), ya sumados al precio final. El Productor despacha con el código de envío corporativo de CTCx en Servientrega y paga el envío en la oficina; ese valor le reconoce parte del flete y el resto corre por su cuenta.`;
}
