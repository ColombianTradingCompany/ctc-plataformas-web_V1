import type { SupabaseClient } from "@supabase/supabase-js";
import { lotEudrStatus, type FincaEudrFields } from "@/lib/eudr";

// ── Compuerta EUDR del intake (orden: EUDR → pago → muestra → Arena) ─────────
// Un lote solo debería poder (1) saldar su inscripción y (2) confirmar el recibo
// de su muestra cuando su debida diligencia EUDR está resuelta: finca de origen
// Apta y nivel de riesgo determinado (Art. 10-11) — es decir, cuando
// lotEudrStatus() dice "eudr_ready". Este helper carga lote + finca primaria y
// responde con el estado canónico, para que actions.ts y clubActions.ts usen
// EXACTAMENTE la misma regla que el chip de la UI y el certificado.

type FincaJoinRow = {
  name: string | null;
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
};

function toFields(f: FincaJoinRow): FincaEudrFields {
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
  };
}

export type EudrGateResult = { ready: boolean; label: string };

const FINCA_COLS =
  "name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective";

export async function lotEudrGate(service: SupabaseClient, lotId: string): Promise<EudrGateResult> {
  // F2 (2026-07-29): el origen del lote son sus APORTES (lot_contributions) —
  // TODAS las fincas aportantes deben tener Visa vigente, no solo la primaria.
  // Fallback a lots.finca_id para lotes pre-F2 sin aportes espejados.
  const [{ data: lot }, { data: contribRows }] = await Promise.all([
    service
      .from("lots")
      .select(`eudr_risk_level, eudr_mitigation_effective, fincas(${FINCA_COLS})`)
      .eq("id", lotId)
      .maybeSingle(),
    service.from("lot_contributions").select(`fincas(${FINCA_COLS})`).eq("lot_id", lotId),
  ]);
  if (!lot) return { ready: false, label: "Lote no encontrado" };

  // PostgREST devuelve el join many-to-one como objeto, pero el tipo inferido
  // dice array — se aceptan ambas formas (mismo patrón que clubActions).
  const asOne = (raw: unknown) => (Array.isArray(raw) ? raw[0] : raw) as FincaJoinRow | null | undefined;
  let fincas = ((contribRows ?? []) as { fincas: unknown }[])
    .map((r) => asOne(r.fincas))
    .filter((f): f is FincaJoinRow => !!f)
    .map(toFields);
  if (!fincas.length) {
    const fincaRaw = asOne(lot.fincas);
    fincas = fincaRaw ? [toFields(fincaRaw)] : [];
  }

  const s = lotEudrStatus(
    { eudr_risk_level: lot.eudr_risk_level ?? null, eudr_mitigation_effective: lot.eudr_mitigation_effective ?? null },
    fincas
  );
  return { ready: s.code === "eudr_ready", label: s.label };
}
