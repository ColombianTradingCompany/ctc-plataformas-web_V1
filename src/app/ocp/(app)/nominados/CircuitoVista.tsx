import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { formatCop, MAX_BATCH_LOTS, type ArenaInscription } from "@/lib/arena/inscriptions";
import { toLabEvaluationList } from "@/lib/arena/labEvaluation";
import { segmentPostulacion } from "@/lib/bcp/producerSegments";
import { NEQUI, PAYMENT_EMAIL } from "@/lib/arena/payment";
import type { FacturaData } from "@/lib/arena/factura";
import { TIPO_LABEL, type TipoDeMuestra } from "@/lib/muestras/particion";
import { descriptorLabel } from "@/lib/catacion/rueda";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { centrosConEvaluacion, createSondeoBatch } from "../nominadosActions";
import {
  BatchPicker,
  CashbackControls,
  CerrarBacheButton,
  ConfirmarCentroControls,
  DeleteBatchButton,
  EmitirFacturaButton,
  EnviarAlCentroForm,
  PaymentControls,
  ReciboForm,
  ReevaluarForm,
  RegenerateMejorasButton,
  RemoveFromBatchButton,
  SondeoRegistroControls,
  SubvencionForm,
  VerFacturaButton,
} from "./NominadosClient";
import styles from "@/components/panel/shared.module.css";

// ── Las tres primeras entradas del circuito del lote (V5.63 → V5.80) ────────
// Este archivo era la página de «Nominados» (2026-07-20). El cuadro del owner (2026-09-19) lo partió en dos
// entradas del rail y su folio 7 (2026-09-24, fase 3 del PLAN_CIRCUITO_DEL_LOTE) lo dejó en TRES:
//
//   «Solicitudes de Evaluación»  pasos 7–9 — el productor pidió la evaluación (y quizá un descuento por nota);
//                                CTCx decide la subvención, emite la factura de cobro, confirma el pago y recibe
//                                la muestra (2 kg contra entrega). Recién llegadas / Embotelladas (>5 días).
//   «Lotes a Evaluar»            paso 10 — «recibe café Y pago». Aquí se arman los Baches de Evaluación (≤30) y
//                                se mandan al Centro de Calidad.
//   «Lotes en Evaluación»        los baches en manos del Centro. Hasta la fase 4 (el módulo del socio) el
//                                veredicto del Q-Grader lo registra CTCx aquí; el que no supera sale con reembolso.
//
// Es UNA carga y UN componente con tres vistas, no tres páginas copiadas: todas leen las mismas solicitudes,
// y un lote pasa de una a otra en cuanto se confirma lo que faltaba.

export type VistaDelCircuito = "solicitudes" | "a-evaluar" | "en-evaluacion";

type LotJoin = { id: string; name: string; producer_id: string; stage: string; source: string; sample_shipped_at: string | null; sample_2kg_confirmed_at: string | null };
type BatchRow = {
  id: string;
  label: string;
  status: string;
  q_grader_name: string | null;
  shipped_at: string | null;
  cerrado_at: string | null;
  created_at: string;
  centro_calidad_account_id: string | null;
};
type MuestraRow = { id: string; lot_id: string; tipo: TipoDeMuestra; kg: number; ubicacion: string | null };
type AltaRow = { id: string; lot_id: string; batch_id: string | null; status: string; sca_total: number | string | null; escala: string; rueda: unknown; q_grader_reference: string | null; notes: string | null; created_at: string };

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export async function CircuitoVista({ vista }: { vista: VistaDelCircuito }) {
  const service = createServiceRoleClient();

  const [{ data: insRaw }, { data: batchesRaw }, { data: campaignsRaw }, { data: centrosRaw }] = await Promise.all([
    service
      .from("arena_inscriptions")
      .select("*, lots(id, name, producer_id, stage, source, sample_shipped_at, sample_2kg_confirmed_at)")
      // Los galardonados solo se cargan por sus reembolsos pendientes (re-evaluación que subió de grado, V5.82).
      .in("phase", ["postulacion", "sondeo", "fila", "retirado", "galardonado"]),
    service
      .from("sondeo_batches")
      .select("id, label, status, q_grader_name, shipped_at, cerrado_at, created_at, centro_calidad_account_id")
      .order("created_at", { ascending: false }),
    service.from("club_campaigns").select("id, name, discount_pct").order("name"),
    service.from("partner_accounts").select("profile_id, org_name").eq("node_type", "centro-calidad"),
  ]);

  const inscriptions = ((insRaw as (ArenaInscription & { lots: LotJoin | LotJoin[] | null })[] | null) ?? []).map((i) => ({
    ...i,
    lot: (Array.isArray(i.lots) ? i.lots[0] : i.lots) as LotJoin | null,
  }));
  const batches = (batchesRaw as BatchRow[] | null) ?? [];
  const campaigns = ((campaignsRaw as { id: string; name: string; discount_pct: number }[] | null) ?? []).map((c) => ({ id: c.id, name: c.name, pct: c.discount_pct }));
  const nombreDelCentro = new Map(((centrosRaw as { profile_id: string; org_name: string }[] | null) ?? []).map((c) => [c.profile_id, c.org_name]));

  const solicitadas = inscriptions.filter((i) => i.phase === "postulacion" && i.lot);
  const embotelladas = solicitadas.filter((i) => segmentPostulacion({ postulatedAt: i.postulated_at }) === "embotellados");
  const recien = solicitadas.filter((i) => segmentPostulacion({ postulatedAt: i.postulated_at }) === "recien");
  const aEvaluar = inscriptions.filter((i) => i.phase === "fila" && i.lot);
  const enBache = inscriptions.filter((i) => i.phase === "sondeo" && i.lot);
  // V5.82: los que no superaron (rechazo gratis con reporte; CTCx puede acordar la re-evaluación) y los reembolsos del 80 %
  // pendientes de una re-evaluación que subió de grado.
  const noSuperaron = inscriptions.filter((i) => i.phase === "retirado" && i.sondeo_result === "rechazado" && i.lot);
  const reembolsosPend = inscriptions.filter((i) => i.cashback_status === "pendiente" && i.lot);

  const [producers, { data: muestrasRaw }, centros, { data: altasRaw }, { data: bodegasRaw }] = await Promise.all([
    fetchProducerContacts(service, inscriptions.map((i) => i.producer_id)),
    service
      .from("muestras")
      .select("id, lot_id, tipo, kg, ubicacion")
      .in("lot_id", [...aEvaluar, ...enBache, ...solicitadas].map((i) => i.lot_id)),
    centrosConEvaluacion(service),
    // V5.81: las altas del Centro de Calidad (pendientes o devueltas) de los lotes en bache.
    service
      .from("lot_evaluations")
      .select("id, lot_id, batch_id, status, sca_total, escala, rueda, q_grader_reference, notes, created_at")
      .eq("source", "q_grader_batch")
      .in("status", ["pending", "rejected"])
      .in("lot_id", enBache.map((i) => i.lot_id))
      .order("created_at", { ascending: false }),
    // V5.89: las bodegas de muestras activas, para que el recibo diga en cuál queda.
    service.from("bodegas_muestras").select("id, nombre").eq("estado", "activa").order("nombre"),
  ]);
  const bodegas = (bodegasRaw as { id: string; nombre: string }[] | null) ?? [];
  const altasPorLote = new Map<string, AltaRow[]>();
  for (const a of (altasRaw as AltaRow[] | null) ?? []) altasPorLote.set(a.lot_id, [...(altasPorLote.get(a.lot_id) ?? []), a]);
  const centrosParaElegir = centros.map((c) => ({ id: c.profile_id, nombre: c.org_name, qGrader: c.contact_name?.trim() || c.org_name }));
  const name = (producerId: string) => producers.get(producerId)?.fullName ?? "Productor";
  const muestrasPorLote = new Map<string, MuestraRow[]>();
  for (const m of (muestrasRaw as MuestraRow[] | null) ?? []) muestrasPorLote.set(m.lot_id, [...(muestrasPorLote.get(m.lot_id) ?? []), m]);
  const muestraLinea = (lotId: string) => {
    const ms = muestrasPorLote.get(lotId) ?? [];
    if (!ms.length) return null;
    const total = ms.reduce((s, m) => s + Number(m.kg), 0);
    const ubic = ms.find((m) => m.ubicacion)?.ubicacion;
    return `${total} kg (${ms.map((m) => `${TIPO_LABEL[m.tipo]} ${Number(m.kg)}`).join(" · ")})${ubic ? ` · en ${ubic}` : ""}`;
  };

  const facturaDe = (i: (typeof solicitadas)[number]): FacturaData | null =>
    i.factura_ref && i.factura_emitida_at
      ? {
          ref: i.factura_ref,
          emitidaAt: i.factura_emitida_at,
          productor: name(i.producer_id),
          lote: i.lot!.name,
          codigoLote: ctcLotReferenceShort(i.lot_id),
          tarifaCop: i.amount_cop,
          subvencionPct: i.discount_pct,
          subvencionNombre: campaigns.find((c) => c.id === i.subvencion_id)?.name ?? null,
          totalCop: i.amount_due_cop,
          contraEntrega: i.pago_contra_entrega,
          carril: { nequiNumber: NEQUI.number, nequiHolder: NEQUI.holder, email: PAYMENT_EMAIL },
        }
      : null;

  // ── La tarjeta de una solicitud: subvención → factura → pago → recibo ──
  const solicitudCard = (i: (typeof solicitadas)[number]) => {
    const pendiente = i.status === "pendiente";
    const factura = facturaDe(i);
    const recibida = Boolean(i.lot!.sample_2kg_confirmed_at);
    const subvencion = campaigns.find((c) => c.id === i.subvencion_id);
    return (
      <div key={i.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
        <b>{i.lot!.name}</b>
        <p className={styles.meta}>
          {name(i.producer_id)} · <span className="mono">{ctcLotReferenceShort(i.lot_id)}</span> · código <span className="mono">{i.entry_code ?? "—"}</span>
          {` · solicitada ${fecha(i.postulated_at)}`}
        </p>
        {i.nota_solicitud && (
          <p style={{ margin: "2px 0 6px", padding: "6px 10px", borderLeft: "3px solid var(--accent)", background: "var(--paper)", fontSize: 12.5 }}>
            <b>Pide descuento:</b> «{i.nota_solicitud}»
          </p>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className={`${styles.badge} ${i.discount_pct > 0 ? styles.badgeGood : ""}`}>
            {i.discount_pct > 0 ? `Subvención ${i.discount_pct} %${subvencion ? ` · ${subvencion.name}` : ""}` : "Sin subvención"}
          </span>
          <span className={`${styles.badge} ${factura ? styles.badgeGood : styles.badgeWarn}`}>{factura ? `Factura ${factura.ref}` : "Sin factura"}</span>
          <span className={`${styles.badge} ${!pendiente ? styles.badgeGood : styles.badgeWarn}`}>
            {!pendiente ? `Pago ✓ (${i.status})` : `Pago pendiente · ${formatCop(i.amount_due_cop)}`}
          </span>
          <span className={`${styles.badge} ${recibida ? styles.badgeGood : styles.badgeWarn}`}>
            {recibida ? "Muestra ✓" : i.lot!.sample_shipped_at ? "Muestra enviada" : "Muestra sin enviar"}
          </span>
        </div>

        {pendiente && (
          <div style={{ marginTop: 8 }}>
            <p className={styles.meta} style={{ margin: "0 0 4px" }}>1 · Subvención (la decide CTCx; 30–70 % de la tarifa)</p>
            <SubvencionForm lotId={i.lot_id} campaigns={campaigns} actualId={i.subvencion_id} />
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <p className={styles.meta} style={{ margin: 0 }}>2 · Factura de cobro</p>
          {factura ? (
            <>
              <VerFacturaButton factura={factura} />
              <span className={styles.meta}>emitida el {fecha(factura.emitidaAt)} · {formatCop(factura.totalCop)}{i.pago_contra_entrega ? " · muestra contra entrega" : ""}</span>
            </>
          ) : pendiente ? (
            <EmitirFacturaButton lotId={i.lot_id} />
          ) : (
            <span className={styles.meta}>sin factura (costo asumido por CTCx)</span>
          )}
        </div>
        <p className={styles.meta} style={{ margin: "8px 0 0" }}>3 · Pago</p>
        <PaymentControls lotId={i.lot_id} status={i.status} entryCode={i.entry_code} dueLabel={formatCop(i.amount_due_cop)} facturaEmitida={Boolean(i.factura_ref)} />
        <p className={styles.meta} style={{ margin: "8px 0 0" }}>4 · Muestra</p>
        {recibida ? (
          <p className={styles.meta} style={{ margin: "4px 0 0" }}>Recibida el {fecha(i.lot!.sample_2kg_confirmed_at)}{muestraLinea(i.lot_id) ? ` · ${muestraLinea(i.lot_id)}` : ""}</p>
        ) : (
          <ReciboForm lotId={i.lot_id} shipped={Boolean(i.lot!.sample_shipped_at) || i.lot!.source === "bcp_manual_entry"} bodegas={bodegas} />
        )}
      </div>
    );
  };

  // ── Los baches ──
  const byBatch = new Map<string, typeof enBache>();
  for (const i of enBache) {
    if (!i.sondeo_batch_id) continue;
    byBatch.set(i.sondeo_batch_id, [...(byBatch.get(i.sondeo_batch_id) ?? []), i]);
  }
  const batchLots = (b: BatchRow) => byBatch.get(b.id) ?? [];
  const candidatos = aEvaluar.filter((i) => !i.sondeo_result).map((i) => ({ lotId: i.lot_id, name: i.lot!.name, producer: name(i.producer_id) }));

  const board = (columns: { label: string; count: number; body: React.ReactNode }[]) => (
    <div className={styles.board}>
      {columns.map((col) => (
        <div className={styles.column} key={col.label}>
          <div className={styles.columnHead}>
            <h3>{col.label}</h3>
            <span className={styles.columnCount}>{col.count}</span>
          </div>
          <div className={styles.columnList}>{col.count ? col.body : <p className={styles.empty}>—</p>}</div>
        </div>
      ))}
    </div>
  );

  if (vista === "solicitudes") {
    return (
      <div>
        <h1 className={styles.title}>Solicitudes de Evaluación</h1>
        <p className={styles.subtitle}>
          El productor pidió la evaluación de su lote (y quizá un descuento, por nota). Aquí CTCx la <b>corrobora</b>: decide la
          subvención, emite la <b>factura de cobro</b>, confirma el <b>pago</b> y recibe la <b>muestra</b> de 2 kg (viaja contra
          entrega). Con el pago y la muestra confirmados el lote pasa solo a <Link href="/ocp/a-evaluar">Lotes a Evaluar</Link>.{" "}
          <b>Embotelladas</b> lleva más de 5 días esperando.
        </p>
        {board([
          { label: "Recién llegadas", count: recien.length, body: recien.map(solicitudCard) },
          { label: "Embotelladas", count: embotelladas.length, body: embotelladas.map(solicitudCard) },
        ])}
        {aEvaluar.length + enBache.length > 0 && (
          <p className={styles.meta} style={{ marginTop: 16 }}>
            {aEvaluar.length} lote(s) ya pagados y recibidos en <Link href="/ocp/a-evaluar">Lotes a Evaluar</Link>
            {enBache.length > 0 && <> · {enBache.length} en <Link href="/ocp/en-evaluacion">Lotes en Evaluación</Link></>}.
          </p>
        )}
      </div>
    );
  }

  if (vista === "a-evaluar") {
    const abiertos = batches.filter((b) => b.status === "abierto");
    return (
      <div>
        <h1 className={styles.title}>Lotes a Evaluar</h1>
        <p className={styles.subtitle}>
          Pagados y con la muestra en la casa (folio 7, paso 10). Súbalos a un <b>Bache de Evaluación</b> (≤{MAX_BATCH_LOTS} lotes) y
          mándelo al <b>Centro de Calidad</b>; desde ese momento viven en <Link href="/ocp/en-evaluacion">Lotes en Evaluación</Link>.
        </p>
        {board([
          {
            label: "A evaluar (sin bache)",
            count: aEvaluar.length,
            body: aEvaluar.map((i) => (
              <div key={i.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <b>{i.lot!.name}</b>
                <p className={styles.meta}>
                  {name(i.producer_id)} · <span className="mono">{ctcLotReferenceShort(i.lot_id)}</span> · pago {i.status} · recibida {fecha(i.lot!.sample_2kg_confirmed_at)}
                </p>
                {muestraLinea(i.lot_id) && <p className={styles.meta}>Muestra: {muestraLinea(i.lot_id)}</p>}
              </div>
            )),
          },
        ])}

        <div style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 17, marginBottom: 6 }}>Baches de Evaluación</h2>
          <p className={styles.subtitle}>
            Un bache abierto se arma con lotes de arriba y se envía al Centro de Calidad con el nombre del Q-Grader que lo evaluará.
          </p>
          <form
            action={async (formData: FormData) => {
              "use server";
              await createSondeoBatch(formData);
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 14 }}
          >
            <div className={styles.field} style={{ margin: 0 }}>
              <label htmlFor="label">Nuevo bache</label>
              <input id="label" name="label" placeholder="Bache octubre 2026" required />
            </div>
            <button className="btn btn-sm btn-solid" type="submit">
              Crear bache
            </button>
          </form>

          {abiertos.length === 0 && <p className={styles.empty}>Ningún bache abierto.</p>}
          <div style={{ display: "grid", gap: 12 }}>
            {abiertos.map((b) => (
              <div key={b.id} className={styles.miniCard}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 14 }}>{b.label}</b>
                  <span className={styles.badge}>{batchLots(b).length}/{MAX_BATCH_LOTS}</span>
                  <span className={styles.meta}>creado {fecha(b.created_at)}</span>
                  <DeleteBatchButton batchId={b.id} label={b.label} lotCount={batchLots(b).length} />
                </div>
                {batchLots(b).length > 0 && (
                  <div style={{ display: "grid", gap: 4, margin: "8px 0" }}>
                    {batchLots(b).map((i) => (
                      <p key={i.id} className={styles.meta} style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ flex: 1 }}>
                          {i.lot!.name} · {name(i.producer_id)} · <span className="mono">{ctcLotReferenceShort(i.lot_id)}</span>
                        </span>
                        <RemoveFromBatchButton lotId={i.lot_id} />
                      </p>
                    ))}
                  </div>
                )}
                <BatchPicker batchId={b.id} candidates={candidatos} slotsLeft={MAX_BATCH_LOTS - batchLots(b).length} />
                <div style={{ marginTop: 10 }}>
                  <EnviarAlCentroForm batchId={b.id} lotCount={batchLots(b).length} centros={centrosParaElegir} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Lotes en Evaluación ──
  const enCentro = batches.filter((b) => b.status === "en_centro");
  const cerrados = batches.filter((b) => b.status === "cerrado");
  return (
    <div>
      <h1 className={styles.title}>Lotes en Evaluación</h1>
      <p className={styles.subtitle}>
        Los baches en manos del <b>Centro de Calidad</b>: cada lote se evalúa anónimo (solo su código), física y sensorialmente.
        Hasta que el Centro tenga su módulo (fase 4), CTCx registra aquí las planillas y el veredicto del Q-Grader. Los soportes y
        el escáner están en <Link href="/ocp/fichas">Fichas Técnicas</Link>. Con el veredicto, el lote pasa a{" "}
        <Link href="/ocp/ofertas">Pendiente de Oferta</Link>; el que no supera sale con reembolso del 80 %.
      </p>

      {enCentro.length === 0 && <p className={styles.empty}>Ningún bache en el Centro de Calidad.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {enCentro.map((b) => (
          <div key={b.id} className={styles.miniCard}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{b.label}</b>
              <span className={styles.badge}>{batchLots(b).length} sin veredicto</span>
              <span className={styles.meta}>
                Q-Grader {b.q_grader_name ?? "—"} · {b.centro_calidad_account_id ? (nombreDelCentro.get(b.centro_calidad_account_id) ?? "Centro de Calidad") : "Centro de Calidad"} · enviado {fecha(b.shipped_at)}
              </span>
              <CerrarBacheButton batchId={b.id} pendientes={batchLots(b).length} />
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {batchLots(b).map((i) => {
                const altas = (altasPorLote.get(i.lot_id) ?? []).filter((a) => a.batch_id === b.id);
                const pendiente = altas.find((a) => a.status === "pending");
                const devuelta = !pendiente ? altas.find((a) => a.status === "rejected") : null;
                return (
                  <div key={i.id} style={{ borderTop: "1px dashed var(--line)", paddingTop: 6 }}>
                    <p className={styles.meta} style={{ margin: 0 }}>
                      <b style={{ color: "var(--ink)" }}>{i.lot!.name}</b> · {name(i.producer_id)} ·{" "}
                      <span className="mono">{ctcLotReferenceShort(i.lot_id)}</span>
                    </p>
                    {pendiente ? (
                      // V5.81: el Q-Grader ya lo dio de alta — CTCx confirma o devuelve; no teclea otra planilla.
                      <>
                        <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                          <span className={`${styles.badge} ${styles.badgeWarn}`}>Alta del Centro pendiente</span> {pendiente.escala.toUpperCase()}{" "}
                          <b>{pendiente.sca_total != null ? Number(pendiente.sca_total).toFixed(2) : "—"}</b> · {pendiente.q_grader_reference ?? "—"} · {fecha(pendiente.created_at)}
                        </p>
                        <ConfirmarCentroControls
                          lotId={i.lot_id}
                          lotName={i.lot!.name}
                          alta={{
                            id: pendiente.id,
                            escala: pendiente.escala,
                            puntaje: pendiente.sca_total != null ? Number(pendiente.sca_total) : null,
                            qGrader: pendiente.q_grader_reference,
                            fecha: fecha(pendiente.created_at),
                            rueda: Array.isArray(pendiente.rueda) ? (pendiente.rueda as string[]).map((id) => descriptorLabel(id)) : [],
                            notas: pendiente.notes,
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {devuelta && (
                          <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                            <span className={`${styles.badge} ${styles.badgeBad}`}>Alta devuelta al Centro</span> {devuelta.notes ?? ""}
                          </p>
                        )}
                        <p className={styles.meta} style={{ margin: "4px 0 0" }}>Esperando el alta del Q-Grader en el Centro de Calidad.</p>
                        <details>
                          <summary className={styles.meta} style={{ cursor: "pointer" }}>Registrar a mano (sin el Centro)…</summary>
                          <SondeoRegistroControls
                            lotId={i.lot_id}
                            lotName={i.lot!.name}
                            evaluations={toLabEvaluationList(i.sondeo_evaluation)}
                            resultFilename={i.sondeo_result_filename ?? null}
                            qGraderName={b.q_grader_name ?? ""}
                          />
                        </details>
                      </>
                    )}
                  </div>
                );
              })}
              {!batchLots(b).length && <p className={styles.meta}>Todos los lotes de este bache ya tienen veredicto — puede cerrarlo.</p>}
            </div>
          </div>
        ))}
      </div>

      {cerrados.length > 0 && (
        <details style={{ marginTop: 20 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Baches cerrados ({cerrados.length})</summary>
          <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
            {cerrados.map((b) => (
              <p key={b.id} className={styles.meta} style={{ margin: 0 }}>
                <b>{b.label}</b> · Q-Grader {b.q_grader_name ?? "—"} · enviado {fecha(b.shipped_at)} · cerrado {fecha(b.cerrado_at)}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* No superaron: el reporte de mejoras (gratis) y la re-evaluación que CTCx acuerda */}
      {noSuperaron.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 17, marginBottom: 6 }}>No superaron la evaluación</h2>
          <p className={styles.subtitle}>
            El rechazo bajo Black es gratis y se lleva el reporte de mejoras. Si CTCx ve que la mejora aseguraría una oferta, acuerda la
            <b> re-evaluación a tarifa plena</b>: la solicitud vuelve a empezar y, si el lote sube de grado, se le reembolsa el 80 %.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {noSuperaron.map((i) => (
              <div key={i.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <b>{i.lot!.name}</b>
                <p className={styles.meta}>
                  {name(i.producer_id)} · puntaje {i.sondeo_score ?? "—"}{i.reevaluaciones ? ` · re-evaluación n.º ${i.reevaluaciones}` : ""}
                  {i.sondeo_result_notes && <> · «{i.sondeo_result_notes}»</>}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <RegenerateMejorasButton lotId={i.lot_id} has={Boolean(i.mejoras_doc)} />
                  <ReevaluarForm lotId={i.lot_id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reembolsos pendientes: 80 % de la tarifa cuando la re-evaluación subió de grado */}
      {reembolsosPend.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: 17, marginBottom: 6 }}>Reembolsos pendientes (re-evaluación que subió de grado)</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {reembolsosPend.map((i) => (
              <div key={i.id} className={styles.card}>
                <b>{i.lot!.name}</b>
                <p className={styles.meta}>
                  {name(i.producer_id)} · 80% de {formatCop(i.amount_due_cop)} = <b>{formatCop(i.cashback_cop ?? 0)}</b>
                </p>
                <CashbackControls lotId={i.lot_id} amountLabel={formatCop(i.cashback_cop ?? 0)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
