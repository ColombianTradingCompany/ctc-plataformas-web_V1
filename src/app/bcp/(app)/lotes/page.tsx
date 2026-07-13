import { createServiceRoleClient } from "@/lib/supabase/server";
import { createLot, confirmSampleReceived, updateLotEudr } from "../actions";
import { logProducerComm } from "../commActions";
import {
  fincaEudrStatus,
  lotEudrStatus,
  deriveLotRiskLevel,
  deriveChainComplexity,
  deriveProductRisk,
  countryRiskFor,
  EUDR_ORIGIN_COUNTRIES,
  PRODUCT_RISK_QUESTIONS,
  type FincaEudrFields,
  type EudrStatus,
} from "@/lib/eudr";
import { deriveCertSchemes, type FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { FincaModalRow } from "../fincas/FincaModalRow";
import { fetchProducerContacts, type ProducerContact } from "@/lib/bcpProducers";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { FieldInfo } from "@/components/kaffetal-regal/ficha/panes/FieldInfo";
import { ProducerContactLine } from "../ProducerContactLine";
import styles from "../shared.module.css";

const RISK_LEVEL_LABEL: Record<string, string> = { insignificante: "Insignificante", no_insignificante: "No insignificante" };

type CommRow = { id: string; lot_id: string | null; context_label: string | null; note: string; created_at: string; author_role: string };

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

const CUSTODY_STAGES: [string, string][] = [
  ["finca", "Finca"], ["beneficio", "Beneficio"], ["secado", "Secado"],
  ["trilla", "Trilla"], ["almacenamiento", "Almacenamiento"], ["exportacion", "Exportación"],
];

// Columns mirror the producer-facing intake sub-stages (FT/FT2/EUDR/Video --
// see FichaView.tsx/intake_step) plus the sample-shipment handoff. Once a lot
// is confirmed received it leaves this board entirely -- the query below only
// selects stages up through "muestra_transito"-equivalent, so a lot dropped
// into the Arena backlog (stage = fila_arena) simply stops showing up here on
// the next load; it then appears in /bcp/arena's "Disponibles" list instead.
type Bucket = "ft" | "ft2" | "eudr" | "video" | "muestra";
const COLUMNS: { id: Bucket; label: string }[] = [
  { id: "ft", label: "FT · Identidad y Origen" },
  { id: "ft2", label: "FT2 · Certificados y Análisis" },
  { id: "eudr", label: "EUDR · Debida Diligencia" },
  { id: "video", label: "Video" },
  { id: "muestra", label: "Muestra en tránsito" },
];

type FincaJoin = {
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

type LotRow = {
  id: string;
  name: string;
  producer_id: string;
  stage: string;
  intake_step: number;
  grade: string | null;
  source: string;
  sample_shipped_at: string | null;
  sample_2kg_confirmed_at: string | null;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  ficha_notas_cata: string | null;
  ficha_puntaje_estimado: number | null;
  // Only the four FT2 "no lo sé / no aplica" flags are read off the datasheet
  // here -- shown on the card so BCP sees what the producer declared unknown.
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

function triSelectValue(v: boolean | null): string {
  if (v === true) return "si";
  if (v === false) return "no";
  return "";
}

function bucketOf(lot: LotRow): Bucket {
  // Lots BCP registered by hand exist precisely because the physical sample
  // is already in CTC's hands -- they never go through the producer-driven
  // intake columns, so they'd be stranded in FT forever (the old manual
  // stage dropdown that used to move them is retired). Straight to the
  // sample column, where "Confirmar recibido" lives and already
  // special-cases bcp_manual_entry.
  if (lot.source === "bcp_manual_entry") return "muestra";
  if (lot.stage !== "borrador") return "muestra"; // ficha locked in -- shipping/awaiting confirmation
  if (lot.intake_step <= 0) return "ft";
  if (lot.intake_step === 1) return "ft2";
  if (lot.intake_step === 2) return "eudr";
  return "video"; // intake_step === 3
}

export default async function BcpLotesPage() {
  const service = createServiceRoleClient();

  const [{ data: lots }, { data: approvedFincas }] = await Promise.all([
    service
      .from("lots")
      // Supabase's select() must be a single literal string (not runtime-concatenated)
      // for its compile-time column parsing to work -- otherwise it falls back to a
      // GenericStringError type and every field access below breaks.
      .select(
        `id, name, producer_id, stage, intake_step, grade, source, sample_shipped_at, sample_2kg_confirmed_at, datasheet,
         ficha_variedad, ficha_proceso, ficha_altitud_m, ficha_notas_cata, ficha_puntaje_estimado,
         eudr_custody_stages, eudr_custody_method, eudr_custody_notes, eudr_country, eudr_country_risk, eudr_chain_complexity,
         eudr_product_risk, eudr_product_risk_factors,
         eudr_illegality_indicators, eudr_docs_available, eudr_cert_scheme, eudr_risk_level, eudr_mitigation_actions,
         eudr_mitigation_effective, eudr_mitigation_responsible,
         fincas(name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_legal_areas, eudr_tenure)`
      )
      .in("stage", ["borrador", "ficha_completa", "videos_ok", "muestra_transito"])
      .order("created_at", { ascending: false }),
    service.from("fincas").select("id, name, municipio").eq("status", "approved").order("name"),
  ]);

  const lotRows = (lots as LotRow[] | null) ?? [];
  const [producers, { data: comms }] = await Promise.all([
    fetchProducerContacts(service, lotRows.map((l) => l.producer_id)),
    service
      .from("producer_comm_log")
      .select("id, lot_id, context_label, note, created_at, author_role")
      .in("lot_id", lotRows.map((l) => l.id))
      .order("created_at", { ascending: false }),
  ]);
  const commsByLot = new Map<string, CommRow[]>();
  for (const c of (comms as CommRow[] | null) ?? []) {
    if (!c.lot_id) continue;
    commsByLot.set(c.lot_id, [...(commsByLot.get(c.lot_id) ?? []), c]);
  }
  const byBucket = new Map<Bucket, LotRow[]>(COLUMNS.map((c) => [c.id, []]));
  for (const lot of lotRows) byBucket.get(bucketOf(lot))!.push(lot);

  return (
    <div>
      <h1 className={styles.title}>Lotes</h1>
      <p className={styles.subtitle}>
        Tablero de lotes en proceso de intake. Al confirmar el recibo de la muestra, el lote pasa a &quot;Muestras Recibidas&quot;
        y sale de este tablero — queda disponible en el backlog de la Arena.
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

      {!lotRows.length ? (
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
                      showConfirmReceipt={col.id === "muestra"}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FT2_NA_LABELS: { key: "ft2_a3_na" | "ft2_a4_na" | "ft2_b2_na" | "ft2_b3_na"; label: string }[] = [
  { key: "ft2_a3_na", label: "A3 Cert. Origen" },
  { key: "ft2_a4_na", label: "A4 Cert. Intl." },
  { key: "ft2_b2_na", label: "B2 Perfil de Taza" },
  { key: "ft2_b3_na", label: "B3 Granulometría" },
];

function LotCard({
  lot,
  producer,
  comms,
  showConfirmReceipt,
}: {
  lot: LotRow;
  producer: ProducerContact | undefined;
  comms: CommRow[];
  showConfirmReceipt: boolean;
}) {
  const finca = toFincaEudrFields(lot.fincas);
  const eudrStatus: EudrStatus = lotEudrStatus(lot, finca ? [finca] : []);
  const derivedRiskLevel = deriveLotRiskLevel(lot);
  // País, complejidad, riesgo de producto y esquemas de certificación son
  // derivados (mismas funciones puras que el pane del productor). Se muestran
  // ya calculados a partir de lo guardado; se recalculan al guardar el form.
  const derivedComplexity = deriveChainComplexity(lot.eudr_custody_stages);
  const derivedProductRisk = deriveProductRisk(lot.eudr_product_risk_factors);
  const derivedCountryRisk = countryRiskFor(lot.eudr_country);
  const certSchemes = deriveCertSchemes(lot.datasheet ?? {});
  const productFactors = lot.eudr_product_risk_factors ?? [];
  const naLabels = FT2_NA_LABELS.filter((f) => lot.datasheet?.[f.key]).map((f) => f.label);
  const awaitingShipment =
    showConfirmReceipt && lot.source !== "bcp_manual_entry" && !lot.sample_shipped_at && !lot.sample_2kg_confirmed_at;

  async function saveEudr(formData: FormData) {
    "use server";
    await updateLotEudr(lot.id, formData);
  }
  async function addComm(formData: FormData) {
    "use server";
    await logProducerComm(lot.producer_id, `Lote ${lot.name}`, formData, { lotId: lot.id });
  }

  // Section anchors must be unique per lot -- several modals share the page.
  const aid = (s: string) => `lot-${lot.id.slice(0, 8)}-${s}`;
  const ds = lot.datasheet ?? {};
  const dsRow = (label: string, value: React.ReactNode) =>
    value ? (
      <p className={styles.meta} style={{ margin: "3px 0" }}>
        {label}: <b style={{ color: "var(--ink)" }}>{value}</b>
      </p>
    ) : null;
  const sectionHead = (id: string, label: string) => (
    <h4 id={id} style={{ margin: "18px 0 6px", fontSize: 13.5, borderBottom: "1px solid var(--line)", paddingBottom: 4, scrollMarginTop: 8 }}>
      {label}
    </h4>
  );

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
    <FincaModalRow title={lot.name} summary={summary}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <span className={`${styles.badge} mono`}>{ctcLotReferenceShort(lot.id)}</span>
        <EudrStatusBadge status={eudrStatus} />
        {lot.grade && <span className={styles.badge}>{GRADE_LABEL[lot.grade] ?? lot.grade}</span>}
        {lot.source === "bcp_manual_entry" && <span className={styles.badge}>registrado por BCP</span>}
      </div>
      <ProducerContactLine producer={producer} />
      <p className={styles.meta}>Finca: {lot.fincas?.name ?? "—"}</p>

      {/* Quick nav: the modal holds the full FT/FT2/EUDR detail; these jump links keep it navigable. */}
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        {[
          [aid("ft"), "FT · Identidad"],
          [aid("ft2"), "FT2 · Certificados y análisis"],
          [aid("eudr"), "EUDR"],
          [aid("comms"), `Comunicación (${comms.length})`],
        ].map(([href, label]) => (
          <a key={href} className="btn btn-sm" href={`#${href}`}>
            {label}
          </a>
        ))}
      </nav>

      {naLabels.length > 0 && (
        <p className={styles.meta}>Declarado &quot;no lo sé / no aplica&quot;: {naLabels.join(" · ")}</p>
      )}
      {awaitingShipment && <p className={styles.meta}>Ficha completa · esperando que el productor confirme el envío de la muestra</p>}
      {lot.sample_shipped_at && !lot.sample_2kg_confirmed_at && (
        <p className={styles.meta}>
          Muestra enviada el {new Date(lot.sample_shipped_at).toLocaleDateString("es-CO")} · pendiente de confirmar recibo
        </p>
      )}
      {finca && fincaEudrStatus(finca).code === "no_apta" && (
        <p className={styles.warn}>La finca de origen tiene deforestación o producción ilegal declarada.</p>
      )}
      {showConfirmReceipt && (lot.sample_shipped_at || lot.source === "bcp_manual_entry") && !lot.sample_2kg_confirmed_at && (
        <form
          action={async () => {
            "use server";
            await confirmSampleReceived(lot.id);
          }}
          style={{ marginTop: 8 }}
        >
          <button className="btn btn-sm btn-solid" type="submit">
            Confirmar recibido → Muestras Recibidas
          </button>
        </form>
      )}

      {sectionHead(aid("ft"), "FT · Identidad y Origen")}
      {dsRow("Producto", ds.product_name)}
      {dsRow("Especie", ds.species)}
      {dsRow("Tipo de producto", [ds.product_type, ds.hs_code].filter(Boolean).join(" · HS "))}
      {dsRow("Cosecha", [ds.harvest_year, ds.harvest_season].filter(Boolean).join(" · "))}
      {dsRow("Categoría de origen", ds.origin_category)}
      {dsRow("Finca declarada", ds.estate)}
      {dsRow("Región", [ds.region_dep, ds.county_muni_text || ds.county_muni].filter(Boolean).join(" · "))}
      {dsRow("Altitud", ds.masl ? `${ds.masl} msnm` : lot.ficha_altitud_m ? `${lot.ficha_altitud_m} msnm` : null)}
      {dsRow("Edad del cultivo", ds.plantation_age)}
      {dsRow("Variedad", lot.ficha_variedad)}
      {dsRow("Proceso", [ds.base_processing || lot.ficha_proceso, ds.special_processing].filter(Boolean).join(" + "))}
      {!ds.product_name && !lot.ficha_variedad && <p className={styles.meta}>El productor todavía no diligencia esta sección.</p>}

      {sectionHead(aid("ft2"), "FT2 · Certificados y Análisis")}
      {dsRow("Certificados (A3/A4)", certSchemes.length ? certSchemes.join(", ") : null)}
      {dsRow("Premios y rankings", ds.awards)}
      {dsRow("Perfil de taza", ds.cupping_profile)}
      {dsRow("Puntaje SCA estimado", lot.ficha_puntaje_estimado)}
      {dsRow("Notas", lot.ficha_notas_cata || ds.analysis_notes)}
      {!certSchemes.length && !ds.awards && !ds.cupping_profile && !lot.ficha_puntaje_estimado && (
        <p className={styles.meta}>Sin certificados ni análisis declarados todavía.</p>
      )}

      {sectionHead(aid("eudr"), "EUDR · Asistencia BCP")}
      <form action={saveEudr} style={{ marginTop: 8 }}>
          <div className={styles.field}>
            <label>Cadena de custodia</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CUSTODY_STAGES.map(([key, label]) => (
                <label key={key} style={{ display: "inline-flex", gap: 5, fontSize: 12.5, fontWeight: 400 }}>
                  <input type="checkbox" name="eudr_custody_stages" value={key} defaultChecked={lot.eudr_custody_stages?.includes(key)} /> {label}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <label>Método de separación física / documental</label>
            <select name="eudr_custody_method" defaultValue={lot.eudr_custody_method ?? ""}>
              <option value="">Sin definir</option>
              <option value="ctc_standard">CTC Parchment Storage Standard (yute + liner + HIC + QR)</option>
              <option value="custom">Método propio</option>
            </select>
            <textarea name="eudr_custody_notes" defaultValue={lot.eudr_custody_notes ?? ""} placeholder="Si es método propio: describa cómo se mantiene separado e identificado el lote…" />
          </div>

          <div className={styles.field}>
            <label>País / región de producción</label>
            <select name="eudr_country" defaultValue={lot.eudr_country ?? ""}>
              <option value="">Seleccione…</option>
              {EUDR_ORIGIN_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className={styles.meta} style={{ margin: "4px 0 0" }}>
              Clasificación EUDR (Reg. 2025/1093): <b>{lot.eudr_country ? derivedCountryRisk : "defina el país"}</b>
            </p>
          </div>
          <div className={styles.field}>
            <label>Complejidad de la cadena</label>
            <p className={styles.meta} style={{ margin: 0, fontWeight: 600 }}>
              {derivedComplexity || "Pendiente"}
            </p>
            <p className={styles.meta} style={{ margin: "2px 0 0" }}>
              Se deriva de las {lot.eudr_custody_stages?.length ?? 0} etapa(s) de custodia marcadas.
            </p>
          </div>
          <div className={styles.field}>
            <label>Riesgo propio del producto</label>
            <div style={{ display: "grid", gap: 6 }}>
              {PRODUCT_RISK_QUESTIONS.map(([key, label]) => (
                <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 12.5, fontWeight: 400, alignItems: "flex-start" }}>
                  <input type="checkbox" name="eudr_product_risk_factors" value={key} defaultChecked={productFactors.includes(key)} style={{ marginTop: 2 }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className={styles.meta} style={{ margin: "4px 0 0", fontWeight: 600 }}>Nivel derivado: {derivedProductRisk}</p>
          </div>
          <div className={styles.field}>
            <label>Esquemas de certificación / verificación</label>
            <p className={styles.meta} style={{ margin: 0 }}>
              {certSchemes.length ? certSchemes.join(", ") : "Ninguno declarado en A3/A4."}
            </p>
          </div>
          <div className={styles.field}>
            <label>¿Indicios de ilegalidad/deforestación?</label>
            <select name="eudr_illegality_indicators" defaultValue={triSelectValue(lot.eudr_illegality_indicators)}>
              <option value="">Sin definir</option>
              <option value="si">Sí, hay indicios</option>
              <option value="no">No hay indicios</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>¿Documentos disponibles y verificables?</label>
            <select name="eudr_docs_available" defaultValue={triSelectValue(lot.eudr_docs_available)}>
              <option value="">Sin definir</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>
              Nivel de riesgo determinado
              <FieldInfo text="Determinación de BCP como evaluador (Art. 10-11 EUDR). La sugerencia se calcula con los indicios de ilegalidad, la disponibilidad de documentos, el riesgo país y la efectividad de la mitigación -- puede adoptarla o apartarse de ella con criterio propio." />
            </label>
            <select name="eudr_risk_level" defaultValue={lot.eudr_risk_level ?? ""}>
              <option value="">Pendiente</option>
              <option value="insignificante">Insignificante</option>
              <option value="no_insignificante">No insignificante</option>
            </select>
            <p className={styles.meta} style={{ margin: "4px 0 0" }}>
              Sugerencia según los criterios: <b>{RISK_LEVEL_LABEL[derivedRiskLevel] ?? "defina riesgo país, indicios y documentos"}</b>
            </p>
          </div>
          <div className={styles.field}>
            <label>Acciones de mitigación (declaradas por el productor)</label>
            <p className={styles.meta} style={{ margin: 0 }}>
              {lot.eudr_mitigation_actions || "El productor no ha declarado acciones de mitigación (Ficha A5)."}
            </p>
          </div>
          <div className={styles.field}>
            <label>¿La mitigación reduce el riesgo a insignificante?</label>
            <select name="eudr_mitigation_effective" defaultValue={triSelectValue(lot.eudr_mitigation_effective)}>
              <option value="">Sin definir</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Responsable</label>
            <input name="eudr_mitigation_responsible" defaultValue={(lot.eudr_mitigation_responsible ?? "").split(" · ")[0]} placeholder="Nombre · cargo" />
            <p className={styles.meta} style={{ margin: "4px 0 0" }}>
              {lot.eudr_mitigation_responsible
                ? `Registrado: ${lot.eudr_mitigation_responsible}`
                : "La fecha se registra automáticamente al guardar."}
            </p>
          </div>

          <button className="btn btn-sm btn-solid" type="submit">Guardar información EUDR</button>
        </form>

      {sectionHead(aid("comms"), `Registro de comunicación (${comms.length})`)}
        <form action={addComm} style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="note" required placeholder="Nota interna sobre este lote…" style={{ flex: 1, minWidth: 180 }} />
          <button className="btn btn-sm btn-solid" type="submit">Registrar</button>
        </form>
        {comms.length > 0 && (
          <ul className={styles.auditList} style={{ marginTop: 10 }}>
            {comms.map((c) => (
              <li key={c.id}>
                <span className={c.author_role === "producer" ? styles.badgeGood : styles.badge}>
                  {c.author_role === "producer" ? "Productor" : "CTC"}
                </span>{" "}
                <b>{new Date(c.created_at).toLocaleDateString("es-CO")}</b> · {c.note}
              </li>
            ))}
          </ul>
        )}
    </FincaModalRow>
  );
}
