// EUDR (Reglamento UE 2023/1115) voluntary due-diligence roll-up. Ported from
// the reference "EUDR Ready · Café" prototype's fincaEstado()/loteEstado(),
// reinterpreted onto this system's real Finca/Lot records instead of a
// from-scratch localStorage model. Pure functions, no Supabase import, so the
// exact same rules run in the producer-facing client (Kaffetal Regal) and in
// BCP's server-rendered review pages without drifting apart.
import type { Finca } from "@/components/kaffetal-regal/data";

export type EudrTone = "ok" | "pend" | "stop";

export type EudrStatus = {
  code:
    | "no_apta"
    | "pendiente"
    | "apta"
    | "sin_origen"
    | "bloqueado"
    | "en_revision"
    // 2026-08-20: CTC ya aprobó la finca pero todavía no ha REMITIDO el
    // expediente (`fincas.eudr_cert_shared`). La Visa existe; el papel no ha
    // salido. Ver fincaEudrStatus().
    | "aprobada"
    | "rechazada"
    | "eudr_ready";
  label: string;
  tone: EudrTone;
};

function status(code: EudrStatus["code"], label: string, tone: EudrTone): EudrStatus {
  return { code, label, tone };
}

// A narrow structural pick, not the whole Finca -- so callers that don't have a
// full Finca object on hand (BCP's server-rendered pages select their own column
// list directly, without going through Kaffetal Regal's client-side row mapper)
// can build a lightweight object that satisfies this instead of faking unrelated
// fields like `hist`/`carac`/`videoUrl`.
// 2026-08-06 (owner): `eudrLegalAreas` salió de este pick. Las «Áreas de
// legislación verificadas» —igual que «Sostenibilidad y enfoque social» y la
// «Evidencia disponible»— son material de la PROPIA revisión de CTC (se llenan
// en /ocp/fincas, el productor ni las ve ni puede contestar «No lo sé»), así
// que no pueden contar como vacío de la declaración del productor: tenían la
// Visa clavada en «en trámite» sin que el productor tuviera nada que hacer.
// Documentan la revisión en el dossier; no determinan la Visa.
export type FincaEudrFields = Pick<
  Finca,
  | "name"
  | "ha"
  | "lat"
  | "lng"
  | "vereda"
  | "mun"
  | "depto"
  | "eudrDeforestationFree"
  | "eudrLegalProduction"
  | "eudrTenure"
  // Risk questionnaire (2026-07-24) -- moved onto the finca from the lot in the
  // Pasaporte/Visa/Sello restructure. The two yes/no answers below are what the
  // risk determination (deriveFincaRiskLevel) needs; the checkbox lists and free
  // text are stored/displayed but don't gate the Visa on their own.
  | "eudrIllegalityIndicators"
  | "eudrDocsAvailable"
  | "eudrMitigationEffective"
> & {
  // ── El veredicto de CTC (2026-08-20) ────────────────────────────────────
  // OPCIONALES a propósito: los callers que arman un objeto ligero desde su
  // propio SELECT (las páginas del OCP) pueden no traerlos. Cuando faltan,
  // fincaEudrStatus() se queda en la DECLARACIÓN y nunca dice «Visa vigente»
  // por su cuenta — el bug que tenían era justo el contrario: afirmarla.
  //
  // `status`      — la revisión de CTC (fincas.status: pending_review /
  //                 approved / rejected), la escriben approveFinca/rejectFinca.
  // `certShared`  — CTC remitió el expediente EUDR (fincas.eudr_cert_shared).
  status?: Finca["status"];
  certShared?: boolean;
};

// A point (lat/lng) is the primary evidence; a known vereda/municipio/departamento
// is the fallback the reference allows for micro/small producers using a postal
// address instead of exact coordinates.
function hasGeo(f: Pick<FincaEudrFields, "lat" | "lng" | "vereda" | "mun" | "depto">) {
  if (f.lat.trim() && f.lng.trim()) return true;
  return f.vereda !== "—" || f.mun !== "—" || f.depto !== "—";
}

// ── Parcelas (F1, 2026-07-29 — docs/EUDR_RESTRUCTURE_PLAN.md) ───────────────
// El átomo probatorio del Art. 9 es la PARCELA (área continua dentro de una
// propiedad), no la finca: una finca con tres cafetales separados son tres
// parcelas en la DDS, y un polígono no puede cubrir varias. Regla de la
// Comisión: ≤4 ha basta un punto; >4 ha exige polígono.
export type ParcelaGeoFields = {
  areaHa: number | null;
  hasPoint: boolean;
  hasPolygon: boolean;
};

export function parcelaGeoOk(p: ParcelaGeoFields): boolean {
  if (!p.hasPoint && !p.hasPolygon) return false;
  return (p.areaHa ?? 0) > 4 ? p.hasPolygon : true;
}

/** true = TODAS las parcelas están geolocalizadas según el umbral de 4 ha.
 *  Una lista vacía es "sin parcelas": incompleta a propósito — sin parcelas no
 *  hay conjunto de geometrías que declarar en una DDS. */
export function parcelasGeoComplete(parcelas: ParcelaGeoFields[]): boolean {
  return parcelas.length > 0 && parcelas.every(parcelaGeoOk);
}

// ── La narrativa de viaje (2026-07-24, decisión del owner) ──────────────────
// La debida diligencia EUDR vive SOLO en la finca:
//   · el PRODUCTOR porta su "Pasaporte" (su identidad de proveedor, CTC-P-…),
//   · cada FINCA obtiene su "VISA" (la aptitud EUDR que otorga BCP),
//   · cada LOTE recibe su "SELLO" — heredado por completo de la Visa de su(s)
//     finca(s) de origen, sin debida diligencia propia del lote.
// F1: cuando el caller tiene las parcelas a mano (FincaModal, approveFinca, el
// editor de BCP), la completitud geográfica se juzga POR PARCELAS — todas
// localizadas, con polígono donde el área supera 4 ha. Los callers legacy que
// no pasan el parámetro conservan la regla anterior (punto/dirección de la
// finca), para no romper listados que solo tienen la fila de `fincas`.
// PASO 1 — LA DECLARACIÓN DEL PRODUCTOR, y nada más.
// Responde «¿este expediente está completo y limpio?» mirando SOLO lo que el
// productor aportó. No sabe nada de la revisión de CTC, a propósito: es la
// compuerta que aprueba approveFinca(), y si mirara el veredicto de CTC no se
// podría aprobar nada (la aprobación exigiría estar ya aprobada).
// `apta` aquí significa «listo para que CTC lo mire», NO «Visa vigente».
export function fincaEudrDeclaracion(
  f: FincaEudrFields | null | undefined,
  parcelas?: ParcelaGeoFields[]
): EudrStatus {
  if (!f) return status("no_apta", "Sin Visa", "stop");
  if (f.eudrDeforestationFree === false || f.eudrLegalProduction === false) {
    return status("no_apta", "Sin Visa", "stop");
  }
  const haOk = f.ha !== "—" && f.ha.trim() !== "" && Number(f.ha.replace(",", ".")) > 0;
  const geoOk = parcelas !== undefined ? parcelasGeoComplete(parcelas) : hasGeo(f);
  // Risk determination (transferred from the lot 2026-07-24). "" until the two
  // yes/no questions of the questionnaire are answered -> still en trámite.
  const risk = deriveFincaRiskLevel(f);
  const incomplete =
    !f.name ||
    !geoOk ||
    !haOk ||
    f.eudrDeforestationFree !== true ||
    !f.eudrTenure ||
    risk === "";
  if (incomplete) return status("pendiente", "Visa en trámite", "pend");
  // Questionnaire answered but the residual risk is not insignificant (and no
  // effective mitigation on record): the Visa is withheld until it's addressed.
  if (risk === "no_insignificante") {
    return status("no_apta", "Sin Visa · riesgo no insignificante", "stop");
  }
  return status("apta", "Visa vigente", "ok");
}

// PASO 2 — LA VISA QUE SE PINTA EN PANTALLA.
// El defecto que arregla (owner, 2026-08-20): esta función DERIVABA la Visa
// solo de las respuestas del productor y nunca leía `fincas.status`. De ahí
// los tres síntomas de un mismo agujero: la finca decía «Visa vigente» ANTES
// de que el OCP la aprobara; aprobarla no cambiaba nada visible; y «Rechazar»
// —que sí escribe status='rejected' y su fila de auditoría— parecía no hacer
// nada, porque nadie miraba ese campo.
//
// El orden importa: PRIMERO la declaración (si el expediente está incompleto,
// eso es lo accionable para el productor y CTC no tiene nada que revisar
// todavía), y solo sobre una declaración completa se aplica el veredicto:
//
//   rechazada                       → «Visa rechazada por CTC»
//   pending_review                  → «Visa en revisión por CTC»
//   approved, expediente sin remitir→ «Visa aprobada · expediente sin remitir»
//   approved + expediente remitido  → «Visa vigente»
//
// Sin `status` (callers que no lo traen en su SELECT) se queda en la
// declaración y devuelve `en_revision`: nunca afirma una Visa que no consta.
export function fincaEudrStatus(
  f: FincaEudrFields | null | undefined,
  parcelas?: ParcelaGeoFields[]
): EudrStatus {
  const declaracion = fincaEudrDeclaracion(f, parcelas);
  if (!f || declaracion.code !== "apta") return declaracion;

  if (f.status === "rejected") {
    return status("rechazada", "Visa rechazada por CTC", "stop");
  }
  if (f.status === "approved") {
    return f.certShared
      ? status("apta", "Visa vigente", "ok")
      : status("aprobada", "Visa aprobada · expediente sin remitir", "pend");
  }
  return status("en_revision", "Visa en revisión por CTC", "pend");
}

// The lot-level input is intentionally a narrow pick, not the whole FichaFormData --
// this module shouldn't need to know about cupping scores or certificates to answer
// "is this lot EUDR ready."
export type LotEudrInput = {
  eudr_risk_level: string | null; // "" | "insignificante" | "no_insignificante" | null
  eudr_mitigation_effective: boolean | null;
};

// `sourceFincas` must already be resolved by the caller (the lot's finca_id plus any
// additional_estate_ids, mapped to real Finca records). Unlike the reference tool --
// which had no structural link between a lot and its origin fincas and so needed a
// manual "¿el sistema conecta este lote con su finca?" yes/no -- lots here are always
// FK'd to real fincas, so an empty `sourceFincas` list IS that "not traceable" case.
//
// 2026-07-24 (owner): el SELLO del lote se HEREDA por completo de la Visa de sus
// fincas de origen — el lote ya no tiene debida diligencia propia (los campos
// eudr_* del lote quedan como datos históricos; el parámetro `lot` se conserva
// por compatibilidad de firma pero YA NO participa en la determinación). Regla:
// todas las fincas con Visa vigente ⇒ Sello listo.
export function lotEudrStatus(lot: LotEudrInput, sourceFincas: FincaEudrFields[]): EudrStatus {
  void lot; // heredado: la determinación es 100 % de la finca
  if (!sourceFincas.length) return status("sin_origen", "Sin origen", "pend");

  // Lambda explícita: .map(fincaEudrStatus) pasaría el ÍNDICE como el nuevo
  // parámetro opcional `parcelas`.
  const fincaStatuses = sourceFincas.map((f) => fincaEudrStatus(f));
  if (fincaStatuses.some((s) => s.code === "no_apta" || s.code === "rechazada")) {
    return status("bloqueado", "Sin Visa de finca", "stop");
  }
  if (fincaStatuses.some((s) => s.code === "pendiente")) {
    return status("pendiente", "Visa de finca en trámite", "pend");
  }
  // 2026-08-20: la Visa completa pero todavía en manos de CTC (en revisión, o
  // aprobada sin expediente remitido) NO es un Sello. Antes cualquier cosa que
  // no fuera "no_apta"/"pendiente" caía en el `return` de abajo y el lote decía
  // «Sello listo» con la finca sin aprobar siquiera.
  if (fincaStatuses.some((s) => s.code === "en_revision")) {
    return status("pendiente", "Visa de finca en revisión por CTC", "pend");
  }
  if (fincaStatuses.some((s) => s.code === "aprobada")) {
    return status("pendiente", "Visa aprobada · expediente sin remitir", "pend");
  }
  return status("eudr_ready", "Sello listo", "ok");
}

// The lot-level "Nivel de riesgo determinado" used to be a raw dropdown BCP
// picked by eye -- error-prone and inconsistent between reviewers. EUDR
// Art. 10-11 actually defines this as a determination from the underlying
// risk factors, so it's derived here instead: illegality indicators, missing
// documentation, or a high-risk country/region each push the raw risk to
// "no insignificante" on their own; if none of those apply, risk is
// "insignificante". A raw "no insignificante" can still be brought back down
// if BCP recorded effective mitigation (Art. 11) -- everything else stays
// "no insignificante" until it's addressed. Returns "" (not yet
// determinable) until country risk + both yes/no factors are set.
export type LotRiskFactors = {
  eudr_country_risk: string | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_mitigation_effective: boolean | null;
};

// --- Riesgo país / región -------------------------------------------------
// Clasificación oficial de la Comisión Europea, Reglamento de Ejecución (UE)
// 2025/1093 (22 mayo 2025): solo Rusia, Bielorrusia, Myanmar y Corea del Norte
// son "alto"; la gran mayoría de países son "bajo"; los que no figuran como
// bajo ni alto quedan como "estándar". Los orígenes cafeteros de la región
// (Colombia, Perú, Venezuela, Panamá) son todos estándar. Se declara el país y
// la clasificación se deriva de aquí, en vez de que alguien la elija a mano.
export const EUDR_ORIGIN_COUNTRIES = ["Colombia", "Perú", "Venezuela", "Panamá"] as const;
export type EudrCountryRisk = "Bajo" | "Estándar" | "Alto";
export const EUDR_COUNTRY_RISK: Record<string, EudrCountryRisk> = {
  Colombia: "Estándar",
  Perú: "Estándar",
  Venezuela: "Estándar",
  Panamá: "Estándar",
};
export function countryRiskFor(country: string | null | undefined): EudrCountryRisk {
  if (!country) return "Estándar";
  return EUDR_COUNTRY_RISK[country] ?? "Estándar";
}

// --- Complejidad de la cadena ---------------------------------------------
// Se autocontesta con las etapas marcadas en "Cadena de custodia": entre más
// eslabones toquen el café entre la finca y la exportación, mayor la
// complejidad y el riesgo de mezcla (Guía CE, Art. 10(2)(i)). 6 etapas
// posibles -> ≤2 baja, 3-4 media, 5-6 alta. "" mientras no haya ninguna.
export function deriveChainComplexity(stages: string[] | null | undefined): "" | "Bajo" | "Medio" | "Alto" {
  const n = stages?.length ?? 0;
  if (n === 0) return "";
  if (n <= 2) return "Bajo";
  if (n <= 4) return "Medio";
  return "Alto";
}

// --- Riesgo propio del producto -------------------------------------------
// En vez de un nivel elegido a dedo, se infiere de preguntas sí/no: cada
// factor marcado ("sí") es una circunstancia que diluye el origen o rompe la
// trazabilidad del lote. Sin factores = bajo; 1-2 = medio; 3+ = alto. Como son
// casillas (sin marcar = "no"), siempre resuelve a por lo menos "Bajo".
export const PRODUCT_RISK_QUESTIONS: [string, string][] = [
  ["mezcla", "El café se acopia o mezcla con café de otros orígenes o productores."],
  ["sin_id_lote", "La identidad del lote (finca de origen) no se conserva durante el proceso."],
  ["intermediarios", "Pasa por intermediarios o comercializadores ajenos a CTC."],
  ["transform_terceros", "Se trilla, tuesta o transforma donde terceros, sin control de CTC."],
];

// ── Lo mismo, DICHO AL DERECHO (owner, 2026-08-20) ─────────────────────────
// Las de arriba son las que se GUARDAN: cada clave marcada es un factor de
// riesgo presente, y así llevan meses escritas en `eudr_product_risk_factors`.
// Pero preguntárselas al productor tal cual le pide confirmar lo malo de su
// propio café — se lee como una acusación, y marcar casillas para EMPEORAR su
// perfil es justo al revés de como funciona todo lo demás en la pantalla.
//
// Estas son las MISMAS cuatro situaciones enunciadas en positivo. La finca
// marca lo que SÍ hace bien; la ausencia de la marca es el factor de riesgo.
// Es un cambio de REDACCIÓN, no de datos: el almacenamiento y deriveProductRisk
// siguen contando factores negativos, así que las fincas ya registradas
// significan exactamente lo mismo que ayer y no hace falta migrar nada.
export const PRODUCT_RISK_AFFIRMATIONS: [string, string][] = [
  ["mezcla", "El café de esta finca se mantiene separado del de otros orígenes y productores."],
  ["sin_id_lote", "La identidad del lote (de qué finca salió) se conserva durante todo el proceso."],
  ["intermediarios", "Va de la finca a CTC sin pasar por intermediarios ni comercializadores ajenos."],
  ["transform_terceros", "La trilla y la transformación ocurren bajo control de CTC, no donde terceros."],
];
export function deriveProductRisk(factors: string[] | null | undefined): "Bajo" | "Medio" | "Alto" {
  const n = factors?.length ?? 0;
  if (n === 0) return "Bajo";
  if (n <= 2) return "Medio";
  return "Alto";
}

export function deriveLotRiskLevel(f: LotRiskFactors): "" | "insignificante" | "no_insignificante" {
  const countryRisk = f.eudr_country_risk || "Estándar";
  if (f.eudr_illegality_indicators === null || f.eudr_docs_available === null) return "";

  const raw: "insignificante" | "no_insignificante" =
    f.eudr_illegality_indicators === true || f.eudr_docs_available === false || countryRisk === "Alto"
      ? "no_insignificante"
      : "insignificante";

  if (raw === "no_insignificante" && f.eudr_mitigation_effective === true) return "insignificante";
  return raw;
}

// The finca-level determination (2026-07-24): same Art. 10-11 rules as
// deriveLotRiskLevel, now sourced from the finca's own questionnaire. País is
// implicit -- a finca in this system is in Colombia, so country risk is always
// "Estándar" (never the "Alto" escalator). Returns "" until both yes/no factors
// (indicios de ilegalidad, documentación disponible) are answered.
export function deriveFincaRiskLevel(
  f: Pick<FincaEudrFields, "eudrIllegalityIndicators" | "eudrDocsAvailable" | "eudrMitigationEffective">
): "" | "insignificante" | "no_insignificante" {
  return deriveLotRiskLevel({
    eudr_country_risk: "Estándar",
    eudr_illegality_indicators: f.eudrIllegalityIndicators,
    eudr_docs_available: f.eudrDocsAvailable,
    eudr_mitigation_effective: f.eudrMitigationEffective,
  });
}

// Shared by PaneA5Eudr.tsx (live display) and FichaView.tsx (the EUDR
// sub-stage gate) so both resolve a lot's origin finca(s) the same way --
// Single Estate uses `estate` (a finca name, matching PaneA2's picker),
// anything else uses `additional_estate_ids` (real finca ids).
// A plain <img> against Google's Static Maps API -- no JS SDK needed, so it
// renders instantly and can't hit the WebGL rendering issues the interactive
// picker (FincaMapPicker) has run into. Works identically server-side (BCP's
// read-only review pages) and client-side (the producer's own dashboard finca
// cards), so both surfaces render a saved pin/polygon the same way instead of
// drifting apart. Returns null when there's nothing to show yet, so callers
// can fall back to a placeholder.
export function mapPreviewUrl(
  loc: {
    lat?: string | number | null;
    lng?: string | number | null;
    polygon?: { lat: number; lng: number }[] | null;
  },
  size = "360x220"
): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  // terrain, NOT hybrid/satellite: the Static Maps API refuses satellite
  // imagery for EEA-billed accounts (CTC's Google Cloud billing is in
  // Germany) -- confirmed live 2026-07-12 with a 403 "satellite and hybrid
  // map types are not available for your account and region". The
  // interactive picker (Maps JavaScript API) is not affected and stays
  // on hybrid.
  const params = new URLSearchParams({ size, maptype: "terrain", key: apiKey });
  if (loc.polygon && loc.polygon.length >= 3) {
    // Close the ring (repeat the first vertex) and give it a fill -- an open
    // `path` renders as a route line, not an area. 0xFFCD00 is CTC gold.
    const ring = [...loc.polygon, loc.polygon[0]];
    params.set("path", "color:0xFFCD00FF|weight:3|fillcolor:0xFFCD0033|" + ring.map((p) => `${p.lat},${p.lng}`).join("|"));
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }
  if (loc.lat != null && loc.lng != null && loc.lat !== "" && loc.lng !== "") {
    params.set("center", `${loc.lat},${loc.lng}`);
    params.set("zoom", "15");
    params.set("markers", `color:red|${loc.lat},${loc.lng}`);
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }
  return null;
}

// F2 (2026-07-29): el origen del lote son APORTES (lot_contributions /
// datasheet.contributions) — este es el resolver nuevo; resolveSourceFincas
// queda como fallback legacy para datasheets pre-F2 sin aportes sembrados.
export function resolveContributionFincas(contribs: { finca_id: string }[], fincas: Finca[]): Finca[] {
  const seen = new Set<string>();
  const out: Finca[] = [];
  for (const c of contribs) {
    if (seen.has(c.finca_id)) continue;
    seen.add(c.finca_id);
    const f = fincas.find((x) => x.id === c.finca_id);
    if (f) out.push(f);
  }
  return out;
}

export function resolveSourceFincas(
  originCategory: string,
  estate: string,
  additionalEstateIds: string[],
  fincas: Finca[]
): Finca[] {
  const multi = !!originCategory && originCategory !== "Single Estate";
  if (multi) {
    return additionalEstateIds.map((id) => fincas.find((f) => f.id === id)).filter((f): f is Finca => !!f);
  }
  const f = fincas.find((f) => f.name === estate);
  return f ? [f] : [];
}
