import type { FincaEudrFields } from "@/lib/eudr";

// ── De una fila de `fincas` a los campos que la Visa EUDR evalúa · UNA fuente (V5.61) ──
// Este constructor estaba escrito DOS veces —en la página de Fincas y en la de Lotes del OCP— con
// los mismos quince campos, y la tabla única iba a ser la tercera. Un campo olvidado en una copia
// no falla: deja la Visa clavada en «en revisión» para todo el mundo y cierra compuertas sin decir
// nada. Es justo lo que `qa-visa-check` vigila, y ahora lo vigila en un solo sitio.
//
// ⚠️ EL SELECT de quien llame tiene que pedir TODAS estas columnas, incluidas `status` y
// `eudr_cert_shared`: el veredicto de CTC viaja con el resto (2026-08-20). Sin `status`,
// `fincaEudrStatus()` se queda en «en revisión» y la consola —que es donde se aprueba— no
// reflejaría su propia decisión.
export type FilaDeFincaParaLaVisa = {
  name: string | null;
  status: string | null;
  hectares: string | number | null;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_tenure: string | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_mitigation_effective: boolean | null;
  eudr_cert_shared: boolean | null;
};

/** Las columnas de `fincas` que el constructor necesita, para pegar en un `.select()`. */
export const COLUMNAS_DE_LA_VISA =
  "name, status, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective, eudr_cert_shared";

export function fincaEudrFieldsDe(f: FilaDeFincaParaLaVisa): FincaEudrFields {
  return {
    name: f.name || "",
    ha: f.hectares != null ? String(f.hectares) : "—",
    lat: f.eudr_lat != null ? String(f.eudr_lat) : "",
    lng: f.eudr_lng != null ? String(f.eudr_lng) : "",
    vereda: f.vereda || "—",
    mun: f.municipio || "—",
    depto: f.departamento || "—",
    eudrDeforestationFree: f.eudr_deforestation_free,
    eudrLegalProduction: f.eudr_legal_production,
    eudrTenure: (f.eudr_tenure as FincaEudrFields["eudrTenure"]) || "",
    eudrIllegalityIndicators: f.eudr_illegality_indicators,
    eudrDocsAvailable: f.eudr_docs_available,
    eudrMitigationEffective: f.eudr_mitigation_effective,
    status: (f.status as FincaEudrFields["status"]) ?? "pending_review",
    certShared: !!f.eudr_cert_shared,
  };
}

/** Lo que le falta a la declaración EUDR de una finca para estar completa (la lista que ve el operador). */
export function vaciosDeLaDeclaracion(f: FincaEudrFields): string[] {
  const gaps: string[] = [];
  if (!f.name) gaps.push("nombre");
  if (!((f.lat && f.lng) || f.vereda !== "—" || f.mun !== "—" || f.depto !== "—")) gaps.push("geolocalización o dirección");
  if (!(f.ha !== "—" && Number(f.ha.replace(",", ".")) > 0)) gaps.push("área cultivada");
  if (f.eudrDeforestationFree !== true) gaps.push("declaración de no deforestación");
  // Las «áreas de legislación verificadas» NO cuentan como vacío (2026-08-06): son revisión propia de
  // CTC (pestaña Atributos del editor), no un pendiente del productor.
  if (!f.eudrTenure) gaps.push("tenencia de la tierra");
  if (f.eudrIllegalityIndicators == null || f.eudrDocsAvailable == null) gaps.push("cuestionario de riesgo (indicios / documentos)");
  return gaps;
}
