import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { lotEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { LotEudrCertDoc, type CertLot, type CertFinca } from "@/components/kaffetal-regal/LotEudrCertDoc";
import { deriveClaims, deriveArchetype, ARCHETYPE_LABEL, type ContributionInput } from "@/lib/lotComposition";
import { ORIGIN_CERTS, INTL_CERTS } from "@/components/kaffetal-regal/ficha/fichaData";

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
  eudr_tenure: string | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_mitigation_effective: boolean | null;
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
    eudrTenure: (f.eudr_tenure as FincaEudrFields["eudrTenure"]) || "",
    eudrIllegalityIndicators: f.eudr_illegality_indicators,
    eudrDocsAvailable: f.eudr_docs_available,
    eudrMitigationEffective: f.eudr_mitigation_effective,
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
      `id, name, producer_id, ficha_variedad, ficha_proceso, ficha_altitud_m, harvest_from, harvest_to, dds_reference, dds_verification_code, dds_filed_at,
       eudr_custody_stages, eudr_custody_method, eudr_custody_notes, eudr_country, eudr_country_risk, eudr_chain_complexity,
       eudr_product_risk, eudr_product_risk_factors, eudr_illegality_indicators, eudr_docs_available, eudr_cert_scheme,
       eudr_risk_level, eudr_mitigation_actions, eudr_mitigation_effective, eudr_mitigation_responsible,
       fincas(id, name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective)`
    )
    .eq("id", id)
    .single();
  const lot = data as (CertLot & { producer_id: string; eudr_mitigation_effective: boolean | null; harvest_from: string | null; harvest_to: string | null; dds_reference: string | null; dds_verification_code: string | null; dds_filed_at: string | null; fincas: FincaJoin }) | null;

  if (!lot || lot.producer_id !== user.id) return gate("No encontramos este lote en su cuenta.");
  // F2: el origen del lote son sus APORTES; fallback a la finca primaria para
  // lotes pre-F2 sin aportes espejados.
  type ContribJoin = { weight_kg: number | string | null; fincas: FincaJoin | FincaJoin[] | null };
  const { data: contribRaw } = await service
    .from("lot_contributions")
    .select("weight_kg, fincas(id, name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective)")
    .eq("lot_id", id);
  const contribJoins = (((contribRaw as ContribJoin[] | null) ?? []))
    .map((r) => ({ f: (Array.isArray(r.fincas) ? r.fincas[0] : r.fincas) as FincaJoin | null, kg: r.weight_kg != null ? Number(r.weight_kg) : null }))
    .filter((x): x is { f: NonNullable<FincaJoin>; kg: number | null } => !!x.f);
  const originJoins: { f: NonNullable<FincaJoin>; kg: number | null }[] =
    contribJoins.length ? contribJoins : lot.fincas ? [{ f: lot.fincas, kg: null }] : [];
  const sourceFincas = originJoins.map((x) => toFincaEudrFields(x.f));
  if (lotEudrStatus(lot, sourceFincas).code !== "eudr_ready") {
    return gate("Este lote todavía no completa su debida diligencia EUDR. La certificación estará disponible cuando la(s) finca(s) estén Aptas y CTC determine el nivel de riesgo.");
  }

  const [producers, { data: commsData }] = await Promise.all([
    fetchProducerContacts(service, [lot.producer_id]),
    service.from("producer_comm_log").select("id, note, created_at, author_role").eq("lot_id", id).order("created_at", { ascending: true }),
  ]);
  const producer = producers.get(lot.producer_id);
  const certFincas: CertFinca[] = originJoins.map((x) => ({
    id: x.f.id, name: x.f.name ?? "—", municipio: x.f.municipio, departamento: x.f.departamento,
  }));

  // F2: claims derivados — el Sello imprime SOLO los sellos al 100% (cobertura
  // parcial es un dato interno, nunca una afirmación en un documento).
  const contribInputs: ContributionInput[] = originJoins.map((x) => ({
    fincaId: x.f.id, fincaName: x.f.name ?? "—", weightKg: x.kg,
    municipio: x.f.municipio ?? "", departamento: x.f.departamento ?? "", pais: "Colombia",
  }));
  const { data: certRowsRaw } = await service
    .from("finca_certificates")
    .select("finca_id, scheme, valid_from, valid_to, verified_by_ctc")
    .in("finca_id", contribInputs.map((c) => c.fincaId));
  const claims = deriveClaims(
    contribInputs,
    (((certRowsRaw as { finca_id: string; scheme: string; valid_from: string | null; valid_to: string | null; verified_by_ctc: boolean }[] | null) ?? [])).map((c) => ({
      fincaId: c.finca_id, scheme: c.scheme, validFrom: c.valid_from, validTo: c.valid_to, verifiedByCtc: c.verified_by_ctc,
    })),
    { from: lot.harvest_from, to: lot.harvest_to }
  );
  const SCHEME_LABEL: Record<string, string> = Object.fromEntries([
    ...ORIGIN_CERTS,
    ...INTL_CERTS.map(([key, , label]) => [key, label] as [string, string]),
  ]);
  const derivedClaims = claims
    .filter((c) => c.claim)
    .map((c) => ({ label: SCHEME_LABEL[c.scheme] ?? c.scheme, verified: c.fullyVerified }));
  const archetype = deriveArchetype(contribInputs);

  return (
    <LotEudrCertDoc
      lot={lot}
      fincas={certFincas}
      producerName={`${producer?.fullName ?? "—"}${producer?.companyName ? ` · ${producer.companyName}` : ""}`}
      producerContact={[producer?.phone, producer?.email].filter(Boolean).join(" · ")}
      comms={(commsData as CommRow[] | null) ?? []}
      derivedClaims={derivedClaims}
      archetypeLabel={archetype ? ARCHETYPE_LABEL[archetype] : null}
      harvestWindow={lot.harvest_from && lot.harvest_to ? `${lot.harvest_from} → ${lot.harvest_to}` : null}
      dds={lot.dds_reference ? { reference: lot.dds_reference, verificationCode: lot.dds_verification_code, filedAt: lot.dds_filed_at } : null}
    />
  );
}
