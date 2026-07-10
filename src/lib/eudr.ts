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
