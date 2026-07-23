import { createServiceRoleClient } from "@/lib/supabase/server";
import { createLot, deleteAbandonedLot } from "../actions";
import { DeleteAbandonedButton } from "../DeleteAbandonedButton";
import { ConfirmReceiptButton } from "./ConfirmReceiptButton";
import { LotesViews, type ViewLot } from "./LotesViews";
import { fincaCenter } from "@/lib/earthKml";
import { seasonLabel, type Season } from "@/lib/arena/seasons";
import { EvaReviewCard, type CertItem, type EvaEudrFields, type FileLink, type FisicoPanel, type Row } from "./EvaReviewCard";
import { CERT_REGISTRY } from "@/lib/certRegistry";
import type { EvaChecklist } from "./evaChecklist";
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
import { FincaModalRow } from "../fincas/FincaModalRow";
import { fetchProducerContacts, type ProducerContact } from "@/lib/bcpProducers";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { ProducerContactLine } from "../ProducerContactLine";
import styles from "../shared.module.css";

type CommRow = { id: string; lot_id: string | null; context_label: string | null; note: string; created_at: string; author_role: string };

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

// Columns mirror the producer-facing intake sub-stages (FT/FT2/EUDR/Video --
// see FichaView.tsx/intake_step) plus EVA, the documentation-evaluation
// verdict (2026-07-17): a ficha_completa lot waits here until BCP resolves its
// EUDR and declares it Apto (opening the paid Arena track) or No Apto. Apto
// lots leave the kanban into the "Aptos" strip below (their pipeline continues
// in Nominados); No Apto lots collapse into their own rail.
type Bucket = "ft" | "ft2" | "eudr" | "video" | "eva";
const COLUMNS: { id: Bucket; label: string }[] = [
  { id: "ft", label: "FT · Identidad y Origen" },
  { id: "ft2", label: "FT2 · Certificados y Análisis" },
  { id: "eudr", label: "EUDR · Debida Diligencia" },
  { id: "video", label: "Video" },
  { id: "eva", label: "EVA · Evaluación Documental" },
];

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
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
} | null;

type LotRow = {
  id: string;
  name: string;
  producer_id: string;
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

function toFincaEudrFields(f: FincaJoin): FincaEudrFields | null {
  if (!f) return null;
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

function bucketOf(lot: LotRow): Bucket {
  // Lots BCP registered by hand exist precisely because the physical sample
  // is already in CTC's hands -- they never go through the producer-driven
  // intake columns, so they'd be stranded in FT forever (the old manual
  // stage dropdown that used to move them is retired). Straight to EVA,
  // where the verdict and "Confirmar recibido" (legacy) live.
  if (lot.source === "bcp_manual_entry") return "eva";
  if (lot.stage !== "borrador") return "eva"; // ficha locked in -- awaiting the documentation verdict
  if (lot.intake_step <= 0) return "ft";
  if (lot.intake_step === 1) return "ft2";
  if (lot.intake_step === 2) return "eudr";
  return "video"; // intake_step === 3
}

export default async function BcpLotesPage() {
  const service = createServiceRoleClient();

  const [{ data: lots }, { data: approvedFincas }, { data: seasonsRaw }] = await Promise.all([
    service
      .from("lots")
      // Supabase's select() must be a single literal string (not runtime-concatenated)
      // for its compile-time column parsing to work -- otherwise it falls back to a
      // GenericStringError type and every field access below breaks.
      .select(
        `id, name, producer_id, stage, intake_step, grade, source, season_id, updated_at, sample_shipped_at, sample_2kg_confirmed_at, eva_no_apto_reason, eva_checklist, video_asset_id, datasheet,
         ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_notas_cata, ficha_puntaje_estimado,
         eudr_custody_stages, eudr_custody_method, eudr_custody_notes, eudr_country, eudr_country_risk, eudr_chain_complexity,
         eudr_product_risk, eudr_product_risk_factors,
         eudr_illegality_indicators, eudr_docs_available, eudr_cert_scheme, eudr_risk_level, eudr_mitigation_actions,
         eudr_mitigation_effective, eudr_mitigation_responsible, cert_verifications,
         fincas(name, status, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_legal_areas, eudr_tenure)`
      )
      // apto/no_apto ya NO viajan por esta consulta pesada del kanban: viven en
      // la consulta ligera de LotesViews (abajo), junto con fila/galardonado.
      .in("stage", ["borrador", "ficha_completa", "videos_ok", "muestra_transito"])
      .order("created_at", { ascending: false }),
    service.from("fincas").select("id, name, municipio").eq("status", "approved").order("name"),
    service.from("harvest_seasons").select("id, kind, year, arena_starts_at, arena_ends_at").order("year", { ascending: false }),
  ]);

  // TODOS los lotes para las 3 vistas (Mapa/Lista/No aptos, 2026-07-23):
  // consulta ligera con la finca de origen — el pin del mapa usa su punto o el
  // centroide de su polígono EUDR. La Lista abarca el ciclo completo (también
  // el intake); el Mapa filtra al camino de la Arena por el flag arenaPath.
  type PassedRow = {
    id: string;
    name: string;
    producer_id: string;
    stage: string;
    grade: string | null;
    season_id: string | null;
    eva_no_apto_reason: string | null;
    fincas: { name: string | null; departamento: string | null; eudr_lat: string | number | null; eudr_lng: string | number | null; eudr_polygon_geojson: { lat: number; lng: number }[] | null } | { name: string | null; departamento: string | null; eudr_lat: string | number | null; eudr_lng: string | number | null; eudr_polygon_geojson: { lat: number; lng: number }[] | null }[] | null;
  };
  const { data: passedRaw } = await service
    .from("lots")
    .select(
      `id, name, producer_id, stage, grade, season_id, eva_no_apto_reason,
       fincas(name, departamento, eudr_lat, eudr_lng, eudr_polygon_geojson)`
    )
    .order("created_at", { ascending: false });
  const passedRows = (passedRaw as PassedRow[] | null) ?? [];
  const ARENA_PATH_STAGES = new Set(["apto", "fila_arena", "evaluado", "galardonado"]);

  const lotRows = (lots as LotRow[] | null) ?? [];
  const seasons = (seasonsRaw as Season[] | null) ?? [];
  const seasonById = new Map(seasons.map((s) => [s.id, s]));

  // Firmar en un solo lote todos los adjuntos que los paneles enlazan: los
  // soportes de certificados (A3/A4), el video principal y los B4 extra.
  const assetIds: (string | null | undefined)[] = [];
  for (const lot of lotRows) {
    assetIds.push(lot.video_asset_id);
    for (const v of lot.datasheet?.extra_video_assets ?? []) assetIds.push(v.assetId);
    for (const a of Object.values(lot.datasheet?.cert_attachments ?? {})) assetIds.push(a.assetId);
  }

  const [producers, { data: comms }, { data: inscriptionRows }, signedUrls] = await Promise.all([
    fetchProducerContacts(service, [...lotRows.map((l) => l.producer_id), ...passedRows.map((l) => l.producer_id)]),
    service
      .from("producer_comm_log")
      .select("id, lot_id, context_label, note, created_at, author_role")
      .in("lot_id", lotRows.map((l) => l.id))
      .order("created_at", { ascending: false }),
    service
      .from("arena_inscriptions")
      .select("lot_id, status")
      .in("lot_id", [...lotRows.map((l) => l.id), ...passedRows.map((l) => l.id)]),
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
  const boardLots = lotRows; // apto/no_apto ya no llegan en la consulta del kanban
  const byBucket = new Map<Bucket, LotRow[]>(COLUMNS.map((c) => [c.id, []]));
  for (const lot of boardLots) byBucket.get(bucketOf(lot))!.push(lot);

  // Serializa un lote "pasado" para las 3 vistas (Mapa/Lista/No aptos).
  const toViewLot = (l: PassedRow): ViewLot => {
    const f = Array.isArray(l.fincas) ? l.fincas[0] : l.fincas;
    const center = f ? fincaCenter(f.eudr_lat, f.eudr_lng, f.eudr_polygon_geojson) : null;
    return {
      id: l.id,
      name: l.name,
      reference: ctcLotReferenceShort(l.id),
      producerName: producers.get(l.producer_id)?.fullName ?? "Productor",
      stage: l.stage,
      arenaPath: ARENA_PATH_STAGES.has(l.stage),
      grade: l.grade ? GRADE_LABEL[l.grade] ?? l.grade : null,
      seasonId: l.season_id,
      seasonLabel: seasonLabel(seasonById.get(l.season_id ?? "")),
      fincaName: f?.name ?? "—",
      region: f?.departamento ?? "",
      lat: center?.la ?? null,
      lng: center?.ln ?? null,
      postulated: postulatedLots.has(l.id),
      reason: l.eva_no_apto_reason,
    };
  };
  const viewLots = passedRows.filter((l) => l.stage !== "no_apto").map(toViewLot);
  const noAptoViewLots = passedRows.filter((l) => l.stage === "no_apto").map(toViewLot);
  // Para el dial de rango: de la temporada más vieja a la más nueva.
  const seasonsAsc = [...seasons].sort((a, b) => a.year - b.year || String(a.kind).localeCompare(String(b.kind)));

  return (
    <div>
      <h1 className={styles.title}>Lotes</h1>
      <p className={styles.subtitle}>
        Tablero de intake documental (todo gratis para el productor). En la columna EVA, CTC revisa la Ficha como una
        <b> checklist</b> (FT · Certificados · Análisis Físico · EUDR · Video) y emite el veredicto: <b>Apto</b> abre el
        tramo pagado de la Arena (postulación → pago → sondeo), <b>No Apto</b> devuelve la razón al productor.
      </p>

      <details className={styles.card} style={{ display: "block", marginBottom: 28 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Nuevo lote (en nombre del productor)</summary>
        {!approvedFincas?.length ? (
          <p className={styles.empty} style={{ marginTop: 14 }}>
            Aprueba al menos una finca antes de poder crear un lote.
          </p>
        ) : (
          <form action={createLot} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <label htmlFor="finca_id">Finca</label>
              <select id="finca_id" name="finca_id" required>
                {approvedFincas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.municipio})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="name">Nombre del lote</label>
              <input id="name" name="name" required placeholder="Ej. Caturra Natural" />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="ficha_variedad">Variedad</label>
                <input id="ficha_variedad" name="ficha_variedad" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_proceso">Proceso</label>
                <input id="ficha_proceso" name="ficha_proceso" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_altitud_m">Altitud (m)</label>
                <input id="ficha_altitud_m" name="ficha_altitud_m" type="number" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_peso_muestra_kg">Peso de muestra (kg)</label>
                <input id="ficha_peso_muestra_kg" name="ficha_peso_muestra_kg" type="number" step="0.1" defaultValue={2} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="ficha_notas_cata">Notas de cata</label>
              <textarea id="ficha_notas_cata" name="ficha_notas_cata" rows={2} />
            </div>
            <button className="btn btn-solid" type="submit">
              Crear lote
            </button>
          </form>
        )}
      </details>

      {!boardLots.length ? (
        <p className={styles.empty}>No hay lotes en proceso de intake.</p>
      ) : (
        <div className={styles.board}>
          {COLUMNS.map((col) => {
            const colLots = byBucket.get(col.id) ?? [];
            return (
              <div className={styles.column} key={col.id}>
                <div className={styles.columnHead}>
                  <h3>{col.label}</h3>
                  <span className={styles.columnCount}>{colLots.length}</span>
                </div>
                <div className={styles.columnList}>
                  {colLots.map((lot) => (
                    <LotCard
                      key={lot.id}
                      lot={lot}
                      producer={producers.get(lot.producer_id)}
                      comms={commsByLot.get(lot.id) ?? []}
                      signedUrls={signedUrls}
                      // Legacy receipt path only for lots BCP registered by hand
                      // (their sample is already in CTC's hands, no EVA verdict).
                      showConfirmReceipt={col.id === "eva" && lot.source === "bcp_manual_entry"}
                      showEvaVerdict={col.id === "eva" && lot.stage === "ficha_completa"}
                      inscriptionSettled={inscriptionSettledByLot.get(lot.id) ?? false}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Las 3 vistas de los lotes que ya pasaron el intake (2026-07-23):
          Mapa (pin por finca, color = grado, dial de temporadas) · Lista con
          filtros y búsqueda (la postulación en nombre del productor vive ahí) ·
          No aptos (veredicto reversible). Reemplazan a AptosNoAptosSections. */}
      <LotesViews
        lots={viewLots}
        noAptos={noAptoViewLots}
        seasons={seasonsAsc.map((s) => ({ id: s.id, label: seasonLabel(s) }))}
      />
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
}: {
  lot: LotRow;
  producer: ProducerContact | undefined;
  comms: CommRow[];
  signedUrls: Map<string, string>;
  showConfirmReceipt: boolean;
  showEvaVerdict: boolean;
  inscriptionSettled: boolean;
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
    row("Categoría de origen", ds.origin_category),
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
  const certExtraRows = rows(row("Premios y rankings", ds.awards), row("Sobre el origen", ds.about_origin));

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

  const summary = (
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14, color: "var(--ink)" }}>{lot.name}</b>
        <EudrStatusBadge status={eudrStatus} />
        {lot.grade && <span className={styles.badge}>{GRADE_LABEL[lot.grade] ?? lot.grade}</span>}
        {lot.source === "bcp_manual_entry" && <span className={styles.badge}>registrado por BCP</span>}
      </span>
      <span className={styles.meta}>
        {producer?.fullName ?? "Productor"} · {lot.fincas?.name ?? "—"}
        {lot.sample_shipped_at && !lot.sample_2kg_confirmed_at && " · muestra enviada, por confirmar"}
      </span>
    </span>
  );

  return (
    <FincaModalRow title={lot.name} summary={summary} anchorId={`lot-${lot.id}`}>
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
    </FincaModalRow>
  );
}
