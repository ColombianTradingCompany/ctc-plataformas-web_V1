// EUDR (Reglamento UE 2023/1115) voluntary due-diligence roll-up. Ported from
// the reference "EUDR Ready · Café" prototype's fincaEstado()/loteEstado(),
// reinterpreted onto this system's real Finca/Lot records instead of a
// from-scratch localStorage model. Pure functions, no Supabase import, so the
// exact same rules run in the producer-facing client (Kaffetal Regal) and in
// BCP's server-rendered review pages without drifting apart.
import type { Finca } from "@/components/kaffetal-regal/data";

export type EudrTone = "ok" | "pend" | "stop";

export type EudrStatus = {
  code: "no_apta" | "pendiente" | "apta" | "sin_origen" | "bloqueado" | "en_revision" | "eudr_ready";
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
  | "eudrLegalAreas"
  | "eudrTenure"
>;

// A point (lat/lng) is the primary evidence; a known vereda/municipio/departamento
// is the fallback the reference allows for micro/small producers using a postal
// address instead of exact coordinates.
function hasGeo(f: Pick<FincaEudrFields, "lat" | "lng" | "vereda" | "mun" | "depto">) {
  if (f.lat.trim() && f.lng.trim()) return true;
  return f.vereda !== "—" || f.mun !== "—" || f.depto !== "—";
}

export function fincaEudrStatus(f: FincaEudrFields | null | undefined): EudrStatus {
  if (!f) return status("no_apta", "No apta", "stop");
  if (f.eudrDeforestationFree === false || f.eudrLegalProduction === false) {
    return status("no_apta", "No apta", "stop");
  }
  const haOk = f.ha !== "—" && f.ha.trim() !== "" && Number(f.ha.replace(",", ".")) > 0;
  const incomplete =
    !f.name ||
    !hasGeo(f) ||
    !haOk ||
    f.eudrDeforestationFree !== true ||
    f.eudrLegalAreas.length === 0 ||
    !f.eudrTenure;
  if (incomplete) return status("pendiente", "Pendiente", "pend");
  return status("apta", "Apta", "ok");
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
export function lotEudrStatus(lot: LotEudrInput, sourceFincas: FincaEudrFields[]): EudrStatus {
  if (!sourceFincas.length) return status("sin_origen", "Sin origen", "pend");

  const fincaStatuses = sourceFincas.map(fincaEudrStatus);
  if (fincaStatuses.some((s) => s.code === "no_apta")) {
    return status("bloqueado", "Bloqueado por finca", "stop");
  }
  if (lot.eudr_risk_level === "no_insignificante" && lot.eudr_mitigation_effective !== true) {
    return status("en_revision", "En revisión", "pend");
  }
  if (fincaStatuses.some((s) => s.code === "pendiente")) {
    return status("pendiente", "Finca pendiente", "pend");
  }
  if (!lot.eudr_risk_level) {
    return status("pendiente", "Pendiente", "pend");
  }
  return status("eudr_ready", "EUDR Ready", "ok");
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
  const params = new URLSearchParams({ size, maptype: "hybrid", key: apiKey });
  if (loc.polygon && loc.polygon.length >= 3) {
    params.set("path", "color:0xffcc00ff|weight:3|" + loc.polygon.map((p) => `${p.lat},${p.lng}`).join("|"));
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
