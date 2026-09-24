import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { fincaEudrStatus, lotEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { fincaEudrFieldsDe } from "@/lib/ocp/fincaEudr";
import { deriveArchetype, ARCHETYPE_LABEL, type ContributionInput } from "@/lib/lotComposition";
import { ORIGIN_CERTS, INTL_CERTS, type FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";
import { ctcLotReference, fincaCode } from "@/components/kaffetal-regal/data";
import { GRADO_POR_ID, esGradoValido } from "@/lib/grados/definicion";
import { evaluacionQueRige } from "@/lib/evaluations";
import { rowToLotFicha, type LotFicha } from "@/lib/fichas/tipos";
import { LotDossierDoc, type DossierCertLine, type DossierFincaLine, type Lang } from "@/components/kaffetal-regal/LotDossierDoc";

export const dynamic = "force-dynamic";

// ── /kaffetal-regal/dossier/[id]?lang=es|en (V5.79) ─────────────────────────
// El dossier del lote para el productor: UN documento, en dos idiomas, con lo que la plataforma tiene del
// lote —identidad y trazabilidad, Pasaporte y Visa EUDR, caracterización (la ficha oficial ★ y la evaluación
// que rige el grado) y las certificaciones corroboradas—. Mismo patrón de compuerta que la Visa
// (`certificacion-lote/[id]`): se autentica con la cookie compartida y, verificada la propiedad, se lee
// con el service role. No exige Visa lista: el dossier dice en qué punto va cada cosa.

type FincaJoin = {
  id: string;
  name: string | null;
  municipio: string | null;
  departamento: string | null;
  status: string | null;
  eudr_cert_shared: boolean | null;
  hectares: string | number | null;
  vereda: string | null;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_tenure: string | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_mitigation_effective: boolean | null;
} | null;

const FINCA_COLS = "id, name, municipio, departamento, status, eudr_cert_shared, hectares, vereda, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective";

function gate(message: string, lang: Lang) {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center", color: "#333" }}>
      <h1 style={{ fontSize: 20 }}>{lang === "en" ? "Lot dossier" : "Dossier del lote"}</h1>
      <p style={{ color: "#666" }}>{message}</p>
      <p style={{ marginTop: 20 }}>
        <a href="/kaffetal-regal">← {lang === "en" ? "Back to my panel" : "Volver a mi panel"}</a>
      </p>
    </div>
  );
}

export default async function LotDossierPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const lang: Lang = sp.lang === "en" ? "en" : "es";

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return gate(lang === "en" ? "Sign in to see your lot dossier." : "Inicie sesión para ver el dossier de su lote.", lang);

  const service = createServiceRoleClient();
  const { data: lotRaw } = await service
    .from("lots")
    .select(
      `id, name, producer_id, public_code, grade, stage, ficha_variedad, ficha_proceso, ficha_altitud_m, harvest_from, harvest_to, datasheet,
       dds_reference, dds_filed_at, eudr_risk_level, eudr_mitigation_effective, fincas(${FINCA_COLS})`
    )
    .eq("id", id)
    .maybeSingle();
  type LotRow = {
    id: string;
    name: string;
    producer_id: string;
    public_code: string | null;
    grade: string | null;
    stage: string;
    ficha_variedad: string | null;
    ficha_proceso: string | null;
    ficha_altitud_m: number | null;
    harvest_from: string | null;
    harvest_to: string | null;
    datasheet: Partial<FichaFormData> | null;
    dds_reference: string | null;
    dds_filed_at: string | null;
    eudr_risk_level: string | null;
    eudr_mitigation_effective: boolean | null;
    fincas: FincaJoin;
  };
  const lot = lotRaw as LotRow | null;
  if (!lot || lot.producer_id !== user.id) return gate(lang === "en" ? "We could not find this lot in your account." : "No encontramos este lote en su cuenta.", lang);

  // El origen: los aportes (F2), o la finca primaria si no los hay.
  type ContribJoin = { weight_kg: number | string | null; fincas: FincaJoin | FincaJoin[] | null };
  const { data: contribRaw } = await service.from("lot_contributions").select(`weight_kg, fincas(${FINCA_COLS})`).eq("lot_id", id);
  const contribJoins = (((contribRaw as ContribJoin[] | null) ?? []))
    .map((r) => ({ f: (Array.isArray(r.fincas) ? r.fincas[0] : r.fincas) as FincaJoin, kg: r.weight_kg != null ? Number(r.weight_kg) : null }))
    .filter((x): x is { f: NonNullable<FincaJoin>; kg: number | null } => !!x.f);
  const origen = contribJoins.length ? contribJoins : lot.fincas ? [{ f: lot.fincas, kg: null }] : [];
  const camposDe = (f: NonNullable<FincaJoin>): FincaEudrFields => fincaEudrFieldsDe(f as Parameters<typeof fincaEudrFieldsDe>[0]);
  const sourceFincas = origen.map((x) => camposDe(x.f));
  const visaCode = lotEudrStatus(lot, sourceFincas).code;

  const [producers, { data: certRaw }, { data: fichaRaw }, { data: evalRaw }] = await Promise.all([
    fetchProducerContacts(service, [lot.producer_id]),
    origen.length
      ? service
          .from("finca_certificates")
          .select("scheme, cert_number, valid_from, valid_to, status")
          .in("finca_id", origen.map((x) => x.f.id))
          .eq("status", "corroborada")
      : Promise.resolve({ data: [] as { scheme: string; cert_number: string | null; valid_from: string | null; valid_to: string | null; status: string }[] }),
    service
      .from("lot_fichas")
      .select("id, lot_id, source, title, data, source_files, model, confianza, observaciones, is_official, created_at")
      .eq("lot_id", id)
      .eq("is_official", true)
      .maybeSingle(),
    service.from("lot_evaluations").select("status, source, sca_total, factor_rendimiento, created_at, rige_grado").eq("lot_id", id),
  ]);

  const producer = producers.get(lot.producer_id);
  const SCHEME_LABEL: Record<string, string> = Object.fromEntries([...ORIGIN_CERTS, ...INTL_CERTS.map(([key, , label]) => [key, label] as [string, string])]);
  const certificates: DossierCertLine[] = ((certRaw as { scheme: string; cert_number: string | null; valid_from: string | null; valid_to: string | null }[] | null) ?? []).map((c) => ({
    schemeLabel: SCHEME_LABEL[c.scheme] ?? c.scheme,
    certNumber: c.cert_number ?? "",
    validFrom: c.valid_from ?? "",
    validTo: c.valid_to ?? "",
  }));
  const ficha: LotFicha | null = fichaRaw ? rowToLotFicha(fichaRaw as Parameters<typeof rowToLotFicha>[0]) : null;
  type EvalRow = { status: "pending" | "accepted" | "rejected"; source: "q_grader_batch" | "bcp_arena" | "producer_claim"; sca_total: number | null; factor_rendimiento: number | null; created_at: string; rige_grado: boolean };
  const rige = evaluacionQueRige(((evalRaw as EvalRow[] | null) ?? []));

  const contribInputs: ContributionInput[] = origen.map((x) => ({
    fincaId: x.f.id,
    fincaName: x.f.name ?? "—",
    weightKg: x.kg,
    municipio: x.f.municipio ?? "",
    departamento: x.f.departamento ?? "",
    pais: "Colombia",
  }));
  const archetype = deriveArchetype(contribInputs);
  const ds = lot.datasheet ?? {};
  const grado = lot.grade && esGradoValido(lot.grade) ? GRADO_POR_ID[lot.grade] : null;

  const fincas: DossierFincaLine[] = origen.map((x) => ({
    code: fincaCode(x.f.id),
    name: x.f.name ?? "—",
    municipio: x.f.municipio,
    departamento: x.f.departamento,
    pasaporte: fincaEudrStatus(camposDe(x.f)).code,
  }));

  return (
    <LotDossierDoc
      lang={lang}
      lot={{
        id: lot.id,
        name: lot.name,
        reference: ctcLotReference(lot.id),
        publicCode: lot.public_code,
        grade: lot.grade,
        gradeName: grado?.nombre ?? null,
        gradeLogo: grado?.logo ?? null,
        productName: ds.product_name ?? null,
        species: ds.species ?? null,
        variety: lot.ficha_variedad,
        process: [ds.base_processing || lot.ficha_proceso, ds.special_processing].filter(Boolean).join(" + ") || null,
        altitudeM: lot.ficha_altitud_m ?? (ds.masl ? Number(ds.masl) : null),
        harvestFrom: lot.harvest_from,
        harvestTo: lot.harvest_to,
        archetype: archetype ? ARCHETYPE_LABEL[archetype] : null,
      }}
      producerName={`${producer?.fullName ?? "—"}${producer?.companyName ? ` · ${producer.companyName}` : ""}`}
      producerContact={[producer?.phone, producer?.email].filter(Boolean).join(" · ")}
      fincas={fincas}
      visaCode={visaCode}
      dds={lot.dds_reference ? { reference: lot.dds_reference, filedAt: lot.dds_filed_at } : null}
      ficha={ficha?.data ?? null}
      fichaSource={ficha?.source ?? null}
      evaluacion={rige && rige.status === "accepted" ? { sca: rige.sca_total, factor: rige.factor_rendimiento, fecha: rige.created_at ?? "", fuente: rige.source ?? "q_grader_batch" } : null}
      certificates={certificates}
      generatedOn={new Date().toISOString()}
    />
  );
}
