// DANE code lookup for EUDR due diligence: given a finca's departamento +
// municipio (free text the producer typed), resolve the official 5-digit DANE
// code (2-digit department + 3-digit municipality). Source data is generated
// from refs_EUDR/Tabla-Códigos-Dane.pdf into daneCodes.data.ts.
//
// Matching is name-based and therefore fuzzy: the app stores names, not codes,
// so we normalize both sides (uppercase, strip accents, ñ→n, drop punctuation)
// and fall back to a municipality-only match when it's globally unambiguous.
import { DANE_ENTRIES, type DaneEntry } from "./daneCodes.data";

export type { DaneEntry };

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .replace(/�/g, "N") // stray replacement char (was Ñ in the source)
    .toUpperCase()
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// The only department whose app name diverges from the DANE table beyond
// accents: the table abbreviates "Norte de Santander" as "N DE SANTANDER".
function normDept(s: string): string {
  const n = norm(s);
  if (n === "NORTE DE SANTANDER" || n === "N DE SANTANDER") return "N DE SANTANDER";
  return n;
}

const byDeptMun = new Map<string, DaneEntry>();
const byMun = new Map<string, DaneEntry | null>(); // null marks an ambiguous (repeated) municipio name
for (const e of DANE_ENTRIES) {
  byDeptMun.set(`${normDept(e.dep)}|${norm(e.mun)}`, e);
  const mk = norm(e.mun);
  byMun.set(mk, byMun.has(mk) ? null : e);
}

// Resolve the DANE entry for a departamento + municipio. Tries the exact
// department+municipality pair first, then a unique municipality-only match.
export function daneCodeFor(departamento?: string | null, municipio?: string | null): DaneEntry | null {
  if (!municipio || municipio === "—") return null;
  const mun = norm(municipio);
  if (departamento && departamento !== "—") {
    const hit = byDeptMun.get(`${normDept(departamento)}|${mun}`);
    if (hit) return hit;
  }
  const only = byMun.get(mun);
  return only ?? null; // null when unknown or ambiguous without a matching department
}
