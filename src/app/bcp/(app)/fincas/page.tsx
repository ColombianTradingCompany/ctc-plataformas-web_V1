import { createServiceRoleClient } from "@/lib/supabase/server";
import { fincaEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { FINCA_SEGMENTS, segmentFinca } from "@/lib/bcp/producerSegments";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { fincaCode } from "@/components/kaffetal-regal/data";
import { daneCodeFor } from "@/lib/daneCodes";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { approveFinca, rejectFinca, updateFincaEudr, setFincaCertShared, deleteAbandonedFinca } from "../actions";
import { logProducerComm } from "../commActions";
import { ProducerContactLine } from "../ProducerContactLine";
import { ActionForm } from "../ActionForm";
import { DeleteAbandonedButton } from "../DeleteAbandonedButton";
import { FincaEudrEditor, type ProducerAnswers } from "./FincaEudrEditor";
import { FincaModalRow } from "./FincaModalRow";
import { FincaPanel, type FincaLote } from "./FincaPanel";
import { FincasViewSwitch } from "./FincasViewSwitch";
import { fincaCenter } from "@/lib/earthKml";
import type { GeoMarker } from "@/components/bcp/GeoMap";
import styles from "../shared.module.css";

type CommRow = { id: string; finca_id: string | null; context_label: string | null; note: string; created_at: string; author_role: string };
type LotRow = { id: string; name: string; finca_id: string | null; stage: string; intake_step: number };

type FincaRow = {
  id: string;
  name: string;
  producer_id: string;
  status: string;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  hectares: string | number | null;
  profile_photo_asset_id: string | null;
  video_asset_id: string | null;
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

// ── El estado corto de la tarjeta (2026-07-23, pedido del owner) ─────────────
// UN solo rótulo por finca, derivado en orden — el primer paso que aplica gana:
//   1. Rechazada por BCP            → "No aprobada"           (rojo)
//   2. Aprobada + cert. compartida  → "Aprobada · cert. ✓"    (verde)
//   3. Aprobada                     → "Aprobada"              (verde)
//   4. Declaró deforestación/ilegal → "No apta EUDR"          (rojo)
//   5. >4 ha sin polígono dibujado  → "Falta polígono"        (ámbar)
//   6. EUDR con vacíos              → "EUDR incompleta"       (ámbar)
//   7. Todo listo, sin veredicto    → "Lista para veredicto"  (verde)
type ShortStatus = { label: string; cls: "badgeBad" | "badgeGood" | "badgeWarn" };
function fincaShortStatus(f: FincaRow): ShortStatus {
  if (f.status === "rejected") return { label: "No aprobada", cls: "badgeBad" };
  if (f.status === "approved") return f.eudr_cert_shared ? { label: "Aprobada · cert. ✓", cls: "badgeGood" } : { label: "Aprobada", cls: "badgeGood" };
  const eudr = fincaEudrStatus(toEudrFields(f));
  if (eudr.code === "no_apta") return { label: "No apta EUDR", cls: "badgeBad" };
  if (f.requires_eudr_polygon && !f.eudr_polygon_geojson?.length) return { label: "Falta polígono", cls: "badgeWarn" };
  if (missingChecks(toEudrFields(f)).length > 0) return { label: "EUDR incompleta", cls: "badgeWarn" };
  return { label: "Lista para veredicto", cls: "badgeGood" };
}

// Estado + etapa individual de un lote asociado (pestaña "Lotes asociados").
const STAGE_LABEL: Record<string, string> = {
  borrador: "Borrador",
  ficha_completa: "Ficha enviada",
  apto: "Apto",
  no_apto: "No apto",
  fila_arena: "En sesión de Arena",
  evaluado: "Evaluado",
  galardonado: "Galardonado",
};
function lotStatus(l: LotRow): Pick<FincaLote, "statusLabel" | "statusTone"> {
  switch (l.stage) {
    case "borrador":
      return { statusLabel: `Ficha en curso · paso ${l.intake_step}/4`, statusTone: "muted" };
    case "ficha_completa":
      return { statusLabel: "Esperando EVA", statusTone: "warn" };
    case "no_apto":
      return { statusLabel: "Requiere atención", statusTone: "bad" };
    case "apto":
    case "fila_arena":
    case "galardonado":
      return { statusLabel: "En orden", statusTone: "good" };
    default:
      return { statusLabel: "—", statusTone: "muted" };
  }
}

// ── Fincas como kanban (2026-07-20, criterios del owner) ────────────────────
// Cinco columnas derivadas (segmentFinca en src/lib/bcp/producerSegments.ts):
// Marchitando · Nuevas · En Proceso · Aprobadas · No Aprobadas. Desde 2026-07-23
// la tarjeta es COMPACTA (nombre + proveedor con enlace + estado corto) y el
// detalle vive en un pop-up con pestañas (FincaPanel).

export default async function BcpFincasPage() {
  const service = createServiceRoleClient();
  const { data: allFincas } = await service
    .from("fincas")
    // A single literal string (not runtime-concatenated) -- see the note on
    // the lots query in ../lotes/page.tsx for why that distinction matters.
    .select(
      `id, name, producer_id, status, vereda, municipio, departamento, hectares, profile_photo_asset_id, video_asset_id,
       requires_eudr_polygon, eudr_polygon_geojson, eudr_lat, eudr_lng,
       eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types,
       eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_legal_docs_asset_id, eudr_legal_docs_filename,
       eudr_sustainability_tags, eudr_sustainability_notes, eudr_google_earth_url, eudr_evidence_files, eudr_sustainability_files, eudr_cert_shared, eudr_producer_answers, eudr_local_infra, created_at`
    )
    .order("created_at", { ascending: true });

  const fincaRows = (allFincas as FincaRow[] | null) ?? [];
  // Todos los asset ids en un solo lote de firmas: documentos EUDR + la foto y
  // el video de la finca (pestaña General del pop-up).
  const allAssetIds = fincaRows.flatMap((f) => [
    f.eudr_legal_docs_asset_id,
    f.profile_photo_asset_id,
    f.video_asset_id,
    ...Object.values(f.eudr_evidence_files ?? {}).map((v) => v.assetId),
    ...Object.values(f.eudr_sustainability_files ?? {}).map((v) => v.assetId),
  ]);
  const [signedUrls, producers, { data: comms }, { data: lotsRaw }] = await Promise.all([
    signedKaffetalMediaUrls(service, allAssetIds),
    fetchProducerContacts(service, fincaRows.map((f) => f.producer_id)),
    service
      .from("producer_comm_log")
      .select("id, finca_id, context_label, note, created_at, author_role")
      .in("finca_id", fincaRows.map((f) => f.id))
      .order("created_at", { ascending: false }),
    service
      .from("lots")
      .select("id, name, finca_id, stage, intake_step")
      .in("finca_id", fincaRows.map((f) => f.id))
      .order("created_at", { ascending: false }),
  ]);
  const commsByFinca = new Map<string, CommRow[]>();
  for (const c of (comms as CommRow[] | null) ?? []) {
    if (!c.finca_id) continue;
    commsByFinca.set(c.finca_id, [...(commsByFinca.get(c.finca_id) ?? []), c]);
  }
  const lotsByFinca = new Map<string, LotRow[]>();
  for (const l of (lotsRaw as LotRow[] | null) ?? []) {
    if (!l.finca_id) continue;
    lotsByFinca.set(l.finca_id, [...(lotsByFinca.get(l.finca_id) ?? []), l]);
  }

  return (
    <div>
      <h1 className={styles.title}>Fincas</h1>
      <p className={styles.subtitle}>
        <b>Marchitando</b> (pendiente hace &gt;7 días con EUDR incompleta) · <b>Nuevas</b> (≤7 días) · <b>En Proceso</b>{" "}
        (EUDR completa — lista para el veredicto) · <b>Aprobadas</b> · <b>No Aprobadas</b>. El video no cuenta para la
        completitud. Toque la tarjeta para abrir el panel de la finca.
      </p>

      {!fincaRows.length && <p className={styles.empty}>No hay fincas registradas.</p>}
      <FincasViewSwitch
        markers={fincaRows.flatMap((f): GeoMarker[] => {
          const center = fincaCenter(f.eudr_lat, f.eudr_lng, f.eudr_polygon_geojson);
          if (!center) return [];
          const short = fincaShortStatus(f);
          return [
            {
              id: f.id,
              lat: center.la,
              lng: center.ln,
              color: f.status === "approved" ? "#166534" : f.status === "rejected" ? "#991B1B" : "#B45309",
              title: f.name,
              lines: [
                fincaCode(f.id),
                short.label,
                [f.municipio, f.departamento].filter(Boolean).join(", ") + (f.hectares ? ` · ${f.hectares} ha` : ""),
                producers.get(f.producer_id)?.fullName ?? "Productor",
              ],
              link: { label: "Abrir panel", href: `#finca-${f.id}` },
            },
          ];
        })}
      >
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
                  const blockedByPolygon = !!(finca.requires_eudr_polygon && !finca.eudr_polygon_geojson?.length);
                  // Solo se aprueba una finca EUDR "Apta" (completa) — ver el
                  // caso de La Ceiba en el historial de este archivo.
                  const blockedByEudr = status.code !== "apta" || blockedByPolygon;
                  const short = fincaShortStatus(finca);
                  const producer = producers.get(finca.producer_id);

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
                  const fincaComms = commsByFinca.get(finca.id) ?? [];
                  const fincaLots = lotsByFinca.get(finca.id) ?? [];
                  const dane = daneCodeFor(finca.departamento, finca.municipio);

                  // Tarjeta COMPACTA: nombre + estado corto; el proveedor va como
                  // enlace propio (prop `link` de la fila) para no anidar <a> en el botón.
                  const summary = (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <b style={{ fontSize: 14.5, color: "var(--ink)" }}>{finca.name}</b>
                      <span className={styles[short.cls]}>{short.label}</span>
                    </span>
                  );

                  return (
                    <FincaModalRow
                      key={finca.id}
                      title={finca.name}
                      summary={summary}
                      anchorId={`finca-${finca.id}`}
                      link={{ href: `/bcp/productores#prod-${finca.producer_id}`, label: producer?.fullName || "Proveedor" }}
                    >
                      <FincaPanel
                        data={{
                          code: fincaCode(finca.id),
                          photoUrl: finca.profile_photo_asset_id ? signedUrls.get(finca.profile_photo_asset_id) ?? null : null,
                          videoUrl: finca.video_asset_id ? signedUrls.get(finca.video_asset_id) ?? null : null,
                          locationLine: `${finca.municipio}, ${finca.departamento} · ${finca.hectares} ha${finca.requires_eudr_polygon ? " · requiere polígono EUDR" : ""}`,
                          daneLine: dane
                            ? `DANE: ${dane.code} · ${dane.mun}, ${dane.dep} (depto ${dane.depCode})`
                            : "DANE: sin coincidencia — verifique municipio/departamento",
                          lotes: fincaLots.map((l): FincaLote => ({
                            id: l.id,
                            name: l.name,
                            stageLabel: STAGE_LABEL[l.stage] ?? l.stage,
                            ...lotStatus(l),
                          })),
                          comms: fincaComms.map((c) => ({ id: c.id, authorRole: c.author_role, createdAt: c.created_at, note: c.note })),
                        }}
                        header={
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                              <span className={styles.badge}>{fincaCode(finca.id)}</span>
                              <span className={styles[short.cls]}>{short.label}</span>
                              <EudrStatusBadge status={status} />
                            </div>
                            <ProducerContactLine producer={producer} />
                          </>
                        }
                        generalActions={
                          <>
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
                              {/* Abandonada (V2.0): solo en Marchitando; la regla dura la
                                  impone el servidor. */}
                              {seg.id === "marchitando" && finca.status === "pending_review" && (
                                <DeleteAbandonedButton
                                  action={deleteAbandonedFinca.bind(null, finca.id)}
                                  label="Eliminar finca (abandonada)"
                                  confirmText={`¿Eliminar la finca "${finca.name}" por abandono?\n\nSe eliminan también sus lotes en borrador. El productor verá un aviso en su feed y puede registrarla de nuevo. Esta acción no se puede deshacer.`}
                                />
                              )}
                              {finca.status === "approved" && (
                                <>
                                  <a className="btn btn-sm" href={`/bcp/fincas/${finca.id}/dossier`} target="_blank" rel="noopener noreferrer">
                                    Ver Visa EUDR (dossier) ↗
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
                          </>
                        }
                        eudrSection={
                          <FincaEudrEditor
                            fincaId={finca.id}
                            fincaName={finca.name}
                            producerId={finca.producer_id}
                            values={finca}
                            legalDocUrl={finca.eudr_legal_docs_asset_id ? signedUrls.get(finca.eudr_legal_docs_asset_id) : undefined}
                            fileUrls={Object.fromEntries(
                              [
                                ...Object.values(finca.eudr_evidence_files ?? {}),
                                ...Object.values(finca.eudr_sustainability_files ?? {}),
                              ]
                                .map((v) => [v.assetId, signedUrls.get(v.assetId)])
                                .filter((e): e is [string, string] => !!e[1])
                            )}
                            producerAnswers={
                              finca.eudr_producer_answers && Object.keys(finca.eudr_producer_answers).length > 0
                                ? (finca.eudr_producer_answers as unknown as ProducerAnswers)
                                : null
                            }
                            saveAction={saveEudr}
                          />
                        }
                        addComm={addComm}
                      />
                    </FincaModalRow>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </FincasViewSwitch>
    </div>
  );
}
