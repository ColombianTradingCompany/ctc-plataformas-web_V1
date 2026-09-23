import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { fincaEudrDeclaracion, fincaEudrStatus } from "@/lib/eudr";
import { segmentFinca } from "@/lib/bcp/producerSegments";
import { fincaEudrFieldsDe, vaciosDeLaDeclaracion } from "@/lib/ocp/fincaEudr";
import { etapaDelLote } from "@/lib/ocp/etapas";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { fincaCode } from "@/components/kaffetal-regal/data";
import { daneCodeFor } from "@/lib/daneCodes";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { approveFinca, rejectFinca, updateFincaEudr, setFincaCertShared, deleteAbandonedFinca } from "../actions";
import { logProducerComm } from "../commActions";
import { ProducerContactLine } from "../ProducerContactLine";
import { ActionForm } from "@/components/panel/ActionForm";
import { DeleteAbandonedButton } from "../DeleteAbandonedButton";
import { FincaEudrEditor, type ProducerAnswers } from "./FincaEudrEditor";
import { FincaPanel, type FincaLote } from "./FincaPanel";
import styles from "@/components/panel/shared.module.css";

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
  // Risk questionnaire (moved onto the finca 2026-07-24).
  eudr_support_doc_type: string | null;
  eudr_custody_stages: string[] | null;
  eudr_custody_method: string | null;
  eudr_custody_notes: string | null;
  eudr_product_risk_factors: string[] | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string | null;
  eudr_mitigation_actions: string | null;
  eudr_mitigation_responsible: string | null;
  eudr_mitigation_effective: boolean | null;
  created_at: string;
};

// El constructor de los campos de la Visa y la lista de vacíos vivían AQUÍ y, copiados, en la página de
// Lotes. Desde la V5.61 son de `src/lib/ocp/fincaEudr.ts`: una fuente para la tabla y las dos secciones.
const toEudrFields = fincaEudrFieldsDe;
const missingChecks = vaciosDeLaDeclaracion;

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

// Estado individual de un lote asociado (pestaña «Lotes asociados»). La ETAPA se rotula en `src/lib/ocp/etapas.ts`.
function lotStatus(l: LotRow): Pick<FincaLote, "statusLabel" | "statusTone"> {
  switch (l.stage) {
    case "borrador":
      return { statusLabel: `Ficha en curso · paso ${l.intake_step}/4`, statusTone: "muted" };
    case "ficha_completa":
      return { statusLabel: "Esperando Visa", statusTone: "warn" };
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

// ── Vista completa · la sección de la FINCA (V5.61) ─────────────────────────
// Era la página del módulo Fincas: un kanban de cinco columnas (Marchitando · Nuevas · En Proceso · Aprobadas ·
// No Aprobadas) con su mapa. La tabla única se llevó el tablero y el mapa; lo que queda aquí es el PANEL
// de una finca, entero y sin modal —`FincaPanel` con sus pestañas, el veredicto de la Visa, el editor EUDR
// con parcelas y certificados, y el hilo con el productor—, leyendo SOLO esa finca.
//
// Ninguna Server Action cambió: aprobar, rechazar, compartir la certificación, guardar la EUDR y eliminar
// por abandono son las de `../actions.ts`, con las mismas reglas duras en el servidor.

export async function FincaSeccion({ service, fincaId }: { service: SupabaseClient; fincaId: string }) {
  const { data: allFincas } = await service
    .from("fincas")
    // A single literal string (not runtime-concatenated) -- see the note on
    // the lots query in ../lotes/page.tsx for why that distinction matters.
    .select(
      `id, name, producer_id, status, vereda, municipio, departamento, hectares, profile_photo_asset_id, video_asset_id,
       requires_eudr_polygon, eudr_polygon_geojson, eudr_lat, eudr_lng,
       eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types,
       eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_legal_docs_asset_id, eudr_legal_docs_filename,
       eudr_sustainability_tags, eudr_sustainability_notes, eudr_google_earth_url, eudr_evidence_files, eudr_sustainability_files, eudr_cert_shared, eudr_producer_answers, eudr_local_infra,
       eudr_support_doc_type, eudr_custody_stages, eudr_custody_method, eudr_custody_notes, eudr_product_risk_factors, eudr_illegality_indicators, eudr_docs_available, eudr_cert_scheme, eudr_mitigation_actions, eudr_mitigation_responsible, eudr_mitigation_effective, created_at`
    )
    .eq("id", fincaId);

  const fincaRows = (allFincas as FincaRow[] | null) ?? [];
  if (!fincaRows.length) return <p className={styles.empty}>Esa finca ya no existe.</p>;
  // Todos los asset ids en un solo lote de firmas: documentos EUDR + la foto y
  // el video de la finca (pestaña General del pop-up).
  const allAssetIds = fincaRows.flatMap((f) => [
    f.eudr_legal_docs_asset_id,
    f.profile_photo_asset_id,
    f.video_asset_id,
    ...Object.values(f.eudr_evidence_files ?? {}).map((v) => v.assetId),
    ...Object.values(f.eudr_sustainability_files ?? {}).map((v) => v.assetId),
  ]);
  const [signedUrls, producers, { data: comms }, { data: lotsRaw }, { data: parcelasRaw }, { data: certsRaw }] = await Promise.all([
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
    // F1 (2026-07-29): parcelas y certificados de finca — ver EUDR_RESTRUCTURE_PLAN.md.
    service
      .from("finca_parcelas")
      .select("id, finca_id, name, area_ha, lat, lng, polygon_geojson, position")
      .in("finca_id", fincaRows.map((f) => f.id))
      .order("position", { ascending: true }),
    service
      .from("finca_certificates")
      .select("id, finca_id, scheme, cert_number, valid_from, valid_to, holder_note, support_asset_id, support_filename, verified_by_ctc")
      .in("finca_id", fincaRows.map((f) => f.id))
      .order("created_at", { ascending: true }),
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
  type BcpParcelaRow = { id: string; finca_id: string; name: string; area_ha: number | string | null; lat: number | string | null; lng: number | string | null; polygon_geojson: { lat: number; lng: number }[] | null; position: number };
  type BcpCertRow = { id: string; finca_id: string; scheme: string; cert_number: string | null; valid_from: string | null; valid_to: string | null; holder_note: string | null; support_asset_id: string | null; support_filename: string | null; verified_by_ctc: boolean };
  const parcelasByFinca = new Map<string, BcpParcelaRow[]>();
  for (const p of (parcelasRaw as BcpParcelaRow[] | null) ?? []) {
    parcelasByFinca.set(p.finca_id, [...(parcelasByFinca.get(p.finca_id) ?? []), p]);
  }
  const certsByFinca = new Map<string, BcpCertRow[]>();
  for (const c of (certsRaw as BcpCertRow[] | null) ?? []) {
    certsByFinca.set(c.finca_id, [...(certsByFinca.get(c.finca_id) ?? []), c]);
  }
  // Los soportes de certificado se firman en un segundo lote: su query corre en
  // paralelo al primer lote de firmas, así que sus asset ids no estaban a mano.
  const certUrls = await signedKaffetalMediaUrls(
    service,
    ((certsRaw as BcpCertRow[] | null) ?? []).map((c) => c.support_asset_id)
  );

  const finca = fincaRows[0];
  // «Marchitando» (pendiente hace más de 7 días con la EUDR incompleta) es lo que habilita eliminarla por
  // abandono; la regla dura la re-impone el servidor.
  const seg = {
    id: segmentFinca({
      status: finca.status,
      createdAt: finca.created_at,
      eudrComplete: missingChecks(toEudrFields(finca)).length === 0,
    }),
  };
  const eudrFields = toEudrFields(finca);
                  const status = fincaEudrStatus(eudrFields);
                  const gaps = missingChecks(eudrFields);
                  const blockedByPolygon = !!(finca.requires_eudr_polygon && !finca.eudr_polygon_geojson?.length);
                  // Solo se aprueba una finca EUDR "Apta" (completa) — ver el
                  // caso de La Ceiba en el historial de este archivo. Lo que se
                  // exige es la DECLARACIÓN completa, no la Visa: desde
                  // 2026-08-20 `status` ya incorpora el veredicto de CTC, y
                  // mirarlo aquí dejaría el botón Aprobar apagado para siempre
                  // (haría falta estar aprobada para poder aprobarla).
                  const blockedByEudr = fincaEudrDeclaracion(eudrFields).code !== "apta" || blockedByPolygon;
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

                  return (
                    <div>
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
                            stageLabel: etapaDelLote(l.stage),
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
                                  <a className="btn btn-sm" href={`/ocp/kr/${finca.id}/dossier`} target="_blank" rel="noopener noreferrer">
                                    Ver Pasaporte EUDR (dossier) ↗
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
                            parcelas={(parcelasByFinca.get(finca.id) ?? []).map((p) => ({
                              id: p.id,
                              name: p.name,
                              areaHa: p.area_ha != null ? String(p.area_ha) : "",
                              lat: p.lat != null ? String(p.lat) : "",
                              lng: p.lng != null ? String(p.lng) : "",
                              polygonPoints: p.polygon_geojson?.length ?? 0,
                              polygon: p.polygon_geojson ?? null,
                              position: p.position,
                            }))}
                            certificates={(certsByFinca.get(finca.id) ?? []).map((c) => ({
                              id: c.id,
                              scheme: c.scheme,
                              certNumber: c.cert_number ?? "",
                              validFrom: c.valid_from ?? "",
                              validTo: c.valid_to ?? "",
                              holderNote: c.holder_note ?? "",
                              supportUrl: c.support_asset_id ? certUrls.get(c.support_asset_id) ?? null : null,
                              supportFilename: c.support_filename,
                              verifiedByCtc: c.verified_by_ctc,
                            }))}
                          />
                        }
                        addComm={addComm}
                      />
                      <p className={styles.meta} style={{ marginTop: 16 }}>
                        Productor: <Link href={`/ocp/kr?productor=${finca.producer_id}`}>{producer?.fullName || "abrir"}</Link>
                        {fincaLots.length > 0 && (
                          <>
                            {" "}· Lotes:{" "}
                            {fincaLots.map((l, i) => (
                              <span key={l.id}>
                                {i > 0 && ", "}
                                <Link href={`/ocp/kr?lote=${l.id}`}>{l.name}</Link>
                              </span>
                            ))}
                          </>
                        )}
                      </p>
                    </div>
                  );
}
