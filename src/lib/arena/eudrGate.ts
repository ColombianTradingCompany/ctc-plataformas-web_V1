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
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
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
    eudrLegalAreas: f.eudr_legal_areas || [],
    eudrTenure: (f.eudr_tenure as FincaEudrFields["eudrTenure"]) || "",
  };
}

export type EudrGateResult = { ready: boolean; label: string };

export async function lotEudrGate(service: SupabaseClient, lotId: string): Promise<EudrGateResult> {
  const { data: lot } = await service
    .from("lots")
    .select(
      "eudr_risk_level, eudr_mitigation_effective, fincas(name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_legal_areas, eudr_tenure)"
    )
    .eq("id", lotId)
    .maybeSingle();
  if (!lot) return { ready: false, label: "Lote no encontrado" };

  // PostgREST devuelve el join many-to-one como objeto, pero el tipo inferido
  // dice array — se aceptan ambas formas (mismo patrón que clubActions).
  const fincaRaw = Array.isArray(lot.fincas) ? lot.fincas[0] : lot.fincas;
  const fincas = fincaRaw ? [toFields(fincaRaw as FincaJoinRow)] : [];

  const s = lotEudrStatus(
    { eudr_risk_level: lot.eudr_risk_level ?? null, eudr_mitigation_effective: lot.eudr_mitigation_effective ?? null },
    fincas
  );
  return { ready: s.code === "eudr_ready", label: s.label };
}
