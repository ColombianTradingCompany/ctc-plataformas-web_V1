import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { deleteAbandonedLot } from "../actions";
import { DeleteAbandonedButton } from "../DeleteAbandonedButton";
import { ConfirmReceiptButton } from "./ConfirmReceiptButton";
import { RegisterDdsButton, RevertNoAptoButton } from "./LotePiezas";
import { PostularOnBehalfButton } from "../nominados/NominadosClient";
import { EvaReviewCard, type CertItem, type EvaEudrFields, type FileLink, type FisicoPanel, type Row } from "./EvaReviewCard";
import { CERT_REGISTRY } from "@/lib/certRegistry";
import { deriveClaims, deriveArchetype, ARCHETYPE_LABEL, type ContributionInput, type CertInput } from "@/lib/lotComposition";
import type { EvaChecklist } from "./evaChecklist";
import { fincaEudrFieldsDe } from "@/lib/ocp/fincaEudr";
import { etapaDelLote, GRADO_LABEL as GRADE_LABEL } from "@/lib/ocp/etapas";
import {
  fincaEudrStatus,
  lotEudrStatus,
  type FincaEudrFields,
  type EudrStatus,
} from "@/lib/eudr";
import { deriveCertSchemes, MESH, SCA_ATTRS, type FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";
import { computeFactor, computeSca, type ScaFields } from "@/components/kaffetal-regal/ficha/fichaCalculations";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { fetchProducerContacts, type ProducerContact } from "@/lib/bcpProducers";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { ProducerContactLine } from "../ProducerContactLine";
import styles from "@/components/panel/shared.module.css";

type CommRow = { id: string; lot_id: string | null; context_label: string | null; note: string; created_at: string; author_role: string };


type FincaJoin = {
  name: string | null;
  status: string | null;
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
  // 2026-08-20: la Visa incorpora el veredicto de CTC (fincaEudrStatus).
  eudr_cert_shared: boolean | null;
} | null;

type LotRow = {
  id: string;
  name: string;
  producer_id: string;
  finca_id: string | null;
  dds_reference: string | null;
  // F2: la ventana de cosecha — la prueba temporal de los claims derivados.
  harvest_from: string | null;
  harvest_to: string | null;
  stage: string;
  intake_step: number;
  grade: string | null;
  source: string;
  season_id: string | null;
  updated_at: string;
  sample_shipped_at: string | null;
  sample_2kg_confirmed_at: string | null;
  eva_no_apto_reason: string | null;
  eva_checklist: EvaChecklist | null;
  video_asset_id: string | null;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  ficha_notas_cata: string | null;
  ficha_puntaje_estimado: number | null;
  // The datasheet feeds the review panels: FT identity rows, FT2 certs (A3/A4
  // + attachments), FT2 physical analysis (B2/B3), the B4 extra videos, and
  // the four "no lo sé / no aplica" flags.
  datasheet: (Partial<FichaFormData> & { ft2_a3_na?: boolean; ft2_a4_na?: boolean; ft2_b2_na?: boolean; ft2_b3_na?: boolean }) | null;
  eudr_custody_stages: string[] | null;
  eudr_custody_method: string | null;
  eudr_custody_notes: string | null;
  eudr_country: string | null;
  eudr_country_risk: string | null;
  eudr_chain_complexity: string | null;
  eudr_product_risk: string | null;
  eudr_product_risk_factors: string[] | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string | null;
  eudr_risk_level: string | null;
  eudr_mitigation_actions: string | null;
  eudr_mitigation_effective: boolean | null;
  eudr_mitigation_responsible: string | null;
  cert_verifications: Record<string, { status?: string }> | null;
  fincas: FincaJoin;
};

// El constructor de los campos de la Visa es el de `src/lib/ocp/fincaEudr.ts` (una fuente desde la V5.61).
function toFincaEudrFields(f: FincaJoin): FincaEudrFields | null {
  return f ? fincaEudrFieldsDe(f) : null;
}

// ── Vista completa · la sección del LOTE (V5.61) ────────────────────────────
// Era la página del módulo Lotes: un kanban de intake (FT · FT2 · EUDR · Video · EVA) más tres vistas de los
// lotes que ya habían pasado. La tabla única se llevó el tablero, la lista y el mapa; aquí queda la TARJETA
// de un lote, entera y sin modal: la checklist de la EVA con su veredicto, el recibo de la muestra, la DDS,
// reabrir un No apto, postular en nombre del productor y eliminar un borrador abandonado — leyendo SOLO ese
// lote. «Nuevo lote» se quedó en la página de la tabla.
//
// Ninguna Server Action cambió.

export async function LoteSeccion({ service, loteId }: { service: SupabaseClient; loteId: string }) {
  const [{ data: lots }] = await Promise.all([
    service
      .from("lots")
      // Supabase's select() must be a single literal string (not runtime-concatenated)
      // for its compile-time column parsing to work -- otherwise it falls back to a
      // GenericStringError type and every field access below breaks.
      .select(
        `id, name, producer_id, finca_id, dds_reference, stage, intake_step, grade, source, season_id, updated_at, sample_shipped_at, sample_2kg_confirmed_at, eva_no_apto_reason, eva_checklist, video_asset_id, datasheet, harvest_from, harvest_to,
         ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_notas_cata, ficha_puntaje_estimado,
         eudr_custody_stages, eudr_custody_method, eudr_custody_notes, eudr_country, eudr_country_risk, eudr_chain_complexity,
         eudr_product_risk, eudr_product_risk_factors,
         eudr_illegality_indicators, eudr_docs_available, eudr_cert_scheme, eudr_risk_level, eudr_mitigation_actions,
         eudr_mitigation_effective, eudr_mitigation_responsible, cert_verifications,
         fincas(name, status, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective, eudr_cert_shared)`
      )
      // CUALQUIER etapa: la vista completa abre también un apto, un no apto o un galardonado.
      .eq("id", loteId),
  ]);

  const lotRows = (lots as LotRow[] | null) ?? [];
  if (!lotRows.length) return <p className={styles.empty}>Ese lote ya no existe.</p>;

  // Firmar en un solo lote todos los adjuntos que los paneles enlazan: los
  // soportes de certificados (A3/A4), el video principal y los B4 extra.
  const assetIds: (string | null | undefined)[] = [];
  for (const lot of lotRows) {
    assetIds.push(lot.video_asset_id);
    for (const v of lot.datasheet?.extra_video_assets ?? []) assetIds.push(v.assetId);
    for (const a of Object.values(lot.datasheet?.cert_attachments ?? {})) assetIds.push(a.assetId);
  }

  // F2 (2026-07-29): aportes del lote + certificados de finca para los claims
  // derivados que la EVA verifica (nada que digitar — solo contrastar).
  const [{ data: contribRowsRaw }, { data: fincaCertRowsRaw }] = await Promise.all([
    service
      .from("lot_contributions")
      .select("lot_id, weight_kg, fincas(id, name, municipio, departamento)")
      .in("lot_id", lotRows.map((l) => l.id)),
    service.from("finca_certificates").select("finca_id, scheme, cert_number, valid_from, valid_to, verified_by_ctc"),
  ]);
  type ContribRowJoin = { lot_id: string; weight_kg: number | string | null; fincas: { id: string; name: string; municipio: string | null; departamento: string | null } | { id: string; name: string; municipio: string | null; departamento: string | null }[] | null };
  const contribsByLot = new Map<string, ContributionInput[]>();
  for (const r of ((contribRowsRaw as ContribRowJoin[] | null) ?? [])) {
    const f = Array.isArray(r.fincas) ? r.fincas[0] : r.fincas;
    if (!f) continue;
    const list = contribsByLot.get(r.lot_id) ?? [];
    list.push({
      fincaId: f.id,
      fincaName: f.name,
      weightKg: r.weight_kg != null ? Number(r.weight_kg) : null,
      municipio: f.municipio ?? "",
      departamento: f.departamento ?? "",
      pais: "Colombia",
    });
    contribsByLot.set(r.lot_id, list);
  }
  const allFincaCerts: CertInput[] = (((fincaCertRowsRaw as { finca_id: string; scheme: string; valid_from: string | null; valid_to: string | null; verified_by_ctc: boolean }[] | null) ?? [])).map((c) => ({
    fincaId: c.finca_id, scheme: c.scheme, validFrom: c.valid_from, validTo: c.valid_to, verifiedByCtc: c.verified_by_ctc,
  }));

  const claimRowsFor = (lot: LotRow): { l: string; v: string }[] => {
    const contribs = contribsByLot.get(lot.id) ?? [];
    if (!contribs.length) return [];
    const certs = allFincaCerts.filter((c) => contribs.some((x) => x.fincaId === c.fincaId));
    const claims = deriveClaims(contribs, certs, { from: lot.harvest_from ?? null, to: lot.harvest_to ?? null });
    return claims.map((c) => ({
      l: `Sello ${CERT_KEY_LABEL[c.scheme] ?? c.scheme} (derivado)`,
      v: c.claim
        ? `✓ 100% del peso${c.fullyVerified ? " · certificados verificados por CTC" : " · declarado (verificar en la finca)"}`
        : `${c.coveragePct != null ? `Cobertura ${c.coveragePct}% del peso` : "Cobertura incompleta (faltan kg por finca)"}${
            c.blockers.length ? ` — bloquea ${c.blockers.map((b) => b.fincaName).join(", ")}` : ""
          }`,
    }));
  };
  const archetypeFor = (lot: LotRow): string | null => {
    const a = deriveArchetype(contribsByLot.get(lot.id) ?? []);
    return a ? ARCHETYPE_LABEL[a] : null;
  };

  const [producers, { data: comms }, { data: inscriptionRows }, signedUrls] = await Promise.all([
    fetchProducerContacts(service, lotRows.map((l) => l.producer_id)),
    service
      .from("producer_comm_log")
      .select("id, lot_id, context_label, note, created_at, author_role")
      .in("lot_id", lotRows.map((l) => l.id))
      .order("created_at", { ascending: false }),
    service
      .from("arena_inscriptions")
      .select("lot_id, status")
      .in("lot_id", lotRows.map((l) => l.id)),
    signedKaffetalMediaUrls(service, assetIds),
  ]);
  const inscriptionSettledByLot = new Map<string, boolean>();
  const postulatedLots = new Set<string>();
  for (const i of (inscriptionRows as { lot_id: string; status: string }[] | null) ?? []) {
    inscriptionSettledByLot.set(i.lot_id, i.status === "pagado" || i.status === "exento");
    postulatedLots.add(i.lot_id);
  }
  const commsByLot = new Map<string, CommRow[]>();
  for (const c of (comms as CommRow[] | null) ?? []) {
    if (!c.lot_id) continue;
    commsByLot.set(c.lot_id, [...(commsByLot.get(c.lot_id) ?? []), c]);
  }
  const lot = lotRows[0];
  const ARENA_PATH_STAGES = new Set(["apto", "fila_arena", "evaluado", "galardonado"]);

  return (
    <div>
      <p className={styles.meta} style={{ marginBottom: 10 }}>
        Etapa: <b>{etapaDelLote(lot.stage)}</b>
        {lot.finca_id && (
          <>
            {" "}· Finca: <Link href={`/ocp/kr?finca=${lot.finca_id}`}>{lot.fincas?.name ?? "abrir"}</Link>
          </>
        )}{" "}
        · Productor: <Link href={`/ocp/kr?productor=${lot.producer_id}`}>{producers.get(lot.producer_id)?.fullName ?? "abrir"}</Link>
      </p>
      <LotCard
        lot={lot}
        producer={producers.get(lot.producer_id)}
        comms={commsByLot.get(lot.id) ?? []}
        signedUrls={signedUrls}
        // El recibo «a mano» es solo de los lotes que el BCP registró por su cuenta (su muestra ya está en
        // manos de CTC y no pasan por el veredicto de la EVA).
        showConfirmReceipt={lot.source === "bcp_manual_entry"}
        showEvaVerdict={lot.stage === "ficha_completa"}
        inscriptionSettled={inscriptionSettledByLot.get(lot.id) ?? false}
        derivedClaimRows={claimRowsFor(lot)}
        archetypeLabel={archetypeFor(lot)}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", marginTop: 14 }}>
        {lot.stage === "no_apto" && <RevertNoAptoButton lotId={lot.id} />}
        {lot.stage === "apto" && !postulatedLots.has(lot.id) && <PostularOnBehalfButton lotId={lot.id} />}
        {ARENA_PATH_STAGES.has(lot.stage) && <RegisterDdsButton lotId={lot.id} ddsReference={lot.dds_reference} />}
      </div>
      {lot.stage === "no_apto" && lot.eva_no_apto_reason && <p className={styles.warn}>Razón del No apto: {lot.eva_no_apto_reason}</p>}
    </div>
  );
}

// Etiquetas amistosas para las claves de cert_attachments (A3/A4).
const CERT_KEY_LABEL: Record<string, string> = {
  origin_cert_dor: "D.O. Regional",
  origin_cert_do: "Denominación de Origen",
  origin_cert_igp: "IGP",
  origin_cert_fedecafe: "Fedecafé",
  origin_cert_other: "Otro (origen)",
  intl_eudr: "EUDR",
  intl_rainforest: "Rainforest Alliance",
  intl_organic: "Orgánico",
  intl_eujas: "EU-JAS",
  intl_birdfriendly: "Bird Friendly",
  intl_foe: "Friend of the Earth",
  intl_iwca: "IWCA",
  intl_cafe: "C.A.F.E. Practices",
  intl_bpa: "BPA",
  intl_fairtrade: "Fairtrade",
  intl_spp: "SPP",
  intl_fairtradeusa: "Fair Trade USA",
  intl_demeter: "Demeter",
  intl_nespresso: "Nespresso AAA",
  intl_globalgap: "GlobalG.A.P.",
  intl_other: "Otro (internacional)",
};

function LotCard({
  lot,
  producer,
  comms,
  signedUrls,
  showConfirmReceipt,
  showEvaVerdict,
  inscriptionSettled,
  derivedClaimRows,
  archetypeLabel,
}: {
  lot: LotRow;
  producer: ProducerContact | undefined;
  comms: CommRow[];
  signedUrls: Map<string, string>;
  showConfirmReceipt: boolean;
  showEvaVerdict: boolean;
  inscriptionSettled: boolean;
  // F2: claims derivados (lot_contributions × finca_certificates × cosecha) y
  // arquetipo calculado — la EVA los VERIFICA, no los digita.
  derivedClaimRows: { l: string; v: string }[];
  archetypeLabel: string | null;
}) {
  const finca = toFincaEudrFields(lot.fincas);
  const eudrStatus: EudrStatus = lotEudrStatus(lot, finca ? [finca] : []);
  const certSchemes = deriveCertSchemes(lot.datasheet ?? {});
  const ds = lot.datasheet ?? {};
  const awaitingShipment =
    showConfirmReceipt && lot.source !== "bcp_manual_entry" && !lot.sample_shipped_at && !lot.sample_2kg_confirmed_at;

  // ── Filas de solo-lectura para los subpaneles del checklist ────────────────
  const row = (l: string, v: unknown): Row | null => {
    const s = v == null ? "" : String(v).trim();
    return s ? { l, v: s } : null;
  };
  const rows = (...items: (Row | null)[]): Row[] => items.filter((r): r is Row => r !== null);

  const ftRows = rows(
    row("Producto", ds.product_name),
    row("Especie", ds.species),
    row("Tipo de producto", [ds.product_type, ds.hs_code].filter(Boolean).join(" · HS ")),
    row("Cosecha", [ds.harvest_year, ds.harvest_season].filter(Boolean).join(" · ")),
    row("Tipo de lote (calculado)", archetypeLabel ?? ds.origin_category),
    row("Recolección", lot.harvest_from && lot.harvest_to ? `${lot.harvest_from} → ${lot.harvest_to}` : ""),
    row("Región", [ds.region_dep, ds.county_muni_text || ds.county_muni].filter(Boolean).join(" · ")),
    row("Altitud", ds.masl ? `${ds.masl} msnm` : lot.ficha_altitud_m ? `${lot.ficha_altitud_m} msnm` : ""),
    row("Edad del cultivo", ds.plantation_age),
    row("Variedad", lot.ficha_variedad),
    row("Proceso", [ds.base_processing || lot.ficha_proceso, ds.special_processing].filter(Boolean).join(" + "))
  );

  // "Finca declarada" sale de las filas planas: lleva su propio chip
  // Apta / No Apta / Pendiente según la revisión de esa finca en BCP.
  const fincaDeclared =
    ds.estate || lot.fincas?.name
      ? {
          name: ds.estate || lot.fincas?.name || "",
          status: (lot.fincas?.status ?? null) as "approved" | "rejected" | "pending_review" | null,
        }
      : null;

  // ── FT2 · Certificados: cada declarado con su soporte EN LÍNEA + registro
  //    público de verificación + veredicto BCP (lots.cert_verifications). ──
  const verifications = lot.cert_verifications ?? {};
  const certItems: CertItem[] = [];
  const pushCert = (key: string, label: string) => {
    const a = ds.cert_attachments?.[key];
    const v = verifications[key]?.status;
    certItems.push({
      key,
      label,
      attachment: a ? { fileName: a.fileName, url: signedUrls.get(a.assetId) ?? null } : null,
      registry: CERT_REGISTRY[key] ? { name: CERT_REGISTRY[key].registry, url: CERT_REGISTRY[key].url, searchable: CERT_REGISTRY[key].searchable, note: CERT_REGISTRY[key].note } : null,
      verification: v === "confirmado" || v === "no_confirmado" ? v : null,
    });
  };
  for (const [key, label] of Object.entries(CERT_KEY_LABEL)) {
    if (key === "origin_cert_other" || key === "intl_other") continue;
    if (ds[key as keyof FichaFormData]) pushCert(key, label);
  }
  if (ds.origin_cert_other && ds.origin_cert_other_text?.trim()) pushCert("origin_cert_other", `${ds.origin_cert_other_text.trim()} (otro origen)`);
  if (ds.intl_other && ds.intl_cert_other_text?.trim()) pushCert("intl_other", `${ds.intl_cert_other_text.trim()} (otro internacional)`);
  // Soportes huérfanos: adjuntos cuyo checkbox ya no está marcado — se listan
  // igual para que ningún archivo quede invisible.
  for (const [key, a] of Object.entries(ds.cert_attachments ?? {})) {
    if (!certItems.some((c) => c.key === key)) {
      certItems.push({
        key,
        label: `${CERT_KEY_LABEL[key] ?? key} (soporte sin declaración)`,
        attachment: { fileName: a.fileName, url: signedUrls.get(a.assetId) ?? null },
        registry: null,
        verification: null,
      });
    }
  }
  const certExtraRows = rows(...derivedClaimRows.map((r) => row(r.l, r.v)), row("Premios y rankings", ds.awards), row("Sobre el origen", ds.about_origin));

  // ── FT2 · Análisis Físico: B2 completo (los 10 atributos SCA), «No lo sé»
  //    explícito y la referencia Q-Grader verificable contra el CQI. ──
  const scaValues: ScaFields = {
    sca_fragrance: ds.sca_fragrance ?? "", sca_flavor: ds.sca_flavor ?? "", sca_aftertaste: ds.sca_aftertaste ?? "",
    sca_acidity: ds.sca_acidity ?? "", sca_body: ds.sca_body ?? "", sca_balance: ds.sca_balance ?? "",
    sca_uniformity: ds.sca_uniformity ?? "", sca_clean_cup: ds.sca_clean_cup ?? "", sca_sweetness: ds.sca_sweetness ?? "",
    sca_cuppers: ds.sca_cuppers ?? "",
  };
  const anySca = Object.values(scaValues).some((v) => String(v).trim() !== "");
  const scaRows: Row[] = anySca
    ? SCA_ATTRS.map(([key, label]) => ({
        l: label,
        v: String(scaValues[`sca_${key}` as keyof ScaFields]).trim() || "—",
      }))
    : [];
  if (lot.ficha_puntaje_estimado != null) scaRows.push({ l: "Puntaje SCA estimado (B1)", v: String(lot.ficha_puntaje_estimado) });

  const factor = computeFactor({
    fa_start: ds.fa_start ?? "", fa_green_remainder: ds.fa_green_remainder ?? "",
    fa_primary_defect: ds.fa_primary_defect ?? "", fa_secondary_defect: ds.fa_secondary_defect ?? "",
  });
  const granRows = rows(
    row("Muestra pergamino inicial", ds.fa_start ? `${ds.fa_start} g` : ""),
    row("Trillado verde restante", ds.fa_green_remainder ? `${ds.fa_green_remainder} g` : ""),
    row("Humedad pergamino", ds.fa_parch_hum ? `${ds.fa_parch_hum}%` : ""),
    row("Defecto primario / secundario", [ds.fa_primary_defect && `${ds.fa_primary_defect} g`, ds.fa_secondary_defect && `${ds.fa_secondary_defect} g`].filter(Boolean).join(" / ")),
    row("Factor de rendimiento", factor.yieldFactor !== null ? factor.yieldFactor.toFixed(2) : ""),
    ...MESH.filter(([key]) => key !== "mesh_residue").map(([key, label]) =>
      row(label, ds[key as keyof FichaFormData] ? `${ds[key as keyof FichaFormData]} g` : "")
    )
  );

  const fisico: FisicoPanel = {
    b2Na: !!ds.ft2_b2_na,
    b3Na: !!ds.ft2_b3_na,
    scaRows,
    scaTotal: anySca ? computeSca(scaValues).total.toFixed(2) : null,
    cuppingProfile: ds.cupping_profile ?? "",
    qgraderName: ds.qgrader_name ?? "",
    qgraderLab: ds.qgrader_lab ?? "",
    qgraderCert: ds.qgrader_cert ?? "",
    granRows,
    notas: lot.ficha_notas_cata || ds.analysis_notes || "",
  };

  const videoLinks: FileLink[] = [
    ...(lot.video_asset_id
      ? [{ label: "Video principal del lote (B4)", url: signedUrls.get(lot.video_asset_id) ?? null }]
      : []),
    ...(ds.extra_video_assets ?? []).map((v) => ({
      label: `Video adicional — ${v.fileName}`,
      url: signedUrls.get(v.assetId) ?? null,
    })),
  ];

  const naCerts = [ds.ft2_a3_na && "A3 Cert. Origen", ds.ft2_a4_na && "A4 Cert. Intl."].filter(Boolean) as string[];

  const eudrFields: EvaEudrFields = {
    custodyStages: lot.eudr_custody_stages ?? [],
    custodyMethod: lot.eudr_custody_method ?? "",
    custodyNotes: lot.eudr_custody_notes ?? "",
    country: lot.eudr_country ?? "",
    productRiskFactors: lot.eudr_product_risk_factors ?? [],
    illegality: lot.eudr_illegality_indicators,
    docsAvailable: lot.eudr_docs_available,
    riskLevel: lot.eudr_risk_level ?? "",
    mitigationActions: lot.eudr_mitigation_actions ?? "",
    mitigationEffective: lot.eudr_mitigation_effective,
    responsibleStored: lot.eudr_mitigation_responsible ?? "",
    certSchemes,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <span className={`${styles.badge} mono`}>{ctcLotReferenceShort(lot.id)}</span>
        <EudrStatusBadge status={eudrStatus} />
        {lot.grade && <span className={styles.badge}>{GRADE_LABEL[lot.grade] ?? lot.grade}</span>}
        {lot.source === "bcp_manual_entry" && <span className={styles.badge}>registrado por BCP</span>}
      </div>
      <ProducerContactLine producer={producer} />
      <p className={styles.meta}>Finca: {lot.fincas?.name ?? "—"}</p>

      {awaitingShipment && <p className={styles.meta}>Ficha completa · esperando que el productor confirme el envío de la muestra</p>}
      {lot.sample_shipped_at && !lot.sample_2kg_confirmed_at && (
        <p className={styles.meta}>
          Muestra enviada el {new Date(lot.sample_shipped_at).toLocaleDateString("es-CO")} · pendiente de confirmar recibo
        </p>
      )}
      {finca && fincaEudrStatus(finca).code === "no_apta" && (
        <p className={styles.warn}>La finca de origen tiene deforestación o producción ilegal declarada.</p>
      )}

      <EvaReviewCard
        lotId={lot.id}
        lotName={lot.name}
        producerId={lot.producer_id}
        checklist={lot.eva_checklist ?? {}}
        showEvaVerdict={showEvaVerdict}
        eudrReady={eudrStatus.code === "eudr_ready"}
        eudrLabel={eudrStatus.label}
        eudr={eudrFields}
        ftRows={ftRows}
        fincaDeclared={fincaDeclared}
        certItems={certItems}
        certExtraRows={certExtraRows}
        naCerts={naCerts}
        fisico={fisico}
        videoLinks={videoLinks}
        comms={comms.map((c) => ({
          id: c.id,
          role: c.author_role,
          date: new Date(c.created_at).toLocaleDateString("es-CO"),
          note: c.note,
        }))}
      />

      {showConfirmReceipt && (lot.sample_shipped_at || lot.source === "bcp_manual_entry") && !lot.sample_2kg_confirmed_at && (
        <ConfirmReceiptButton
          lotId={lot.id}
          eudrReady={eudrStatus.code === "eudr_ready"}
          eudrLabel={eudrStatus.label}
          inscriptionSettled={inscriptionSettled}
        />
      )}

      {/* Abandonado (V2.0): solo borradores sin actividad >10 días; la regla
          dura la re-impone el servidor (deleteAbandonedLot). */}
      {lot.stage === "borrador" && Date.now() - Date.parse(lot.updated_at) > 10 * 86_400_000 && (
        <div style={{ marginTop: 12 }}>
          <p className={styles.meta}>
            Borrador sin actividad desde el {new Date(lot.updated_at).toLocaleDateString("es-CO")}.
          </p>
          <DeleteAbandonedButton
            action={deleteAbandonedLot.bind(null, lot.id)}
            label="Eliminar lote (abandonado)"
            confirmText={`¿Eliminar el borrador "${lot.name}" por abandono?\n\nEl productor verá un aviso en su feed y puede registrarlo de nuevo. Esta acción no se puede deshacer.`}
          />
        </div>
      )}
    </div>
  );
}
