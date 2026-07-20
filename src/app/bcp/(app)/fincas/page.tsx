import { createServiceRoleClient } from "@/lib/supabase/server";
import { fincaEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { FINCA_SEGMENTS, segmentFinca } from "@/lib/bcp/producerSegments";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { fincaCode } from "@/components/kaffetal-regal/data";
import { daneCodeFor } from "@/lib/daneCodes";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { approveFinca, rejectFinca, updateFincaEudr, setFincaCertShared } from "../actions";
import { logProducerComm } from "../commActions";
import { ProducerContactLine } from "../ProducerContactLine";
import { ActionForm } from "../ActionForm";
import { FincaEudrEditor, type ProducerAnswers } from "./FincaEudrEditor";
import { FincaModalRow } from "./FincaModalRow";
import styles from "../shared.module.css";

type CommRow = { id: string; finca_id: string | null; context_label: string | null; note: string; created_at: string; author_role: string };

type FincaRow = {
  id: string;
  name: string;
  producer_id: string;
  status: string;
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
  eudr_evidence_files: Record<string, { assetId: string; fileName: string }> | null;
  eudr_sustainability_files: Record<string, { assetId: string; fileName: string }> | null;
  eudr_cert_shared: boolean | null;
  eudr_producer_answers: Record<string, unknown> | null;
  eudr_local_infra: string[] | null;
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

// ── Fincas como kanban (2026-07-20, criterios del owner) ────────────────────
// Cinco columnas derivadas (segmentFinca en src/lib/bcp/producerSegments.ts):
// Marchitando (pendiente >7 días con EUDR incompleta, sin contar video) ·
// Nuevas (pendiente ≤7 días, incompleta) · En Proceso (pendiente con EUDR
// completa — lista para el veredicto, a cualquier edad) · Aprobadas · No
// Aprobadas. La tarjeta y su modal de detalle son los mismos de siempre.

export default async function BcpFincasPage() {
  const service = createServiceRoleClient();
  const { data: allFincas } = await service
    .from("fincas")
    // A single literal string (not runtime-concatenated) -- see the note on
    // the lots query in ../lotes/page.tsx for why that distinction matters.
    .select(
      `id, name, producer_id, status, vereda, municipio, departamento, hectares, requires_eudr_polygon, eudr_polygon_geojson, eudr_lat, eudr_lng,
       eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types,
       eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_legal_docs_asset_id, eudr_legal_docs_filename,
       eudr_sustainability_tags, eudr_sustainability_notes, eudr_google_earth_url, eudr_evidence_files, eudr_sustainability_files, eudr_cert_shared, eudr_producer_answers, eudr_local_infra, created_at`
    )
    .order("created_at", { ascending: true });

  const fincaRows = (allFincas as FincaRow[] | null) ?? [];
  // All EUDR-related asset ids (producer legal doc + BCP's per-evidence /
  // per-sustainability attachments) resolved to signed URLs in one call.
  const allAssetIds = fincaRows.flatMap((f) => [
    f.eudr_legal_docs_asset_id,
    ...Object.values(f.eudr_evidence_files ?? {}).map((v) => v.assetId),
    ...Object.values(f.eudr_sustainability_files ?? {}).map((v) => v.assetId),
  ]);
  const [legalDocUrlByAssetId, producers, { data: comms }] = await Promise.all([
    signedKaffetalMediaUrls(service, allAssetIds),
    fetchProducerContacts(service, fincaRows.map((f) => f.producer_id)),
    service
      .from("producer_comm_log")
      .select("id, finca_id, context_label, note, created_at, author_role")
      .in("finca_id", fincaRows.map((f) => f.id))
      .order("created_at", { ascending: false }),
  ]);
  const commsByFinca = new Map<string, CommRow[]>();
  for (const c of (comms as CommRow[] | null) ?? []) {
    if (!c.finca_id) continue;
    commsByFinca.set(c.finca_id, [...(commsByFinca.get(c.finca_id) ?? []), c]);
  }

  return (
    <div>
      <h1 className={styles.title}>Fincas</h1>
      <p className={styles.subtitle}>
        <b>Marchitando</b> (pendiente hace &gt;7 días con EUDR incompleta) · <b>Nuevas</b> (≤7 días) · <b>En Proceso</b>{" "}
        (EUDR completa — lista para el veredicto) · <b>Aprobadas</b> · <b>No Aprobadas</b>. El video no cuenta para la
        completitud.
      </p>

      {!fincaRows.length && <p className={styles.empty}>No hay fincas registradas.</p>}
      <div className={styles.board}>
        {FINCA_SEGMENTS.map((seg) => {
          const segRows = fincaRows.filter(
            (f) =>
              segmentFinca({
                status: f.status,
                createdAt: f.created_at,
                eudrComplete: missingChecks(toEudrFields(f)).length === 0,
              }) === seg.id
          );
          return (
            <div className={styles.column} key={seg.id}>
              <div className={styles.columnHead}>
                <h3>{seg.label}</h3>
                <span className={styles.columnCount}>{segRows.length}</span>
              </div>
              <div className={styles.columnList}>
                {!segRows.length && <p className={styles.empty}>—</p>}
                {segRows.map((finca) => {
          const eudrFields = toEudrFields(finca);
          const status = fincaEudrStatus(eudrFields);
          const gaps = missingChecks(eudrFields);
          const ready = gaps.length === 0;
          const blockedByPolygon = !!(finca.requires_eudr_polygon && !finca.eudr_polygon_geojson?.length);
          // Solo se aprueba una finca EUDR "Apta" (completa). Antes solo se
          // bloqueaba "No apta"/sin polígono, así que una finca "Pendiente"
          // (incompleta) podía aprobarse y quedaba aprobada con distintivo
          // EUDR "Pendiente" -- el caso de La Ceiba.
          const blockedByEudr = status.code !== "apta" || blockedByPolygon;

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
            await logProducerComm(finca.producer_id, `Finca ${finca.name}`, formData, { fincaId: finca.id });
          }
          const comms = commsByFinca.get(finca.id) ?? [];
          const dane = daneCodeFor(finca.departamento, finca.municipio);

          const summary = (
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 15, color: "var(--ink)" }}>{finca.name}</b>
                <span className={styles.badge}>{fincaCode(finca.id)}</span>
                <EudrStatusBadge status={status} />
                {finca.requires_eudr_polygon && !finca.eudr_polygon_geojson?.length && (
                  <span className={styles.badgeWarn}>Falta polígono</span>
                )}
                {finca.status === "pending_review" && (
                  <span className={ready ? styles.badgeGood : styles.badge}>
                    {ready ? "Lista para revisión" : "En preparación"}
                  </span>
                )}
              </span>
              <span className={styles.meta}>
                {producers.get(finca.producer_id)?.fullName ?? "Productor"} · {finca.municipio}, {finca.departamento} · {finca.hectares} ha
                {dane ? ` · DANE ${dane.code}` : ""}
              </span>
            </span>
          );

          return (
            <FincaModalRow key={finca.id} title={finca.name} summary={summary} anchorId={`finca-${finca.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <span className={styles.badge}>{fincaCode(finca.id)}</span>
                <EudrStatusBadge status={status} />
              </div>
              <ProducerContactLine producer={producers.get(finca.producer_id)} />
              <p className={styles.meta}>
                {finca.municipio}, {finca.departamento} · {finca.hectares} ha
                {finca.requires_eudr_polygon && " · requiere polígono EUDR"}
              </p>
              <p className={styles.meta}>
                DANE:{" "}
                {dane ? (
                  <>
                    <span className={styles.badge}>{dane.code}</span> {dane.mun}, {dane.dep} (depto {dane.depCode})
                  </>
                ) : (
                  "sin coincidencia — verifique municipio/departamento"
                )}
              </p>
              {finca.status !== "approved" && blockedByPolygon && (
                <p className={styles.warn}>Falta el polígono EUDR — no se puede aprobar todavía.</p>
              )}
              {finca.status !== "approved" && status.code === "no_apta" && (
                <p className={styles.warn}>Deforestación o producción ilegal declarada — no se puede aprobar.</p>
              )}
              {finca.status !== "approved" && status.code === "pendiente" && gaps.length > 0 && (
                <p className={styles.meta}>Falta: {gaps.join(", ")}.</p>
              )}

              <div className={styles.actions} style={{ marginTop: 10 }}>
                {finca.status !== "approved" && (
                  <ActionForm
                    action={approveFinca.bind(null, finca.id)}
                    submitLabel={finca.status === "rejected" ? "Reincorporar (aprobar)" : "Aprobar"}
                    pendingLabel="Aprobando…"
                    buttonClassName="btn btn-solid"
                    disabled={blockedByEudr}
                  />
                )}
                {finca.status !== "rejected" && (
                  <form action={reject} className={styles.rejectForm}>
                    <input name="notes" placeholder="Motivo del rechazo (opcional)" />
                    <button className="btn" type="submit">
                      {finca.status === "approved" ? "Revocar (rechazar)" : "Rechazar"}
                    </button>
                  </form>
                )}
                {finca.status === "approved" && (
                  <>
                    <a className="btn btn-sm" href={`/bcp/fincas/${finca.id}/dossier`} target="_blank" rel="noopener noreferrer">
                      Ver dossier EUDR ↗
                    </a>
                    <ActionForm
                      action={setFincaCertShared.bind(null, finca.id, !finca.eudr_cert_shared)}
                      submitLabel={
                        finca.eudr_cert_shared
                          ? "Dejar de compartir con el productor"
                          : "Compartir certificación con el productor"
                      }
                      buttonClassName={`btn btn-sm ${finca.eudr_cert_shared ? "" : "btn-solid"}`}
                    />
                  </>
                )}
              </div>
              {finca.status === "approved" && (
                <p className={styles.meta} style={{ marginTop: 4 }}>
                  {finca.eudr_cert_shared
                    ? "✓ El productor puede descargar su Certificación EUDR."
                    : "El productor aún no puede descargar la certificación (no compartida)."}
                </p>
              )}

              <FincaEudrEditor
                fincaName={finca.name}
                producerId={finca.producer_id}
                values={finca}
                legalDocUrl={finca.eudr_legal_docs_asset_id ? legalDocUrlByAssetId.get(finca.eudr_legal_docs_asset_id) : undefined}
                fileUrls={Object.fromEntries(
                  [
                    ...Object.values(finca.eudr_evidence_files ?? {}),
                    ...Object.values(finca.eudr_sustainability_files ?? {}),
                  ]
                    .map((v) => [v.assetId, legalDocUrlByAssetId.get(v.assetId)])
                    .filter((e): e is [string, string] => !!e[1])
                )}
                producerAnswers={
                  finca.eudr_producer_answers && Object.keys(finca.eudr_producer_answers).length > 0
                    ? (finca.eudr_producer_answers as unknown as ProducerAnswers)
                    : null
                }
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
                        <span className={c.author_role === "producer" ? styles.badgeGood : styles.badge}>
                          {c.author_role === "producer" ? "Productor" : "CTC"}
                        </span>{" "}
                        <b>{new Date(c.created_at).toLocaleDateString("es-CO")}</b> · {c.note}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </FincaModalRow>
          );
        })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
