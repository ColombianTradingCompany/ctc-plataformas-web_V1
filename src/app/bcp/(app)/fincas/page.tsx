import { createServiceRoleClient } from "@/lib/supabase/server";
import { fincaEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { approveFinca, rejectFinca, updateFincaEudr } from "../actions";
import { logProducerComm } from "../commActions";
import { ProducerContactLine } from "../ProducerContactLine";
import { FincaEudrEditor } from "./FincaEudrEditor";
import styles from "../shared.module.css";

type CommRow = { id: string; context_label: string | null; note: string; created_at: string };

type FincaRow = {
  id: string;
  name: string;
  producer_id: string;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  hectares: string | number | null;
  requires_eudr_polygon: boolean | null;
  eudr_polygon_geojson: { lat: number; lng: number }[] | null;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_planting_date: string | null;
  eudr_production_system: string | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_evidence_types: string[] | null;
  eudr_evidence_notes: string | null;
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
  eudr_legal_docs_asset_id: string | null;
  eudr_legal_docs_filename: string | null;
  eudr_sustainability_tags: string[] | null;
  eudr_sustainability_notes: string | null;
  eudr_google_earth_url: string | null;
  created_at: string;
};

function toEudrFields(f: FincaRow): FincaEudrFields {
  return {
    name: f.name,
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

function missingChecks(f: FincaEudrFields): string[] {
  const gaps: string[] = [];
  if (!f.name) gaps.push("nombre");
  if (!((f.lat && f.lng) || f.vereda !== "—" || f.mun !== "—" || f.depto !== "—")) gaps.push("geolocalización o dirección");
  if (!(f.ha !== "—" && Number(f.ha.replace(",", ".")) > 0)) gaps.push("área cultivada");
  if (f.eudrDeforestationFree !== true) gaps.push("declaración de no deforestación");
  if (f.eudrLegalAreas.length === 0) gaps.push("áreas de legislación verificadas");
  if (!f.eudrTenure) gaps.push("tenencia de la tierra");
  return gaps;
}

export default async function BcpFincasPage() {
  const service = createServiceRoleClient();
  const { data: pendingFincas } = await service
    .from("fincas")
    // A single literal string (not runtime-concatenated) -- see the note on
    // the lots query in ../lotes/page.tsx for why that distinction matters.
    .select(
      `id, name, producer_id, vereda, municipio, departamento, hectares, requires_eudr_polygon, eudr_polygon_geojson, eudr_lat, eudr_lng,
       eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types,
       eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_legal_docs_asset_id, eudr_legal_docs_filename,
       eudr_sustainability_tags, eudr_sustainability_notes, eudr_google_earth_url, created_at`
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const fincaRows = (pendingFincas as FincaRow[] | null) ?? [];
  const [legalDocUrlByAssetId, producers, { data: comms }] = await Promise.all([
    signedKaffetalMediaUrls(service, fincaRows.map((f) => f.eudr_legal_docs_asset_id)),
    fetchProducerContacts(service, fincaRows.map((f) => f.producer_id)),
    service
      .from("producer_comm_log")
      .select("id, context_label, note, created_at")
      .in("context_label", fincaRows.map((f) => `Finca ${f.name}`))
      .order("created_at", { ascending: false }),
  ]);
  const commsByContext = new Map<string, CommRow[]>();
  for (const c of (comms as CommRow[] | null) ?? []) {
    const key = c.context_label ?? "";
    commsByContext.set(key, [...(commsByContext.get(key) ?? []), c]);
  }

  return (
    <div>
      <h1 className={styles.title}>Fincas pendientes de revisión</h1>
      {!fincaRows.length && <p className={styles.empty}>No hay fincas pendientes.</p>}
      <div className={styles.list}>
        {fincaRows.map((finca) => {
          const eudrFields = toEudrFields(finca);
          const status = fincaEudrStatus(eudrFields);
          const gaps = missingChecks(eudrFields);
          const blockedByPolygon = !!(finca.requires_eudr_polygon && !finca.eudr_polygon_geojson?.length);
          const blockedByEudr = status.code === "no_apta" || blockedByPolygon;

          async function reject(formData: FormData) {
            "use server";
            await rejectFinca(finca.id, String(formData.get("notes") ?? ""));
          }
          async function saveEudr(formData: FormData) {
            "use server";
            await updateFincaEudr(finca.id, formData);
          }
          async function addComm(formData: FormData) {
            "use server";
            await logProducerComm(finca.producer_id, `Finca ${finca.name}`, formData);
          }
          const comms = commsByContext.get(`Finca ${finca.name}`) ?? [];

          return (
            <div className={styles.card} key={finca.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3>{finca.name}</h3>
                    <EudrStatusBadge status={status} />
                  </div>
                  <ProducerContactLine producer={producers.get(finca.producer_id)} />
                  <p className={styles.meta}>
                    {finca.municipio}, {finca.departamento} · {finca.hectares} ha
                    {finca.requires_eudr_polygon && " · requiere polígono EUDR"}
                  </p>
                  {blockedByPolygon && <p className={styles.warn}>Falta el polígono EUDR — no se puede aprobar todavía.</p>}
                  {status.code === "no_apta" && (
                    <p className={styles.warn}>Deforestación o producción ilegal declarada — no se puede aprobar.</p>
                  )}
                  {status.code === "pendiente" && gaps.length > 0 && (
                    <p className={styles.meta}>Falta: {gaps.join(", ")}.</p>
                  )}
                </div>
                <div className={styles.actions}>
                  <form action={approveFinca.bind(null, finca.id)}>
                    <button className="btn btn-solid" type="submit" disabled={blockedByEudr}>
                      Aprobar
                    </button>
                  </form>
                  <form action={reject} className={styles.rejectForm}>
                    <input name="notes" placeholder="Motivo del rechazo (opcional)" />
                    <button className="btn" type="submit">
                      Rechazar
                    </button>
                  </form>
                </div>
              </div>

              <FincaEudrEditor
                fincaName={finca.name}
                values={finca}
                legalDocUrl={finca.eudr_legal_docs_asset_id ? legalDocUrlByAssetId.get(finca.eudr_legal_docs_asset_id) : undefined}
                saveAction={saveEudr}
              />

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  Registro de comunicación ({comms.length})
                </summary>
                <form action={addComm} style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input name="note" required placeholder="Nota interna sobre esta finca…" style={{ flex: 1, minWidth: 200 }} />
                  <button className="btn btn-sm btn-solid" type="submit">Registrar</button>
                </form>
                {comms.length > 0 && (
                  <ul className={styles.auditList} style={{ marginTop: 10 }}>
                    {comms.map((c) => (
                      <li key={c.id}>
                        <b>{new Date(c.created_at).toLocaleDateString("es-CO")}</b> · {c.note}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
