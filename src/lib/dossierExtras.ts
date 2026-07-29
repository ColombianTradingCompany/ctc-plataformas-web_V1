import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DossierParcela, DossierCert } from "@/components/kaffetal-regal/EudrDossierDoc";
import { ORIGIN_CERTS, INTL_CERTS } from "@/components/kaffetal-regal/ficha/fichaData";

// F1 (2026-07-29, docs/EUDR_RESTRUCTURE_PLAN.md): carga compartida de parcelas
// y certificados para el dossier de la Visa — lo usan la ruta de BCP y la del
// productor, que resuelven la finca cada una con su propio cliente y guard.

const SCHEME_LABEL: Record<string, string> = Object.fromEntries([
  ...ORIGIN_CERTS,
  ...INTL_CERTS.map(([key, , label]) => [key, label] as [string, string]),
]);

export async function dossierParcelasAndCerts(
  client: SupabaseClient,
  fincaId: string
): Promise<{ parcelas: DossierParcela[]; certificates: DossierCert[] }> {
  const [{ data: parcelaRows }, { data: certRows }] = await Promise.all([
    client
      .from("finca_parcelas")
      .select("name, area_ha, lat, lng, polygon_geojson, position")
      .eq("finca_id", fincaId)
      .order("position", { ascending: true }),
    client
      .from("finca_certificates")
      .select("scheme, cert_number, valid_from, valid_to, holder_note, verified_by_ctc")
      .eq("finca_id", fincaId)
      .order("created_at", { ascending: true }),
  ]);
  return {
    parcelas: (parcelaRows ?? []).map((p) => ({
      name: p.name as string,
      areaHa: p.area_ha != null ? String(p.area_ha) : "",
      lat: p.lat != null ? String(p.lat) : "",
      lng: p.lng != null ? String(p.lng) : "",
      polygonPoints: Array.isArray(p.polygon_geojson) ? p.polygon_geojson.length : 0,
    })),
    certificates: (certRows ?? []).map((c) => ({
      schemeLabel: SCHEME_LABEL[c.scheme as string] ?? (c.scheme as string),
      certNumber: (c.cert_number as string | null) ?? "",
      validFrom: (c.valid_from as string | null) ?? "",
      validTo: (c.valid_to as string | null) ?? "",
      holderNote: (c.holder_note as string | null) ?? "",
      verifiedByCtc: !!c.verified_by_ctc,
    })),
  };
}
