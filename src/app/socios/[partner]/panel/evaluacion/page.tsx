import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { PARTNERS } from "@/lib/partners/partners";
import { requirePartner } from "@/lib/partners/requirePartner";
import { descriptorLabel } from "@/lib/catacion/rueda";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { puntoDeFila, rotuloDelPunto } from "@/lib/arena/homologacion";
import { BUILD_SHA, VERSION_LABEL } from "@/lib/version";
import { AnularAltaButton, DarDeAltaButton } from "./PlanillaCentro";
import styles from "../../socios.module.css";

export const metadata: Metadata = { title: "Evaluación de Lotes · Centro de Calidad", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── Centro de Calidad · Evaluación de Lotes (fase 4 del PLAN_CIRCUITO_DEL_LOTE, V5.81) ─────────
// Folio 7, paso 11: «recibe baches; evalúa lote a lote, anónimos (solo UID), física y sensorialmente con la
// Datasheet Tool, sin "01 Extrínsecos" ni la variedad (sesgo); da de alta cada lote individualmente».
// ESTA PÁGINA NO LEE NOMBRES: ni productor, ni finca, ni variedad, ni ficha. Solo el bache, el código corto del
// lote (el que va en la bolsa) y los gramos de la muestra que llegaron con el bache. `qa-centro-calidad-check`
// lo vigila. Abre solo con la credencial `centro-calidad` activa y su módulo `evaluacion` encendido (BCP · Socios).

type BatchRow = { id: string; label: string; shipped_at: string | null; q_grader_name: string | null };
type InsRow = { lot_id: string; sondeo_batch_id: string | null; phase: string };
type EvalRow = { id: string; lot_id: string; batch_id: string | null; status: string; sca_total: number | string | null; punto: unknown; cva_total: number | string | null; escala: string; rueda: unknown; created_at: string; reviewed_at: string | null; notes: string | null; submitted_by: string | null };
// V5.92: nunca un homologado se lee como un SCA catado.
const rotulo = (e: EvalRow) => {
  const p = puntoDeFila(e);
  return p ? rotuloDelPunto(p) : "—";
};
type MovRow = { batch_id: string | null; kg: number | string; muestras: { lot_id: string } | { lot_id: string }[] | null };

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function EvaluacionDeLotesPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (partner !== "centro-calidad") notFound();
  const p = PARTNERS["centro-calidad"];
  const identity = await requirePartner("centro-calidad");
  if (!identity.modulos.evaluacion) redirect("/socios/centro-calidad/panel");

  const service = createServiceRoleClient();
  const { data: batchesRaw } = await service
    .from("sondeo_batches")
    .select("id, label, shipped_at, q_grader_name")
    .eq("status", "en_centro")
    .eq("centro_calidad_account_id", identity.userId)
    .order("shipped_at", { ascending: true });
  const batches = (batchesRaw as BatchRow[] | null) ?? [];
  const batchIds = batches.map((b) => b.id);

  const [{ data: insRaw }, { data: evalRaw }, { data: movRaw }] = batchIds.length
    ? await Promise.all([
        service.from("arena_inscriptions").select("lot_id, sondeo_batch_id, phase").in("sondeo_batch_id", batchIds),
        service
          .from("lot_evaluations")
          .select("id, lot_id, batch_id, status, sca_total, punto, cva_total, escala, rueda, created_at, reviewed_at, notes, submitted_by")
          .in("batch_id", batchIds)
          .eq("source", "q_grader_batch")
          .order("created_at", { ascending: false }),
        service.from("muestra_movimientos").select("batch_id, kg, muestras(lot_id)").in("batch_id", batchIds).eq("motivo", "a_centro"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const inscripciones = (insRaw as InsRow[] | null) ?? [];
  const evaluaciones = (evalRaw as EvalRow[] | null) ?? [];
  const kgPorLote = new Map<string, number>();
  for (const m of (movRaw as MovRow[] | null) ?? []) {
    const lot = (Array.isArray(m.muestras) ? m.muestras[0] : m.muestras)?.lot_id;
    if (lot) kgPorLote.set(lot, (kgPorLote.get(lot) ?? 0) + Number(m.kg));
  }

  return (
    <div className={styles.page} style={{ "--p-accent": p.accent } as React.CSSProperties}>
      <div className={styles.stripe} />
      <div className={styles.wrap}>
        <div className={styles.topbar}>
          <div className={styles.brandline}>
            <Image src={p.logo} alt={p.name} width={44} height={44} />
            <span className={styles.brandName}>
              {p.name}
              <span className={styles.brandSub}>Evaluación de Lotes</span>
            </span>
          </div>
          <Link href="/socios/centro-calidad/panel" className="btn btn-sm">
            ← Mi módulo
          </Link>
        </div>

        <div className={styles.panelHead}>
          <div>
            <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 24, color: "var(--primary-deep)" }}>Baches en el Centro</h1>
            <p className={styles.orgLine}>
              Q-Grader: {identity.contactName || identity.orgName}. Cada lote llega anónimo —solo su código— y se da de alta uno a uno; CTC confirma el
              resultado y deriva el grado.
            </p>
          </div>
        </div>

        {batches.length === 0 && <p className={styles.soon}>Ningún bache en sus manos ahora mismo.</p>}

        <div style={{ display: "grid", gap: 14 }}>
          {batches.map((b) => {
            const lotes = inscripciones.filter((i) => i.sondeo_batch_id === b.id);
            return (
              <div key={b.id} className={styles.card} style={{ display: "block" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{b.label}</strong>
                  <span className={styles.orgLine}>recibido {fecha(b.shipped_at)} · {lotes.length} lote(s)</span>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {lotes.map((l) => {
                    const uid = ctcLotReferenceShort(l.lot_id);
                    const propias = evaluaciones.filter((e) => e.lot_id === l.lot_id && e.batch_id === b.id);
                    const pendiente = propias.find((e) => e.status === "pending");
                    const devuelta = !pendiente ? propias.find((e) => e.status === "rejected") : null;
                    const confirmada = propias.find((e) => e.status === "accepted");
                    const kg = kgPorLote.get(l.lot_id);
                    return (
                      <div key={l.lot_id} style={{ borderTop: "1px dashed var(--line)", paddingTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{uid}</span>
                        <span className={styles.orgLine}>{kg ? `${kg} kg de muestra` : "muestra de evaluación"}</span>
                        <span style={{ flex: 1 }} />
                        {confirmada || l.phase !== "sondeo" ? (
                          <span className={styles.orgLine}>✓ Confirmado por CTC</span>
                        ) : pendiente ? (
                          <>
                            <span className={styles.orgLine}>
                              Dado de alta el {fecha(pendiente.created_at)} · {rotulo(pendiente)} · esperando a CTC
                            </span>
                            <AnularAltaButton evaluationId={pendiente.id} />
                          </>
                        ) : (
                          <>
                            {devuelta && (
                              <span className={styles.err} style={{ margin: 0 }}>
                                Devuelta por CTC{devuelta.notes ? `: ${devuelta.notes}` : ""} — evalúe de nuevo.
                              </span>
                            )}
                            <DarDeAltaButton lotId={l.lot_id} uid={uid} />
                          </>
                        )}
                        {pendiente && Array.isArray(pendiente.rueda) && pendiente.rueda.length > 0 && (
                          <span className={styles.orgLine} style={{ width: "100%" }}>
                            Rueda: {(pendiente.rueda as string[]).map((id) => descriptorLabel(id)).join(" · ")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {lotes.length === 0 && <p className={styles.orgLine}>Este bache no tiene lotes pendientes.</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.foot}>
          <span>Red orquestada · Colombian Trading Company</span>
          <span>
            Soporte: info@ctcexport.com · <span title={`Versión ${VERSION_LABEL} · build ${BUILD_SHA}`}>{VERSION_LABEL}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
