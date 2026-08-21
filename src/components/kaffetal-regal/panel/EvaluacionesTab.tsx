"use client";

import { useState } from "react";
import Image from "next/image";
import { GRADES, ctcLotReference, ctcLotReferenceShort, type Finca, type Lot } from "../data";
import { lotEudrStatus } from "@/lib/eudr";
import { EVALUATION_FEE_COP, formatCop } from "@/lib/arena/inscriptions";
import { NEQUI, PAYMENT_EMAIL, nequiConfigured } from "@/lib/arena/payment";
import { aplicarCodigoCampana, peekCampaignCodeAction, postularLote } from "@/lib/arena/producerActions";
import { openShipmentInstructions } from "../ficha/shipmentInstructionsPrint";
import { useToast } from "@/components/Toast";
import { CtcRef } from "./CtcRef";
import styles from "../AppDashboard.module.css";

// ── Evaluar mi Café (V5.17: las tres secciones) ─────────────────────────────
// El camino del lote después del EVA verde, en el orden en que lo vive el
// productor (mockups del owner, 2026-08-21):
//   1. SOLICITUDES DE EVALUACIÓN — lotes Aptos: solicitar, pagar y despachar
//      la muestra de 2 kg (MUE).
//   2. EVALUACIONES EN FILA — muestra recibida y pago confirmado: el lote
//      espera su bache y al Q-Grader (SON / la fila).
//   3. LOTES GALARDONADOS — evaluación completada: el Grado CTC (derivado del
//      puntaje — «el puntaje manda»), los documentos y el feedback.
// La Arena ya NO es parte de este camino: quedó como vitrina post-galardón
// (se re-gatea en V5.19).
export function EvaluacionesTab({
  lots,
  fincas,
  onRefreshData,
  onConfirmSampleShipped,
  onVerLotes,
}: {
  lots: Lot[];
  fincas: Finca[];
  onRefreshData: () => void;
  onConfirmSampleShipped: (lotId: string) => void;
  onVerLotes: () => void;
}) {
  // Sección 1: aptos sin solicitud + solicitudes en postulación (pago/muestra).
  const solicitudes = lots.filter((l) => l.stage === 2 && (!l.inscription || l.inscription.phase === "postulacion"));
  // Sección 2: en fila / en bache — más lo legado de la Arena vieja, que se
  // pinta defensivamente como «en proceso» (fases arena/sesion/competido y los
  // stages 6/7 no volverán a escribirse, pero un dato vivo no puede quedar
  // invisible). El «no superó» (retirado) también vive aquí: es el desenlace
  // de la fila.
  const enFila = lots.filter(
    (l) =>
      (l.inscription && ["fila", "sondeo", "arena", "sesion", "retirado"].includes(l.inscription.phase) && l.stage < 7) ||
      (l.stage === 6 && !l.inscription)
  );
  // Sección 3: galardonados (y el legado 'evaluado').
  const galardonados = lots.filter((l) => l.stage >= 7 || l.inscription?.phase === "galardonado" || l.inscription?.phase === "competido");

  const paymentsDue = lots.filter((l) => l.inscription && l.inscription.status === "pendiente" && l.inscription.phase === "postulacion");
  const totalDueCop = paymentsDue.reduce((sum, l) => sum + (l.inscription?.amountDueCop ?? EVALUATION_FEE_COP), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 14 }}>
      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Solicitudes de Evaluación</span>
        </div>
        <div className={styles.secSub}>Lleve sus lotes registrados al siguiente nivel</div>
        <div className={styles.alist} style={{ marginTop: 8 }}>
          Registrar su finca y armar la ficha no cuesta nada. Cuando CTC declara un lote <b>Apto</b> (EVA en verde, con
          su Sello EUDR emitido), usted decide si <b>solicita su evaluación</b>: cuesta <b>{formatCop(EVALUATION_FEE_COP)}</b>{" "}
          por lote y cubre el análisis físico, la catación por un <b>Q-Grader certificado</b>, el factor de rendimiento,
          la certificación CTC y el feedback — <b>salga o no salga galardonado</b>. ¿Tiene un <b>código de campaña</b>?
          Aplíquelo al solicitar y verá su descuento al instante.
        </div>
        {solicitudes.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 10 }}>
            Aún no tiene lotes aptos por solicitar. Complete la ficha de un lote y CTC lo evaluará — al ser declarado
            Apto, podrá solicitar su evaluación desde aquí.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {solicitudes.map((l) => (
              <SolicitudCard key={l.id} lot={l} onRefreshData={onRefreshData} onConfirmSampleShipped={onConfirmSampleShipped} onVerLotes={onVerLotes} />
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
                  <li>CTC confirma el pago y su lote sigue su camino a la fila de evaluación.</li>
                </ol>
              </>
            ) : (
              <div className={styles.alist} style={{ marginTop: 6 }}>
                Escríbanos a <b>{PAYMENT_EMAIL}</b> y le indicamos cómo pagar su inscripción.
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Evaluaciones en Fila</span>
        </div>
        <div className={styles.secSub}>Muestras enviadas y evaluación paga, en espera de evaluación y resultados</div>
        {enFila.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 10 }}>
            Nada en fila por ahora. Cuando CTC confirme el recibo de su muestra y el pago, su lote esperará aquí su
            bache de evaluación con el Q-Grader.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {enFila.map((l) => (
              <FilaCard key={l.id} lot={l} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Lotes Galardonados</span>
        </div>
        <div className={styles.secSub}>Evaluación completada, aquí los resultados</div>
        {galardonados.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 10 }}>
            Sin galardones todavía. Cuando el Q-Grader evalúe su lote, el resultado, sus documentos y su Grado CTC
            aparecerán aquí — y su camino comercial sigue en <b>Contratos y Compras</b>.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {galardonados.map((l) => (
              <GalardonCard key={l.id} lot={l} fincas={fincas} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const cardStyle = { border: "1.5px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--paper)" } as const;

function CardHead({ lot, onVerLotes }: { lot: Lot; onVerLotes?: () => void }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{lot.name}</b>
        {onVerLotes && (
          <button
            type="button"
            onClick={onVerLotes}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--green)", fontWeight: 700, fontSize: 12.5 }}
          >
            Ver lote en «Mis Lotes» →
          </button>
        )}
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--muted)", overflowWrap: "anywhere", margin: "3px 0 2px" }}>
        <CtcRef id={lot.id} />
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Finca: {lot.finca}</div>
    </>
  );
}

// La tarjeta de la SOLICITUD: apto sin solicitar, o pago/muestra en curso.
// (Era «ArenaLotCard»; V5.17 la reescribe al vocabulario de la evaluación.)
function SolicitudCard({
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

  async function solicitar() {
    setBusy(true);
    const res = await postularLote(lot.id, code.trim() || undefined);
    setBusy(false);
    if (res.ok) {
      showToast(`Evaluación solicitada ✓ · código ${res.entryCode}`);
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

  const settled = ins?.status === "pagado" || ins?.status === "exento";

  return (
    <div style={cardStyle} id={`solicitud-lot-${lot.id}`}>
      <CardHead lot={lot} onVerLotes={onVerLotes} />

      {!ins ? (
        // Apto sin solicitar: la decisión es del productor.
        <div>
          <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>✓ Apto — listo para solicitar su evaluación</div>
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
            <button className="btn btn-sm btn-solid-accent" disabled={busy} onClick={solicitar}>
              {busy ? "Solicitando…" : "Solicitar evaluación"}
            </button>
          </div>
          {peek && <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--muted)" }}>{peek}</div>}
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Inscripción: {formatCop(EVALUATION_FEE_COP)} — con un código de campaña el descuento se muestra al escribirlo.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px" }}>
              Solicitud en curso
            </span>
            <span className="mono" style={{ fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px" }}>
              Código: {ins.entryCode ?? "—"}
            </span>
          </div>

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
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Muestra enviada — al confirmarse el recibo físico y el pago, su lote pasa a <b>Evaluaciones en Fila</b>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// La tarjeta de la FILA: esperando bache, en bache, o el desenlace no superado.
function FilaCard({ lot }: { lot: Lot }) {
  const ins = lot.inscription;
  const phase = ins?.phase ?? (lot.stage === 6 ? "fila" : "");
  return (
    <div style={cardStyle}>
      <CardHead lot={lot} />
      {phase === "fila" && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          ✓ Pago y muestra confirmados — <b>en fila</b> para el próximo bache de evaluación.
        </div>
      )}
      {phase === "sondeo" && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Su muestra viaja en un <b>bache de evaluación</b> rumbo al laboratorio del <b>Q-Grader</b>. El resultado —
          puntaje, Grado CTC y feedback — le llegará aquí y a su feed.
        </div>
      )}
      {/* Fases de la Arena vieja (legado defensivo): ningún veredicto nuevo las
          escribe, pero un dato vivo no puede quedar invisible. */}
      {(phase === "arena" || phase === "sesion") && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          En proceso con CTC{ins?.sondeoScore != null ? ` (puntaje preliminar ${ins.sondeoScore})` : ""} — le contaremos
          el siguiente paso por Mensajes y Notificaciones.
        </div>
      )}
      {phase === "retirado" && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13 }}>
            Su café no superó la evaluación esta vez{ins?.sondeoScore != null ? ` (${ins.sondeoScore})` : ""}.
          </div>
          {ins?.sondeoResultNotes && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Resultado: {ins.sondeoResultNotes}</div>}
          {ins?.cashbackStatus && (
            <div style={{ fontSize: 12.5 }}>
              Reembolso del 80% ({formatCop(ins.cashbackCop ?? 0)}):{" "}
              <b style={{ color: ins.cashbackStatus === "pagado" ? "var(--green)" : "var(--accent)" }}>
                {ins.cashbackStatus === "pagado" ? "enviado ✓" : "en camino por Nequi"}
              </b>
            </div>
          )}
          {ins?.mejorasDoc && (
            <details style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px", background: "var(--card)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Recomendaciones de Mejora</summary>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>{ins.mejorasDoc}</div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// La tarjeta del GALARDÓN: el Grado CTC (con su sello), el puntaje, los
// documentos y el feedback del Q-Grader. Absorbe el viejo módulo
// «Certificación CTC».
function GalardonCard({ lot, fincas }: { lot: Lot; fincas: Finca[] }) {
  const ins = lot.inscription;
  const sourceFinca = fincas.find((f) => f.id === lot.fincaId);
  const lotEudrReady =
    lotEudrStatus(
      { eudr_risk_level: lot.eudrRiskLevel, eudr_mitigation_effective: lot.eudrMitigationEffective },
      sourceFinca ? [sourceFinca] : []
    ).code === "eudr_ready";
  const puntaje = ins?.sondeoScore ?? lot.officialScaAverage;

  return (
    <div style={{ ...cardStyle, borderColor: lot.grade ? GRADES[lot.grade] : "var(--line)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {lot.grade && (
          <Image
            src={`/images/shared/grados/${lot.grade.toLowerCase()}.webp`}
            alt={`Grado ${lot.grade}`}
            width={160}
            height={160}
            style={{ width: 54, height: 54, objectFit: "contain", flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <CardHead lot={lot} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span
              className="mono"
              style={{ fontSize: 11.5, fontWeight: 700, border: `1.5px solid ${lot.grade ? GRADES[lot.grade] : "var(--line)"}`, color: lot.grade ? GRADES[lot.grade] : "var(--muted)", borderRadius: 999, padding: "2px 10px" }}
            >
              {lot.grade ? `Grado CTC · ${lot.grade}` : "Evaluado (sin galardón)"}
            </span>
            {puntaje != null && (
              <span className="mono" style={{ fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px" }}>
                Puntaje SCA: {puntaje}
              </span>
            )}
          </div>
          {ins?.sondeoResultNotes && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>Feedback del Q-Grader: {ins.sondeoResultNotes}</div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {lotEudrReady ? (
              <a className="btn btn-sm btn-solid" href={`/kaffetal-regal/certificacion-lote/${lot.id}`} target="_blank" rel="noopener noreferrer">
                Certificado y Sello EUDR del lote ↗
              </a>
            ) : (
              <span className={styles.certPending}>Sello EUDR: a la espera de la Visa de su finca</span>
            )}
          </div>
          {/* La vitrina de la Arena (V5.19): la gala post-galardón de
              Blue/Gold/Tyrian con contrato — display, la gestión es de CTC. */}
          {ins?.phase === "arena" && (
            <div style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 700, marginTop: 8 }}>
              ★ Invitado a la vitrina de la Arena — la gala en vivo de los mejores de la temporada. CTC le confirmará la fecha.
            </div>
          )}
          {ins?.phase === "sesion" && (
            <div style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 700, marginTop: 8 }}>
              ★ Sesión de la vitrina confirmada — la fecha está en Mensajes y Notificaciones.
            </div>
          )}
          {ins?.phase === "competido" && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
              ★ Su lote compitió en la vitrina de la Arena — la sesión quedó grabada y viaja con su café.
            </div>
          )}
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
            Su camino comercial sigue en <b>Contratos y Compras</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
