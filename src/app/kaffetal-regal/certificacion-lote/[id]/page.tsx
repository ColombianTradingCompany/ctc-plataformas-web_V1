import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { lotEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { LotEudrCertDoc, type CertLot, type CertFinca } from "@/components/kaffetal-regal/LotEudrCertDoc";

type CommRow = { id: string; note: string; created_at: string; author_role: string };

type FincaJoin = {
  id: string;
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
} | null;

function toFincaEudrFields(f: NonNullable<FincaJoin>): FincaEudrFields {
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

function gate(message: string) {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center", color: "#333" }}>
      <h1 style={{ fontSize: 20 }}>Certificación EUDR del lote</h1>
      <p style={{ color: "#666" }}>{message}</p>
      <p style={{ marginTop: 20 }}>
        <a href="/kaffetal-regal">← Volver a mi panel</a>
      </p>
    </div>
  );
}

// Producer-facing lot-level EUDR certificate. Same gating spirit as the finca
// certificate (certificacion/[id]): authenticate via the session client, then
// read with the service-role client once ownership + readiness are verified.
// Readiness = lotEudrStatus "eudr_ready" (source finca Apta + risk level
// determined by CTC as insignificante).
export default async function LotEudrCertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return gate("Inicie sesión para ver la certificación de su lote.");

  const service = createServiceRoleClient();
  const { data } = await service
    .from("lots")
    .select(
      `id, name, producer_id, ficha_variedad, ficha_proceso, ficha_altitud_m,
       eudr_custody_stages, eudr_custody_method, eudr_custody_notes, eudr_country, eudr_country_risk, eudr_chain_complexity,
       eudr_product_risk, eudr_product_risk_factors, eudr_illegality_indicators, eudr_docs_available, eudr_cert_scheme,
       eudr_risk_level, eudr_mitigation_actions, eudr_mitigation_effective, eudr_mitigation_responsible,
       fincas(id, name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_legal_areas, eudr_tenure)`
    )
    .eq("id", id)
    .single();
  const lot = data as (CertLot & { producer_id: string; eudr_mitigation_effective: boolean | null; fincas: FincaJoin }) | null;

  if (!lot || lot.producer_id !== user.id) return gate("No encontramos este lote en su cuenta.");
  const sourceFincas = lot.fincas ? [toFincaEudrFields(lot.fincas)] : [];
  if (lotEudrStatus(lot, sourceFincas).code !== "eudr_ready") {
    return gate("Este lote todavía no completa su debida diligencia EUDR. La certificación estará disponible cuando la(s) finca(s) estén Aptas y CTC determine el nivel de riesgo.");
  }

  const [producers, { data: commsData }] = await Promise.all([
    fetchProducerContacts(service, [lot.producer_id]),
    service.from("producer_comm_log").select("id, note, created_at, author_role").eq("lot_id", id).order("created_at", { ascending: true }),
  ]);
  const producer = producers.get(lot.producer_id);
  const certFincas: CertFinca[] = lot.fincas
    ? [{ id: lot.fincas.id, name: lot.fincas.name ?? "—", municipio: lot.fincas.municipio, departamento: lot.fincas.departamento }]
    : [];

  return (
    <LotEudrCertDoc
      lot={lot}
      fincas={certFincas}
      producerName={`${producer?.fullName ?? "—"}${producer?.companyName ? ` · ${producer.companyName}` : ""}`}
      producerContact={[producer?.phone, producer?.email].filter(Boolean).join(" · ")}
      comms={(commsData as CommRow[] | null) ?? []}
    />
  );
}
