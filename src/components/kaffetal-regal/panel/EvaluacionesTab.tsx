"use client";

import { useState } from "react";
import { ctcLotReference, ctcLotReferenceShort, type Lot } from "../data";
import { ARENA_FEE_COP, formatCop, PHASE_LABEL } from "@/lib/arena/inscriptions";
import { NEQUI, PAYMENT_EMAIL, nequiConfigured } from "@/lib/arena/payment";
import { aplicarCodigoCampana, peekCampaignCodeAction, postularLote } from "@/lib/arena/producerActions";
import { openShipmentInstructions } from "../ficha/shipmentInstructionsPrint";
import { useToast } from "@/components/Toast";
import { CtcRef } from "./CtcRef";
import styles from "../AppDashboard.module.css";

// ── Evaluar mi Café (V5.16: trasplante) ─────────────────────────────────────
// En la V5.16 esta pestaña TRASPLANTA los módulos «Kaffetal Regal Arena» y
// «Certificación CTC» de la rejilla retirada, tal cual. La reconstrucción en
// tres secciones (Solicitudes de Evaluación · Evaluaciones en Fila · Lotes
// Galardonados) y el cambio del escritor del grado llegan en la V5.17 — el
// plan por fases del panel V5.16→V5.19.
export function EvaluacionesTab({
  lots,
  onRefreshData,
  onConfirmSampleShipped,
  onVerLotes,
}: {
  lots: Lot[];
  onRefreshData: () => void;
  onConfirmSampleShipped: (lotId: string) => void;
  onVerLotes: () => void;
}) {
  const arenaLots = lots.filter((l) => l.inscription || l.stage === 2);
  const paymentsDue = lots.filter((l) => l.inscription && l.inscription.status === "pendiente" && l.inscription.phase === "postulacion");
  const totalDueCop = paymentsDue.reduce((sum, l) => sum + (l.inscription?.amountDueCop ?? ARENA_FEE_COP), 0);
  const certified = lots.filter((l) => l.stage >= 7);

  return (
    <div className={styles.ag} style={{ marginTop: 14 }}>
      <div className={`${styles.acard} ${styles.wide}`}>
        <span className={styles.k}>Kaffetal Regal Arena · el camino de su lote</span>
        <div className={styles.alist} style={{ marginTop: 6 }}>
          Registrar su finca y armar la ficha no cuesta nada. Cuando CTC declara un lote <b>Apto</b>, usted decide si
          lo <b>postula</b> a la Arena: la inscripción cuesta <b>{formatCop(ARENA_FEE_COP)}</b> por lote y cubre el
          sondeo preliminar, la catación a ciegas ante Q-Graders, el factor de rendimiento, la certificación CTC y el
          feedback del panel — <b>gane o no gane</b>. ¿Tiene un <b>código de campaña</b>? Aplíquelo al postular y verá
          su descuento al instante.
        </div>

        {arenaLots.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 10 }}>
            Aún no tiene lotes aptos. Complete la ficha de un lote y CTC lo evaluará — al ser declarado Apto, podrá
            postularlo desde aquí.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {arenaLots.map((l) => (
              <ArenaLotCard key={l.id} lot={l} onRefreshData={onRefreshData} onConfirmSampleShipped={onConfirmSampleShipped} onVerLotes={onVerLotes} />
            ))}
          </div>
        )}

        {/* Instrucciones de pago. Sin cuenta configurada NO se muestra un
            número a medias: se manda al productor a escribirnos. */}
        {paymentsDue.length > 0 && (
          <div style={{ marginTop: 14, border: "1.5px solid var(--accent)", borderRadius: 10, padding: "14px 16px", background: "var(--card)" }}>
            <span className={styles.k}>Cómo pagar · Nequi</span>
            {nequiConfigured() ? (
              <>
                <div className={styles.alist} style={{ marginTop: 6 }}>
                  Transfiera por <b>Nequi</b> al número <b style={{ fontSize: 16 }}>{NEQUI.number}</b>
                  {NEQUI.holder && <> — a nombre de <b>{NEQUI.holder}</b></>}.
                  <br />
                  Total a pagar hoy: <b>{formatCop(totalDueCop)}</b>
                  {paymentsDue.length > 1 && <> por {paymentsDue.length} lotes</>}.
                </div>
                <ol style={{ margin: "10px 0 0 18px", fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
                  <li>Envíe el valor por Nequi al número de arriba.</li>
                  <li>Escriba en el mensaje del pago su <b>código de inscripción</b> (aparece en cada tarjeta).</li>
                  <li>Mándenos el comprobante a <b>{PAYMENT_EMAIL}</b> o por su hilo de &quot;Mensajes y Notificaciones&quot;.</li>
                  <li>CTC confirma el pago y su lote sigue su camino al sondeo preliminar.</li>
                </ol>
              </>
            ) : (
              <div className={styles.alist} style={{ marginTop: 6 }}>
                Escríbanos a <b>{PAYMENT_EMAIL}</b> y le indicamos cómo pagar su inscripción.
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.acard}>
        <span className={styles.k}>Certificación CTC</span>
        {certified.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 8 }}>Sin certificados todavía. Aparecerán aquí cuando sus lotes sean evaluados.</div>
        ) : (
          <>
            <div className={styles.v} style={{ fontSize: 20 }}>{certified.length} {certified.length === 1 ? "emitido" : "emitidos"}</div>
            <div className={styles.alist}>
              {certified.map((l) => (
                <span key={l.id}>
                  <CtcRef id={l.id} /> · {l.grade ? `Galardonado ${l.grade}` : "Evaluado (sin galardón)"}<br />
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// La tarjeta por lote del tramo pagado: un tracker — Postulación → Código y
// Pago → Muestra (2 kg) → Sondeo → Fila → Sesión → Resultado. Las escrituras
// van por Server Actions (producerActions).
function ArenaLotCard({
  lot,
  onRefreshData,
  onConfirmSampleShipped,
  onVerLotes,
}: {
  lot: Lot;
  onRefreshData: () => void;
  onConfirmSampleShipped: (lotId: string) => void;
  onVerLotes: () => void;
}) {
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [peek, setPeek] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ins = lot.inscription;

  async function revealCode() {
    if (!code.trim()) return;
    const res = await peekCampaignCodeAction(code);
    setPeek(
      res.ok
        ? `Código${res.campaignName ? ` «${res.campaignName}»` : ""} válido — ${res.discountPct}% de descuento · pagaría ${formatCop(res.dueCop)}.`
        : res.message
    );
  }

  async function postular() {
    setBusy(true);
    const res = await postularLote(lot.id, code.trim() || undefined);
    setBusy(false);
    if (res.ok) {
      showToast(`Lote postulado ✓ · código ${res.entryCode}`);
      onRefreshData();
    } else showToast(res.message);
  }

  async function applyCode() {
    if (!code.trim()) return;
    setBusy(true);
    const res = await aplicarCodigoCampana(lot.id, code);
    setBusy(false);
    if (res.ok) {
      showToast(`Código aplicado ✓ · ${res.discountPct}% de descuento`);
      setCode("");
      setPeek(null);
      onRefreshData();
    } else showToast(res.message);
  }

  const cardStyle = { border: "1.5px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--paper)" } as const;
  const settled = ins?.status === "pagado" || ins?.status === "exento";

  return (
    <div style={cardStyle} id={`arena-lot-${lot.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{lot.name}</b>
        <button
          type="button"
          onClick={onVerLotes}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--green)", fontWeight: 700, fontSize: 12.5 }}
        >
          Ver lote en «Mis Lotes» →
        </button>
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--muted)", overflowWrap: "anywhere", margin: "3px 0 2px" }}>
        <CtcRef id={lot.id} />
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Finca: {lot.finca}</div>

      {!ins ? (
        // Apto sin postular: la decisión es del productor.
        <div>
          <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>✓ Apto — listo para postular a la Arena</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <input
              placeholder="¿Código de campaña? (opcional)"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setPeek(null);
              }}
              onBlur={revealCode}
              style={{ maxWidth: 220 }}
            />
            <button className="btn btn-sm btn-solid-accent" disabled={busy} onClick={postular}>
              {busy ? "Postulando…" : "Postular a la Arena"}
            </button>
          </div>
          {peek && <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--muted)" }}>{peek}</div>}
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Inscripción: {formatCop(ARENA_FEE_COP)} — con un código de campaña el descuento se muestra al escribirlo.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px" }}>
              {PHASE_LABEL[ins.phase]}
            </span>
            <span className="mono" style={{ fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px" }}>
              Código: {ins.entryCode ?? "—"}
            </span>
          </div>

          {ins.phase === "postulacion" && (
            <>
              <div style={{ fontSize: 13 }}>
                {settled ? (
                  <span style={{ color: "var(--green)", fontWeight: 700 }}>
                    {ins.status === "exento" ? "✓ Inscripción eximida (100%)." : `✓ Inscripción pagada${ins.discountPct > 0 ? ` (descuento ${ins.discountPct}%)` : ""}.`}
                  </span>
                ) : (
                  <>
                    Pago pendiente: <b>{formatCop(ins.amountDueCop)}</b>
                    {ins.discountPct > 0 && <span style={{ color: "var(--green)", fontWeight: 700 }}> · descuento {ins.discountPct}%</span>}
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}> · referencia: {ins.entryCode}</span>
                  </>
                )}
              </div>
              {/* Con un código de campaña (KRX-) ya aplicado, la caja desaparece:
                  cada lote admite UN código y el descuento ya quedó puesto. */}
              {!settled && !ins.entryCode?.startsWith("KRX-") && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    placeholder="Aplicar código de campaña"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setPeek(null);
                    }}
                    onBlur={revealCode}
                    style={{ maxWidth: 200 }}
                  />
                  <button className="btn btn-sm" disabled={busy || !code.trim()} onClick={applyCode}>
                    Aplicar
                  </button>
                </div>
              )}
              {peek && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{peek}</div>}

              {!lot.sampleShippedAt ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  <button className="btn btn-sm" onClick={() => openShipmentInstructions(ctcLotReference(lot.id), ctcLotReferenceShort(lot.id))}>
                    Instrucciones de envío (2 kg)
                  </button>
                  <button
                    className="btn btn-sm btn-solid-accent"
                    onClick={() => {
                      const ok = window.confirm(
                        `¿Confirma que ya despachó la muestra de 2 kg de pergamino del lote ${lot.name}?\n\n` +
                          "Recuerde: el paquete debe ir marcado ÚNICAMENTE con el código del lote (sin su nombre ni el de su finca — la cata es a ciegas).",
                      );
                      if (ok) onConfirmSampleShipped(lot.id);
                    }}
                  >
                    Confirmar envío de muestra
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Muestra enviada — CTC confirmará el recibo físico.</div>
              )}
            </>
          )}

          {ins.phase === "sondeo" && (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Su muestra viaja en un <b>bache de sondeo preliminar</b> rumbo al laboratorio de calidades. Le contaremos
              el resultado aquí y en su feed.
            </div>
          )}
          {/* 'fila' = SÓLO esperando bache de sondeo (2026-07-21). Aprobado ya no
              vive aquí: pasa a 'arena' (clasificado, esperando sesión). */}
          {ins.phase === "fila" && (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              ✓ Pago y muestra confirmados — <b>en fila</b> para el próximo bache de sondeo preliminar.
            </div>
          )}
          {ins.phase === "arena" && (
            <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>
              ✓ Superó el sondeo{ins.sondeoScore != null ? ` (${ins.sondeoScore})` : ""} — clasificado para la próxima sesión de la Arena.
            </div>
          )}
          {ins.phase === "sesion" && (
            <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>
              ✓ Sesión de Arena confirmada — la fecha está en su feed de Mensajes y Notificaciones.
            </div>
          )}
          {ins.phase === "competido" && (
            <div style={{ fontSize: 13 }}>
              Su lote compitió en la Arena{lot.grade ? <> — Grado <b>{lot.grade}</b></> : ""}. Revise Mis Lotes y Contratos y Compras.
            </div>
          )}
          {ins.phase === "retirado" && (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13 }}>
                Su café no superó el sondeo preliminar esta vez{ins.sondeoScore != null ? ` (${ins.sondeoScore})` : ""}.
              </div>
              {ins.sondeoResultNotes && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Resultado: {ins.sondeoResultNotes}</div>}
              {ins.cashbackStatus && (
                <div style={{ fontSize: 12.5 }}>
                  Reembolso del 80% ({formatCop(ins.cashbackCop ?? 0)}):{" "}
                  <b style={{ color: ins.cashbackStatus === "pagado" ? "var(--green)" : "var(--accent)" }}>
                    {ins.cashbackStatus === "pagado" ? "enviado ✓" : "en camino por Nequi"}
                  </b>
                </div>
              )}
              {ins.mejorasDoc && (
                <details style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px", background: "var(--card)" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Recomendaciones de Mejora</summary>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>{ins.mejorasDoc}</div>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
