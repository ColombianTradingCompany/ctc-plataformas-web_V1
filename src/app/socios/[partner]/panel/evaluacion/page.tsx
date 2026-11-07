import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { PARTNERS } from "@/lib/partners/partners";
import { requirePartner } from "@/lib/partners/requirePartner";
import { marcaLabel, normalizaDetalle, normalizaRueda } from "@/lib/catacion/rueda";
import { codigoCtc } from "@/components/kaffetal-regal/data";
import { altaPropia, lotesConAlta } from "@/lib/arena/codigoCiego";
import { puntoDeFila, rotuloDelPunto } from "@/lib/arena/punto";
import { BUILD_SHA, VERSION_LABEL } from "@/lib/version";
import { AnularAltaButton, DarDeAltaButton, VerPlanillaButton } from "./PlanillaCentro";
import { planillaDeEvaluacion } from "@/lib/kaffetal/dossierEvaluacion";
import { PestanasDeBaches } from "./PestanasDeBaches";
import { SesionViva } from "../SesionViva";
import styles from "../../socios.module.css";

export const metadata: Metadata = { title: "Evaluación de Lotes · Centro de Calidad", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── Centro de Calidad · Evaluación de Lotes (fase 4 del PLAN_CIRCUITO_DEL_LOTE, V5.81) ─────────
// Folio 7, paso 11: «recibe baches; evalúa lote a lote, anónimos (solo UID), física y sensorialmente con la
// Datasheet Tool, sin "01 Extrínsecos" ni la variedad (sesgo); da de alta cada lote individualmente».
// ESTA PÁGINA NO LEE NOMBRES: ni productor, ni finca, ni variedad, ni ficha. Solo el bache, el código CIEGO de la
// cata (el que va en la bolsa) y los gramos de la muestra que llegaron con el bache. `qa-centro-calidad-check`
// lo vigila. Abre solo con la credencial `centro-calidad` activa y su módulo `evaluacion` encendido (BCP · Socios).
//
// V6.23 (TAR-149): el código que ve el Q-Grader es `arena_inscriptions.codigo_ciego` (QG- + 5 al azar; las inscripciones
// anteriores conservan el que ya llevan impreso), NUNCA el código del lote: el del lote es jerárquico y con prefijos
// compartidos el catador sabría qué muestras son hermanas (de la misma finca o del mismo productor).
//
// V6.24 (TAR-149, punto 4, owner 2026-11-07): el código ciego es FLOTANTE (3 letras + 1 cifra al azar, `src/lib/arena/codigoCiego.ts`;
// siguen valiendo el QG- y el CTC-L- de las bolsas ya impresas) y el catador ve el código REAL del lote (`lots.public_code`) después
// de darle el alta a esa muestra, cuando CTC ya la confirmó o se la devolvió. La compuerta vive AQUÍ, en el servidor: `lotesConAlta`
// dice qué lotes ya tienen un alta de ESTE catador, con el código ciego de hoy y decidida por CTC, y solo de esos se pide el código a
// la base. Antes el código real no se lee, así que no llega al navegador de ninguna forma; un alta en espera se puede anular y lo que
// la reemplace sigue a ciegas. Y el navegador nombra cada muestra solo por su código ciego: ni el id del lote ni el de la
// inscripción viajan (las acciones resuelven la muestra en el servidor). Las muestras salen ordenadas por ese código, que es al azar
// (no por el orden en que se inscribieron), y los gramos y el borrador de cada fila son los de ESTE bache: una re-evaluación no trae
// nada del ciclo anterior.

import { reporteDeFila } from "@/lib/evaluaciones/reporteReglas";
import { separaNotasDevueltas } from "@/lib/evaluaciones/devolucion";
import { urlsDeReportes } from "@/lib/evaluaciones/reporte";

type BatchRow = { id: string; label: string; shipped_at: string | null; q_grader_name: string | null; status: string; cerrado_at: string | null };
type InsRow = { lot_id: string; sondeo_batch_id: string | null; phase: string; codigo_ciego: string | null };
type EvalRow = { id: string; lot_id: string; batch_id: string | null; status: string; sca_total: number | string | null; punto: unknown; cva_total: number | string | null; escala: string; rueda: unknown; rueda_detalle: unknown; created_at: string; reviewed_at: string | null; notes: string | null; submitted_by: string | null; uid_anonimo: string | null; codigo_interno: string | null; reference_asset_id: string | null; reference_file_name: string | null; physical_data: { planilla?: unknown } | null };
// V5.92: el Punto con su procedencia. V5.189: CVA (el protocolo principal) o un SCA 2004 que vale lo mismo.
const rotulo = (e: EvalRow) => {
  const p = puntoDeFila(e);
  return p ? rotuloDelPunto(p) : "—";
};
type MovRow = { batch_id: string | null; kg: number | string; muestras: { lot_id: string } | { lot_id: string }[] | null };

/** V5.161: lo que un alta devuelta trae para reabrir la planilla (las notas del Q-Grader sin el motivo de CTC). */
const semillaDeDevuelta = (e: EvalRow) => ({
  planilla: e.physical_data?.planilla ?? {},
  notas: separaNotasDevueltas(e.notes).notasQGrader || null,
  codigoInterno: e.codigo_interno,
  guardadoEl: `devuelta-${e.reviewed_at ?? e.created_at}`,
  reporte: reporteDeFila(e),
});

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

/** V6.24: la clave de una muestra en esta página: el bache Y el lote. Un lote re-evaluado vuelve al Centro en otro bache con otro
 *  código ciego; lo de su ciclo anterior (kilos, borrador) queda en su bache y no se mezcla con la muestra de hoy. Solo en el servidor. */
const muestraDelBache = (batchId: string | null, lotId: string) => `${batchId ?? "-"}|${lotId}`;

export default async function EvaluacionDeLotesPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (partner !== "centro-calidad") notFound();
  const p = PARTNERS["centro-calidad"];
  const identity = await requirePartner("centro-calidad");
  if (!identity.modulos.evaluacion) redirect("/socios/centro-calidad/panel");

  const service = createServiceRoleClient();
  const { data: batchesRaw } = await service
    .from("sondeo_batches")
    // V5.155: también los cerrados — van a «Baches completados».
    .select("id, label, shipped_at, q_grader_name, status, cerrado_at")
    .in("status", ["en_centro", "cerrado"])
    .eq("centro_calidad_account_id", identity.userId)
    .order("shipped_at", { ascending: true });
  const batches = (batchesRaw as BatchRow[] | null) ?? [];
  const batchIds = batches.map((b) => b.id);

  const [{ data: insRaw }, { data: evalRaw }, { data: movRaw }] = batchIds.length
    ? await Promise.all([
        service.from("arena_inscriptions").select("lot_id, sondeo_batch_id, phase, codigo_ciego").in("sondeo_batch_id", batchIds).order("codigo_ciego"),
        service
          .from("lot_evaluations")
          .select("id, lot_id, batch_id, status, sca_total, punto, cva_total, escala, rueda, rueda_detalle, created_at, reviewed_at, notes, submitted_by, uid_anonimo, codigo_interno, reference_asset_id, reference_file_name, physical_data")
          .in("batch_id", batchIds)
          .eq("source", "q_grader_batch")
          .order("created_at", { ascending: false }),
        service.from("muestra_movimientos").select("batch_id, kg, muestras(lot_id)").in("batch_id", batchIds).eq("motivo", "a_centro"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const inscripciones = (insRaw as InsRow[] | null) ?? [];
  // V5.144: lo que este evaluador dejó a medias («Guardar y terminar más tarde»). Solo los SUYOS.
  // V6.24: por bache Y lote (`muestraDelBache`): el borrador de un ciclo anterior del mismo lote no se abre en la muestra de hoy.
  const { data: borrRaw } = batchIds.length
    ? await service.from("evaluacion_borradores").select("lot_id, batch_id, planilla, notas, codigo_interno, updated_at, reference_asset_id, reference_file_name").eq("account_id", identity.userId).in("batch_id", batchIds)
    : { data: [] };
  const borradores = new Map(
    ((borrRaw as { lot_id: string; batch_id: string | null; planilla: unknown; notas: string | null; codigo_interno: string | null; updated_at: string; reference_asset_id: string | null; reference_file_name: string | null }[] | null) ?? []).map((b) => [
      muestraDelBache(b.batch_id, b.lot_id),
      { planilla: b.planilla, notas: b.notas, codigoInterno: b.codigo_interno, guardadoEl: b.updated_at, reporte: reporteDeFila(b) },
    ])
  );
  const evaluaciones = (evalRaw as EvalRow[] | null) ?? [];
  // V6.24: el código REAL, solo de los lotes con un alta de ESTE catador, con el código ciego de hoy y ya confirmada o devuelta por
  // CTC (`ESTADOS_DE_ALTA`; un alta en espera no cuenta). De ningún otro se lee.
  const conAlta = lotesConAlta(inscripciones, evaluaciones, identity.userId);
  const { data: realesRaw } = conAlta.length ? await service.from("lots").select("id, public_code").in("id", conAlta) : { data: [] };
  const codigoReal = new Map(((realesRaw as { id: string; public_code: string | null }[] | null) ?? []).map((r) => [r.id, r.public_code]));
  // V5.151: el reporte original adjunto a cada alta, con URL firmada para abrirlo.
  const urlDeReporte = await urlsDeReportes(service, evaluaciones.map((e) => e.reference_asset_id));
  // V6.24: los kilos que llegaron con ESTE bache para esa muestra (`muestraDelBache`): una re-evaluación no suma los del ciclo anterior.
  const kgPorMuestra = new Map<string, number>();
  for (const m of (movRaw as MovRow[] | null) ?? []) {
    const lot = (Array.isArray(m.muestras) ? m.muestras[0] : m.muestras)?.lot_id;
    if (lot) kgPorMuestra.set(muestraDelBache(m.batch_id, lot), (kgPorMuestra.get(muestraDelBache(m.batch_id, lot)) ?? 0) + Number(m.kg));
  }

  return (
    <div className={styles.page} style={{ "--p-accent": p.accent } as React.CSSProperties}>
      <div className={styles.stripe} />
      {/* V5.145: mantiene viva la sesión mientras el evaluador trabaja, y avisa si se cerró. */}
      <SesionViva acceso="/socios/centro-calidad/acceso" />
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
              Q-Grader: {identity.contactName || identity.orgName}. Cada lote llega anónimo —solo el código de su muestra— y se da de alta uno a uno.
              CTC confirma el resultado y deriva el grado; cuando CTC confirme o le devuelva el alta, verá también el código del lote.
            </p>
          </div>
        </div>

        {/* V5.155 (owner): dos pestañas —Baches en Fila · Baches completados— y cada bache es un bloque desplegable.
            Un bache está COMPLETADO cuando todos sus lotes fueron dados de alta y CTC los confirmó (ya ninguno sigue en
            sondeo), o cuando CTC lo cerró. */}
        {(() => {
          const lotesDe = (b: BatchRow) => inscripciones.filter((i) => i.sondeo_batch_id === b.id);
          const completado = (b: BatchRow) => b.status === "cerrado" || (lotesDe(b).length > 0 && lotesDe(b).every((l) => l.phase !== "sondeo"));
          const enFila = batches.filter((b) => !completado(b));
          const completados = batches.filter(completado).sort((a, b) => (b.cerrado_at ?? b.shipped_at ?? "").localeCompare(a.cerrado_at ?? a.shipped_at ?? ""));
          const pinta = (lista: BatchRow[], abiertos: boolean) => (
        <div style={{ display: "grid", gap: 14 }}>
          {lista.map((b) => {
            const lotes = lotesDe(b);
            const altas = lotes.filter((l) => l.phase !== "sondeo" || evaluaciones.some((e) => e.lot_id === l.lot_id && e.batch_id === b.id && e.status === "pending")).length;
            return (
              <details key={b.id} className={styles.card} style={{ display: "block" }} open={abiertos}>
                <summary style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", cursor: "pointer", listStyle: "none" }}>
                  <strong style={{ fontSize: 15 }}>{b.label}</strong>
                  <span className={styles.orgLine}>
                    recibido {fecha(b.shipped_at)} · {lotes.length} lote(s) · {completado(b) ? `completado${b.cerrado_at ? ` el ${fecha(b.cerrado_at)}` : ""}` : `${altas} de ${lotes.length} dados de alta`}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className={styles.orgLine} aria-hidden>▾</span>
                </summary>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {lotes.map((l, i) => {
                    // V6.23 (TAR-149): el código CIEGO de la inscripción, el de la bolsa. Nunca el del lote.
                    const uid = codigoCtc(l.codigo_ciego);
                    // V6.24: el código real, solo con un alta de ESTE catador que CTC ya decidió (la misma compuerta que decidió qué leer).
                    const real = altaPropia(l, evaluaciones, identity.userId) ? (codigoReal.get(l.lot_id) ?? null) : null;
                    const propias = evaluaciones.filter((e) => e.lot_id === l.lot_id && e.batch_id === b.id);
                    const pendiente = propias.find((e) => e.status === "pending");
                    const devuelta = !pendiente ? propias.find((e) => e.status === "rejected") : null;
                    const confirmada = propias.find((e) => e.status === "accepted");
                    const kg = kgPorMuestra.get(muestraDelBache(b.id, l.lot_id));
                    const borrador = borradores.get(muestraDelBache(b.id, l.lot_id)) ?? null;
                    // El código interno del laboratorio: el del alta, o el que va en el borrador.
                    const codigoInterno = (pendiente ?? confirmada ?? devuelta)?.codigo_interno ?? borrador?.codigoInterno ?? null;
                    return (
                      <div key={l.codigo_ciego ?? `muestra-${i}`} style={{ borderTop: "1px dashed var(--line)", paddingTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{uid}</span>
                        {real && (
                          <span className={styles.orgLine} title="El código del lote: lo ve cuando CTC confirma o le devuelve el alta de esta muestra">
                            · lote <span className="mono">{codigoCtc(real)}</span>
                          </span>
                        )}
                        <span className={styles.orgLine}>{kg ? `${kg} kg de muestra` : "muestra de evaluación"}</span>
                        {codigoInterno && (
                          <span className={styles.orgLine} title="Su código interno de la muestra">
                            · su código: <span className="mono">{codigoInterno}</span>
                          </span>
                        )}
                        {(() => {
                          const alta = pendiente ?? confirmada ?? devuelta;
                          const rep = reporteDeFila(alta);
                          const url = rep ? urlDeReporte.get(rep.assetId) : null;
                          return rep ? (
                            <span className={styles.orgLine}>
                              · 📎 {url ? <a href={url} target="_blank" rel="noopener noreferrer">{rep.fileName}</a> : rep.fileName}
                            </span>
                          ) : null;
                        })()}
                        <span style={{ flex: 1 }} />
                        {/* V5.192 (owner): lo dado de alta se ABRE, en solo lectura — la confirmada y la que espera a CTC. */}
                        {(() => {
                          const vista = confirmada ?? pendiente;
                          const planilla = vista ? planillaDeEvaluacion(vista) : null;
                          if (!vista || !planilla) return null;
                          const rep = reporteDeFila(vista);
                          return (
                            <VerPlanillaButton
                              uid={uid}
                              planilla={planilla}
                              estado={confirmada ? "confirmada" : "pendiente"}
                              fecha={fecha(vista.created_at)}
                              codigoInterno={vista.codigo_interno}
                              notas={separaNotasDevueltas(vista.notes).notasQGrader || null}
                              reporte={rep ? { nombre: rep.fileName, url: urlDeReporte.get(rep.assetId) ?? null } : null}
                            />
                          );
                        })()}
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
                                Devuelta por CTC{separaNotasDevueltas(devuelta.notes).motivo ? `: ${separaNotasDevueltas(devuelta.notes).motivo}` : ""} — revise su planilla (la encontrará con todo lo que registró) y vuelva a darla de alta.
                              </span>
                            )}
                            {borrador && <span className={styles.orgLine}>Borrador guardado el {fecha(borrador.guardadoEl)}</span>}
                            {/* V5.161 (owner): un alta DEVUELTA se reabre con todo lo que el Q-Grader registró — planilla, notas, código
                                interno y reporte —; nunca con la hoja vacía. Si después guardó un borrador, manda el borrador (es más nuevo).
                                La `key` cambia con lo que siembra la planilla, para que arranque con eso. */}
                            {(() => {
                              const semilla = borrador ?? (devuelta ? semillaDeDevuelta(devuelta) : null);
                              const devoluciones = propias
                                .filter((e) => e.status === "rejected")
                                .sort((a, b) => (b.reviewed_at ?? b.created_at).localeCompare(a.reviewed_at ?? a.created_at))
                                .map((e) => ({ fecha: new Date(e.reviewed_at ?? e.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }), motivo: separaNotasDevueltas(e.notes).motivo ?? "(sin motivo)" }));
                              return <DarDeAltaButton key={semilla?.guardadoEl ?? "nuevo"} muestra={l.codigo_ciego ?? ""} uid={uid} borrador={semilla} devoluciones={devoluciones} />;
                            })()}
                          </>
                        )}
                        {pendiente && Array.isArray(pendiente.rueda) && pendiente.rueda.length > 0 && (
                          <span className={styles.orgLine} style={{ width: "100%" }}>
                            Rueda: {normalizaRueda(pendiente.rueda).map((id, _i, ids) => marcaLabel(id, normalizaDetalle(pendiente.rueda_detalle, ids))).join(" — ")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {lotes.length === 0 && <p className={styles.orgLine}>Este bache no tiene lotes pendientes.</p>}
                </div>
              </details>
            );
          })}
        </div>
          );
          return <PestanasDeBaches enFila={pinta(enFila, true)} completados={pinta(completados, false)} nFila={enFila.length} nCompletados={completados.length} />;
        })()}

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
