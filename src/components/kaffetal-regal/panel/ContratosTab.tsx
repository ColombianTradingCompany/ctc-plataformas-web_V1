"use client";

import { useState } from "react";
import Image from "next/image";
import { CONTRACT_STATUS_LABEL, GRADES, type GeneralInfo, type Lot, type ProducerContract, type ProducerOffer } from "../data";
import { respondToOffer } from "@/lib/ofertas/producerActions";
import { previsualizarRetiro, retirarDelTrato } from "@/lib/trato/producerActions";
import { formatCop } from "@/lib/arena/inscriptions";
import { simularTrato, type Declaracion } from "@/lib/trato/simulador";
import { MORA, PENALIDAD_RETIRO_PCT, TRAMO_LIBRE_ACUMULADO_PCT } from "@/lib/trato/terminos";
import { MORA_LABEL, type Retiro } from "@/lib/trato/mesAMes";
import { useToast } from "@/components/Toast";
import { CtcRef } from "./CtcRef";
import styles from "../AppDashboard.module.css";

// ── Contratos y Compras (V5.18: las cuatro secciones · V5.83: aceptar con claridad · V5.84: el trato mes a mes) ──
// El circuito comercial del galardón, lado productor (mockups del owner; folio 8, pasos 14–18):
//   1. OFERTAS DE TEMPORADA — lotes galardonados Red o superior, de esta
//      temporada o la pasada; CTCx oferta ANCLADA al PVC y el productor DECIDE
//      con la calculadora: cuánto compromete (≥ el mínimo del grado), por
//      trimestre o por 30 días, y acepta las condiciones. Aceptar CREA el
//      contrato LLENO (precio y cantidad ya fijados), pendiente de la firma de CTC.
//   2. CONTRATOS DE TEMPORADA — «Mi trato»: lo declarado, el precio, la compra
//      inicial de CTC, y el seguimiento MES A MES (lo que CTC pidió, lo enviado,
//      lo pagado, los retiros) con la mora DERIVADA a la vista (decisión 6: se
//      enseña sola, nunca actúa sola) y el retiro con su tramo libre y su penalidad.
//   3. OFERTAS BLACK — la consideración de compra directa de CTCx sobre los
//      lotes Black (precio negociado; se acepta sin declaración).
//   4. SUBASTAS TYRIAN — «el podio de los mejores, al mejor postor»: el lote
//      Tyrian va rumbo a subasta y el mejor postor llega como oferta.
export function ContratosTab({
  gi,
  contracts,
  offers,
  lots,
  onRefreshData,
  onGoEvaluaciones,
}: {
  /** V5.84: de aquí sale el estado de la cuenta (`producer_profiles.estado_cuenta`, lo escribe solo el owner). */
  gi: GeneralInfo;
  contracts: ProducerContract[];
  offers: ProducerOffer[];
  lots: Lot[];
  onRefreshData: () => void;
  onGoEvaluaciones: () => void;
}) {
  // V5.82: la directa (CTCx Selection) y la excepción son ofertas de temporada a otro precio; viven en la misma sección.
  const esDeLaClase = (o: ProducerOffer, kind: ProducerOffer["kind"]) =>
    kind === "temporada" ? o.kind === "temporada" || o.kind === "directa" || o.kind === "excepcion" : o.kind === kind;
  const abiertas = (kind: ProducerOffer["kind"]) => offers.filter((o) => esDeLaClase(o, kind) && o.status === "emitida");
  const historial = (kind: ProducerOffer["kind"]) =>
    offers.filter((o) => esDeLaClase(o, kind) && (o.status === "rechazada" || o.status === "retirada" || o.status === "expirada"));
  // La oferta aceptada que dio origen a cada contrato: trae el encuadre de
  // temporada congelado (label + «lote de la temporada pasada»).
  const ofertaDeContrato = new Map(offers.filter((o) => o.contractId).map((o) => [o.contractId!, o]));
  const cuentaCongelada = gi.estadoCuenta === "congelada";

  // Tyrian «rumbo a subasta»: galardonado Tyrian sin oferta abierta ni contrato.
  const conOfertaAbierta = new Set(offers.filter((o) => o.status === "emitida").map((o) => o.lotId));
  const conContrato = new Set(contracts.map((c) => c.lotId));
  const rumboASubasta = lots.filter(
    (l) => l.stage === 8 && l.grade === "Tyrian" && !conOfertaAbierta.has(l.id) && !conContrato.has(l.id)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
      {cuentaCongelada && (
        <div className={styles.alist} style={{ border: "1.5px solid var(--accent)", borderRadius: 10, padding: "10px 14px", background: "var(--paper)", lineHeight: 1.6 }}>
          <b>Su cuenta está congelada por ruptura contractual.</b>
          {gi.estadoCuentaMotivo && <> Motivo: {gi.estadoCuentaMotivo}.</>} Mientras esté congelada no puede aceptar ofertas ni retirar de sus
          tratos. Si hubo una causa legítima, escríbale a CTC: la reactivación la decide CTC.
        </div>
      )}

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Ofertas de Temporada</span>
        </div>
        <div className={styles.secSub}>Lotes galardonados de esta temporada disponibles para postular en Cherry Picked</div>
        <div className={styles.alist} style={{ marginTop: 8 }}>
          Solo entran aquí los lotes con un galardón que los posiciona <b>Red o superior</b>, de <b>esta temporada o la
          pasada</b>. CTC le presenta su oferta en firme, <b>anclada al PVC vigente</b> — referencia la combinación de Grado,
          Puntaje, Variedad y Proceso — y <b>usted decide con claridad</b>: la calculadora le muestra qué compra CTC de
          inmediato, qué pediría cada mes y qué puede retirar sin costo; usted declara cuánto compromete y acepta las
          condiciones. Aceptar crea el contrato con ese precio y esa cantidad; rechazar la cierra sin compromiso.
        </div>
        <OfferList
          offers={abiertas("temporada")}
          historial={historial("temporada")}
          vacio="Sin ofertas abiertas. Cuando un lote suyo salga galardonado Red o superior, la oferta de CTC aparecerá aquí."
          onRefreshData={onRefreshData}
        />
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Contratos de Temporada</span>
        </div>
        <div className={styles.secSub}>Mi trato: lo que declaró, lo que CTC compra y el seguimiento mes a mes</div>
        {contracts.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 8 }}>
            Sus contratos con CTC vivirán aquí. El camino: complete la ficha de un lote, solicite su evaluación en{" "}
            <button
              type="button"
              onClick={onGoEvaluaciones}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--green)", fontWeight: 700, font: "inherit" }}
            >
              Evaluar mi Café →
            </button>{" "}
            y, con el galardón, llegan las ofertas de compra de CTC. Un contrato nace cuando usted acepta una.
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {contracts.map((c) => (
              <ContratoCard key={c.id} contract={c} oferta={ofertaDeContrato.get(c.id)} cuentaCongelada={cuentaCongelada} onRefreshData={onRefreshData} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Ofertas Black</span>
        </div>
        <div className={styles.secSub}>Ofertas enviadas por CTCx sobre los lotes evaluados «Black»</div>
        <div className={styles.alist} style={{ marginTop: 8 }}>
          Un lote <b>Black</b> puede entrar en consideración de <b>compra directa</b>: CTC lo negocia y, si decide
          comprar, la oferta le llega aquí. (Para grados superiores considerados en compra directa, CTC lo contacta
          directamente, fuera de la plataforma.)
        </div>
        <OfferList
          offers={abiertas("black")}
          historial={historial("black")}
          vacio="Sin ofertas Black por ahora."
          onRefreshData={onRefreshData}
        />
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Subastas Tyrian</span>
        </div>
        <div className={styles.secSub}>El podio de los mejores, al mejor postor</div>
        {rumboASubasta.length > 0 && (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {rumboASubasta.map((l) => (
              <div key={l.id} style={{ border: `1.5px solid ${GRADES.Tyrian}`, borderRadius: 10, padding: "12px 14px", background: "var(--paper)" }}>
                <b style={{ fontSize: 14 }}>{l.name}</b>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "3px 0" }}><CtcRef id={l.id} /></div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <b style={{ color: GRADES.Tyrian }}>Grado Tyrian</b> — rumbo a subasta. CTC corre la puja y el{" "}
                  <b>mejor postor</b> le llegará aquí como oferta: usted decide si vende.
                </div>
              </div>
            ))}
          </div>
        )}
        <OfferList
          offers={abiertas("subasta")}
          historial={historial("subasta")}
          vacio={rumboASubasta.length ? "" : "Sin lotes Tyrian por ahora — es la rareza más alta de la escala."}
          onRefreshData={onRefreshData}
        />
      </section>
    </div>
  );
}

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : null);
const td: React.CSSProperties = { textAlign: "right", padding: "3px 4px", whiteSpace: "nowrap" };

// «Mi trato» (V5.84, fase 7): el resumen, los meses con su mora derivada, el retiro y la humedad.
// Lo derivado (mora, mes en curso) viene calculado del cargador con `mesAMes.ts`; aquí no se lee la hora.
function ContratoCard({ contract: c, oferta, cuentaCongelada, onRefreshData }: { contract: ProducerContract; oferta: ProducerOffer | undefined; cuentaCongelada: boolean; onRefreshData: () => void }) {
  const sim =
    c.quantityFrozenKg != null && c.pricePerKgLocked != null
      ? simularTrato({ declaradoKg: c.quantityFrozenKg, copKg: c.pricePerKgLocked, declaracion: c.declaracion ?? "trimestre", grado: c.grade?.toLowerCase() })
      : null;
  const nMeses = c.freezeMonths && c.freezeMonths > 0 ? Math.min(3, c.freezeMonths) : 3;
  const retiradoKg = Math.round(c.months.reduce((a, m) => a + m.retiradoKg, 0) * 10) / 10;
  const penalidadCop = c.months.reduce((a, m) => a + m.penalidadCop, 0);
  const vigenteKg = c.quantityFrozenKg != null ? Math.round((c.quantityFrozenKg - retiradoKg) * 10) / 10 : null;
  const enCurso = c.status === "active" || c.status === "reconditioning";
  const moraColor = c.mora === "ruptura_potencial" || c.mora === "con_recargo" ? "var(--accent)" : "var(--muted)";

  return (
    <div className={styles.fincarow} style={{ marginTop: 10 }}>
      <h5>
        <CtcRef id={c.lotId} /> · {c.lotName}{" "}
        {c.grade && <b style={{ color: GRADES[c.grade] }}>· {c.grade}</b>}
      </h5>
      <div className={styles.sub}>
        Estado: <b>{CONTRACT_STATUS_LABEL[c.status]}</b>
        {oferta?.seasonLabel && <> · Temporada de venta: <b>{oferta.seasonLabel}</b></>}
        {c.quantityFrozenKg != null && <> · Declarado: <b>{c.quantityFrozenKg} kg de CPS</b>{c.declaracion && <> ({c.declaracion === "trimestre" ? "trimestre" : "30 días"})</>}</>}
        {c.pricePerKgLocked != null && <> · Precio: <b>{formatCop(c.pricePerKgLocked)}/kg</b>{c.referencePriceSource && <> ({c.referencePriceSource})</>}</>}
        {c.signedAt && <> · Firmado el {fecha(c.signedAt)}</>}
      </div>
      {sim && (
        <div className={styles.alist} style={{ marginTop: 4 }}>
          CTC compra de inmediato <b>{sim.compraInicial.kg} kg</b> ({formatCop(sim.compraInicial.cop)}) · el trato vale{" "}
          <b>{formatCop(sim.totalCop)}</b> · retiro libre al cerrar cada mes:{" "}
          {sim.porMes.map((m) => `mes ${m.mes} ${m.retiroLibrePct} %`).join(" · ")} · penalidad por encima del tramo:{" "}
          {PENALIDAD_RETIRO_PCT} % por carga{c.termsVersion && <> · términos {c.termsVersion}</>}
        </div>
      )}
      {oferta?.loteDeTemporadaPasada && (
        <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700 }}>
          Lote de la temporada pasada — posicionado en la ventana de esta temporada, y valorado como tal.
        </div>
      )}
      {c.status === "pending_signature" && (
        <div className={styles.sub}>CTC está preparando la firma — el precio y la cantidad ya quedaron fijados al aceptar.</div>
      )}
      {c.status === "ruptura" && (
        <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700 }}>
          Ruptura contractual declarada por CTC: un pedido pasó de las cuatro semanas sin envío. Su cuenta quedó congelada; si hubo causa
          legítima, escríbale a CTC.
        </div>
      )}
      {c.status === "renovado" && (
        <div className={styles.sub} style={{ color: "var(--green)", fontWeight: 700 }}>
          Trato cumplido y renovación ofrecida: la oferta nueva, con el PVC vigente, está arriba en «Ofertas de Temporada».
        </div>
      )}
      {c.status === "completed" && <div className={styles.sub} style={{ color: "var(--green)", fontWeight: 700 }}>Trato cumplido: los {nMeses} meses enviados y pagados. A los 90 días de la firma CTC le ofrece renovar.</div>}

      {/* La barra: un tramo por mes, encendido cuando el envío del mes quedó recibido */}
      <div className={styles.track} aria-label="Progreso del trato">
        {Array.from({ length: nMeses }, (_, i) => i + 1).map((m) => (
          <i key={m} className={c.months.find((x) => x.mes === m)?.enviadoAt ? styles.on : ""} />
        ))}
      </div>

      {c.status !== "pending_signature" && (
        <>
          <div className={styles.alist} style={{ marginTop: 6 }}>
            Comprometido <b>{c.quantityFrozenKg ?? "—"} kg</b> · retirado {retiradoKg} kg · <b>vigente {vigenteKg ?? "—"} kg</b>
            {penalidadCop > 0 && <> · penalidades {formatCop(penalidadCop)}</>}
            {enCurso && <> · mes en curso <b>{c.mesEnCurso} de {nMeses}</b></>}
            {enCurso && c.mora !== "sin_pedido" && c.mora !== "cumplido" && <> · <b style={{ color: moraColor }}>{MORA_LABEL[c.mora]}</b></>}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 6 }}>
            <thead>
              <tr style={{ color: "var(--muted)" }}>
                <th style={{ textAlign: "left", padding: "3px 4px" }}>Mes</th>
                <th style={td}>CTC pidió</th>
                <th style={td}>Usted envió</th>
                <th style={td}>CTC pagó</th>
                <th style={td}>Retiró</th>
                <th style={{ textAlign: "left", padding: "3px 4px" }}>Situación</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: nMeses }, (_, i) => i + 1).map((mes) => {
                const m = c.months.find((x) => x.mes === mes);
                const situacion = !m ? "—" : m.mora === "sin_pedido" && m.retiradoKg > 0 ? "Retiro registrado" : MORA_LABEL[m.mora];
                const alerta = m && (m.mora === "con_recargo" || m.mora === "ruptura_potencial");
                return (
                  <tr key={mes} style={{ borderTop: "1px solid var(--line)", fontWeight: enCurso && mes === c.mesEnCurso ? 700 : 400 }}>
                    <td style={{ padding: "3px 4px" }}>Mes {mes}</td>
                    <td style={td}>{m?.pedidoKg != null ? `${m.pedidoKg} kg` : "—"}</td>
                    <td style={td}>{m?.enviadoKg != null ? `${m.enviadoKg} kg${m.enviadoAt ? ` · ${fecha(m.enviadoAt)}` : ""}` : "—"}</td>
                    <td style={td}>{m?.pagadoCop != null ? formatCop(m.pagadoCop) : "—"}</td>
                    <td style={td}>{m && m.retiradoKg > 0 ? `${m.retiradoKg} kg${m.penalidadCop > 0 ? ` (${formatCop(m.penalidadCop)})` : ""}` : "—"}</td>
                    <td style={{ padding: "3px 4px", color: alerta ? "var(--accent)" : "var(--muted)", fontWeight: alerta ? 700 : 400 }}>
                      {situacion}
                      {m && alerta ? ` · ${m.moraSemanas} sem.` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {enCurso && (
            <div className={styles.sub} style={{ marginTop: 4 }}>
              CTC pide cada mes y paga en la primera semana del siguiente. Si un pedido no se envía: {MORA.semanasSinCargo} semanas sin cargo,{" "}
              {MORA.semanasConRecargo} más con {MORA.recargoPct} %; después, ruptura contractual (la declara CTC; avise antes si hay una causa legítima).
            </div>
          )}
        </>
      )}

      {c.status === "active" && c.quantityFrozenKg != null && c.pricePerKgLocked != null && (vigenteKg ?? 0) > 0 && (
        cuentaCongelada ? (
          <div className={styles.sub} style={{ marginTop: 6 }}>Con la cuenta congelada no se puede retirar de este trato.</div>
        ) : (
          <RetiroForm contract={c} vigenteKg={vigenteKg ?? 0} nMeses={nMeses} onRefreshData={onRefreshData} />
        )
      )}

      {c.humidity.length > 0 && (
        <div className={styles.alist} style={{ marginTop: 6 }}>
          Humedad: {c.humidity.map((h) => `mes ${h.month}: ${h.pct.toFixed(1)}%${h.flagged ? " ⚠" : " ✓"}`).join(" · ")}
        </div>
      )}
    </div>
  );
}

// El retiro (paso 16): el productor escribe los kilos, VE la cuenta que hará el servidor (tramo libre · penalidad) y confirma.
// La cuenta la hace `retiro()` (pura) en `previsualizarRetiro` y `retirarDelTrato`: aquí no se calcula nada.
function RetiroForm({ contract, vigenteKg, nMeses, onRefreshData }: { contract: ProducerContract; vigenteKg: number; nMeses: number; onRefreshData: () => void }) {
  const { showToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [kg, setKg] = useState("");
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [vista, setVista] = useState<{ retiro: Retiro; mes: number } | null>(null);
  const n = Number(String(kg).replace(",", "."));
  const valido = Number.isFinite(n) && n > 0 && n <= vigenteKg + 1e-9;
  const tramoLibre = TRAMO_LIBRE_ACUMULADO_PCT[Math.min(3, Math.max(1, contract.mesEnCurso)) as 1 | 2 | 3] ?? 0;

  async function calcular() {
    if (!valido) return;
    setBusy(true);
    const r = await previsualizarRetiro(contract.id, n);
    setBusy(false);
    if (r.ok) setVista({ retiro: r.retiro, mes: r.mes });
    else showToast(r.message);
  }

  async function confirmar() {
    if (!vista) return;
    const ok = window.confirm(
      `¿Retirar ${n} kg de su trato por ${contract.lotName}?\n\n` +
        `${vista.retiro.libreKg} kg dentro del tramo libre · ${vista.retiro.penalizadoKg} kg con penalidad de ${formatCop(vista.retiro.penalidadCop)} (${PENALIDAD_RETIRO_PCT} % del precio de cada carga).\n` +
        `Quedarán ${Math.round((vigenteKg - n) * 10) / 10} kg comprometidos.`
    );
    if (!ok) return;
    setBusy(true);
    const r = await retirarDelTrato(contract.id, n, nota);
    setBusy(false);
    if (r.ok) {
      showToast(`Retiro registrado ✓ · ${r.retiro.libreKg} kg libres · penalidad ${formatCop(r.retiro.penalidadCop)}`);
      setAbierto(false);
      setKg("");
      setNota("");
      setVista(null);
      onRefreshData();
    } else {
      showToast(r.message);
    }
  }

  if (!abierto) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn btn-sm" type="button" onClick={() => setAbierto(true)}>
          Retirar kilos del trato…
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--card)" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Retirar del trato (mes {contract.mesEnCurso} de {nMeses})</div>
      <div className={styles.sub} style={{ marginBottom: 6 }}>
        Puede retirar hasta el 100 %. Tramo libre acumulado a esta altura: <b>{tramoLibre} %</b> de lo declarado (menos lo ya retirado libre); lo que
        pase de ahí paga el {PENALIDAD_RETIRO_PCT} % del precio de cada carga. Quedan {vigenteKg} kg comprometidos.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12.5 }}>
          Retiro{" "}
          <input
            inputMode="decimal"
            value={kg}
            onChange={(e) => {
              setKg(e.target.value);
              setVista(null);
            }}
            style={{ width: 90, padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" }}
          />{" "}
          kg
        </label>
        <input
          placeholder="Motivo (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          style={{ flex: 1, minWidth: 160, padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" }}
        />
      </div>
      {kg && !valido && <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>Escriba entre 0 y {vigenteKg} kg.</div>}
      {vista && (
        <div className={styles.alist} style={{ marginTop: 6 }}>
          Mes {vista.mes}: <b>{vista.retiro.libreKg} kg</b> dentro del tramo libre (disponible {vista.retiro.libreDisponibleKg} kg) ·{" "}
          <b>{vista.retiro.penalizadoKg} kg</b> con penalidad de <b>{formatCop(vista.retiro.penalidadCop)}</b>
          {vista.retiro.cargasPenalizadas > 0 && <> ({vista.retiro.cargasPenalizadas} carga(s) al {PENALIDAD_RETIRO_PCT} %)</>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", marginTop: 10 }}>
        {vista ? (
          <button className="btn btn-sm btn-solid-accent" type="button" disabled={busy || !valido} onClick={confirmar}>
            {busy ? "Registrando…" : "Confirmar el retiro"}
          </button>
        ) : (
          <button className="btn btn-sm btn-solid" type="button" disabled={busy || !valido} onClick={calcular}>
            {busy ? "Calculando…" : "Ver la cuenta"}
          </button>
        )}
        <button
          className="btn btn-sm"
          type="button"
          disabled={busy}
          onClick={() => {
            setAbierto(false);
            setVista(null);
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function OfferList({
  offers,
  historial,
  vacio,
  onRefreshData,
}: {
  offers: ProducerOffer[];
  historial: ProducerOffer[];
  vacio: string;
  onRefreshData: () => void;
}) {
  return (
    <>
      {offers.length === 0 && vacio && <div className={styles.alist} style={{ marginTop: 10 }}>{vacio}</div>}
      {offers.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} onRefreshData={onRefreshData} />
          ))}
        </div>
      )}
      {historial.length > 0 && (
        <div className={styles.alist} style={{ marginTop: 10 }}>
          {historial.map((o) => (
            <span key={o.id}>
              {o.lotName} · oferta {o.status === "rechazada" ? "rechazada por usted" : o.status === "retirada" ? "retirada por CTC" : "expirada"}
              {o.respondedAt && ` (${new Date(o.respondedAt).toLocaleDateString("es-CO")})`}
              <br />
            </span>
          ))}
        </div>
      )}
    </>
  );
}

const KIND_LABEL: Record<ProducerOffer["kind"], string> = {
  temporada: "Lote de Temporada",
  directa: "Oferta directa · CTCx Selection",
  excepcion: "Oferta de temporada (excepción)",
  black: "Oferta Black",
  subasta: "Mejor postor · subasta",
};

// La tarjeta de una oferta abierta: los snapshots congelados, el anclaje, la calculadora y la decisión.
// Botones abajo a la derecha, apilados — la regla de la casa.
function OfferCard({ offer, onRefreshData }: { offer: ProducerOffer; onRefreshData: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState("");
  const color = offer.grade ? GRADES[offer.grade] : "var(--line)";
  // V5.83 · la declaración (folio 8, paso 15): solo para las ofertas con términos.
  const conDeclaracion = Boolean(offer.termsVersion);
  const [kg, setKg] = useState(offer.minKg != null ? String(offer.minKg) : "");
  const [declaracion, setDeclaracion] = useState<Declaracion>(offer.kind === "directa" ? "30_dias" : "trimestre");
  const [acepta, setAcepta] = useState(false);
  const declaradoKg = Number(String(kg).replace(",", "."));
  const sim = conDeclaracion && Number.isFinite(declaradoKg) && declaradoKg > 0 ? simularTrato({ declaradoKg, copKg: offer.pricePerKg, declaracion, grado: offer.grade?.toLowerCase() }) : null;
  const cabeEnMaximo = offer.maxKg == null || declaradoKg <= offer.maxKg;
  // El vencimiento de una directa lo decide el SERVIDOR al aceptar (`respondToOffer` la deja «expirada»): aquí solo se enseña
  // la fecha — leer la hora en render viola `react-hooks/purity`.
  const puedeAceptar = !conDeclaracion || (Boolean(sim?.cumpleMinimo) && cabeEnMaximo && acepta);
  const declaracionParaEnviar = conDeclaracion ? { lockedKg: declaradoKg, declaracion, aceptaTerminos: acepta } : undefined;

  async function responder(respuesta: "aceptar" | "rechazar") {
    if (respuesta === "aceptar") {
      const ok = window.confirm(
        `¿Aceptar la oferta de CTC por ${offer.lotName}?\n\n` +
          `${formatCop(offer.pricePerKg)}/kg de CPS · Grado ${offer.grade ?? "—"}` +
          (conDeclaracion ? `\nUsted declara ${declaradoKg} kg por ${declaracion === "trimestre" ? "el trimestre" : "30 días"} y acepta las condiciones (términos ${offer.termsVersion}).` : "") +
          "\nAl aceptar se crea su contrato con CTC con ese precio y esa cantidad (pendiente de la firma de CTC)."
      );
      if (!ok) return;
    }
    setBusy(true);
    const res = await respondToOffer(offer.id, respuesta, respuesta === "rechazar" ? nota : undefined, respuesta === "aceptar" ? declaracionParaEnviar : undefined);
    setBusy(false);
    if (res.ok) {
      showToast(respuesta === "aceptar" ? "Oferta aceptada ✓ · su contrato quedó creado" : "Oferta rechazada — sin compromiso");
      setRechazando(false);
      setNota("");
      onRefreshData();
    } else {
      showToast(res.message);
    }
  }

  return (
    <div style={{ border: `1.5px solid ${color}`, borderRadius: 10, padding: "12px 14px", background: "var(--paper)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {offer.grade && (
          <Image
            src={`/images/shared/grados/${offer.grade.toLowerCase()}.webp`}
            alt={`Grado ${offer.grade}`}
            width={160}
            height={160}
            style={{ width: 46, height: 46, objectFit: "contain", flexShrink: 0 }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <b style={{ fontSize: 14 }}>{offer.lotName}</b>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "3px 0 6px" }}>
            <CtcRef id={offer.lotId} />
          </div>
          <div className={styles.chips}>
            <span className={styles.datachip}>{KIND_LABEL[offer.kind]}</span>
            {offer.grade && <span className={styles.datachip}>Grado: <b style={{ color }}>{offer.grade}</b></span>}
            {offer.score != null && <span className={styles.datachip}>Puntaje: <b>{offer.score}</b></span>}
            {offer.variety && <span className={styles.datachip}>Variedad: <b>{offer.variety}</b></span>}
            {offer.process && <span className={styles.datachip}>Proceso: <b>{offer.process}</b></span>}
            {offer.seasonLabel && <span className={styles.datachip}>Temporada: <b>{offer.seasonLabel}</b></span>}
          </div>
          {offer.loteDeTemporadaPasada && (
            <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>
              Lote de la temporada pasada — su valor está enmarcado como tal.
            </div>
          )}
          <div style={{ fontSize: 15, marginTop: 8 }}>
            Oferta de CTC: <b>{formatCop(offer.pricePerKg)}/kg</b> de CPS
            {!conDeclaracion && offer.quantityKg != null && <> · <b>{offer.quantityKg} kg</b></>}
          </div>
          {conDeclaracion && (
            <div className={styles.sub} style={{ marginTop: 4 }}>
              {offer.referencePriceSource && <>Anclada a <b>{offer.referencePriceSource}</b>{offer.modificadorPct ? ` (${offer.modificadorPct > 0 ? "+" : ""}${offer.modificadorPct} %)` : ""} · </>}
              {offer.minKg != null && <>mínimo <b>{offer.minKg} kg</b> · </>}
              {offer.maxKg != null && <>hasta <b>{offer.maxKg} kg</b> · </>}
              {offer.compraInicialKg != null && <>CTC compra de inmediato <b>{offer.compraInicialKg} kg</b> · </>}
              {offer.expiraAt && <>vence el <b>{new Date(offer.expiraAt).toLocaleDateString("es-CO")}</b> · </>}
              términos {offer.termsVersion}
            </div>
          )}
          {offer.notes && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{offer.notes}</div>}

          {/* ── La calculadora (paso 15): decida la cantidad viendo el escenario ── */}
          {conDeclaracion && !rechazando && (
            <div style={{ marginTop: 10, border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--card)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Su declaración</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 12.5 }}>
                  Comprometo{" "}
                  <input
                    inputMode="decimal"
                    value={kg}
                    onChange={(e) => setKg(e.target.value)}
                    style={{ width: 90, padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" }}
                  />{" "}
                  kg de CPS
                </label>
                {(["trimestre", "30_dias"] as const).map((d) => (
                  <label key={d} style={{ fontSize: 12.5, display: "flex", gap: 4, alignItems: "center" }}>
                    <input type="radio" name={`decl-${offer.id}`} checked={declaracion === d} onChange={() => setDeclaracion(d)} />
                    {d === "trimestre" ? "por el trimestre que empieza" : "por 30 días (periodo en curso)"}
                  </label>
                ))}
              </div>
              {sim && !sim.cumpleMinimo && offer.minKg != null && (
                <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>
                  El mínimo para {offer.grade} es {offer.minKg} kg.
                </div>
              )}
              {sim && !cabeEnMaximo && <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>Esta oferta admite hasta {offer.maxKg} kg.</div>}
              {sim && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
                  <thead>
                    <tr style={{ color: "var(--muted)" }}>
                      <th style={{ textAlign: "left", padding: "3px 4px" }}>Mes</th>
                      <th style={{ textAlign: "right", padding: "3px 4px" }}>CTC pide</th>
                      <th style={{ textAlign: "right", padding: "3px 4px" }}>CTC paga</th>
                      <th style={{ textAlign: "right", padding: "3px 4px" }}>Retiro libre</th>
                      <th style={{ textAlign: "right", padding: "3px 4px" }}>Retirar todo costaría</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "3px 4px" }}>Hoy</td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>{sim.compraInicial.kg} kg</td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>{formatCop(sim.compraInicial.cop)}</td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>—</td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>—</td>
                    </tr>
                    {sim.porMes.map((m) => (
                      <tr key={m.mes} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={{ padding: "3px 4px" }}>Mes {m.mes}</td>
                        <td style={{ textAlign: "right", padding: "3px 4px" }}>{m.pedidoKg} kg</td>
                        <td style={{ textAlign: "right", padding: "3px 4px" }}>{formatCop(m.pagoCop)}</td>
                        <td style={{ textAlign: "right", padding: "3px 4px" }}>{m.retiroLibrePct} % ({m.retiroLibreKg} kg)</td>
                        <td style={{ textAlign: "right", padding: "3px 4px" }}>{formatCop(m.penalidadSiRetiraTodoCop)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 700 }}>
                      <td style={{ padding: "3px 4px" }}>Total</td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>{sim.declaradoKg} kg</td>
                      <td style={{ textAlign: "right", padding: "3px 4px" }}>{formatCop(sim.totalCop)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              )}
              <div className={styles.sub} style={{ marginTop: 6 }}>
                CTC paga cada pedido en la primera semana del mes siguiente. Retiro libre: {TRAMO_LIBRE_ACUMULADO_PCT[2]} % al cerrar el mes 1 y{" "}
                {TRAMO_LIBRE_ACUMULADO_PCT[3]} % acumulado al cerrar el mes 2; lo que retire por encima paga el {PENALIDAD_RETIRO_PCT} % del precio de cada carga.
                Mora: {MORA.semanasSinCargo} semanas sin cargo, {MORA.semanasConRecargo} más con {MORA.recargoPct} %; después, ruptura contractual.
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, marginTop: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
                <span>Acepto las condiciones de retiro, mora y ruptura del trato (términos {offer.termsVersion}) y declaro la cantidad de arriba.</span>
              </label>
            </div>
          )}

          {rechazando && (
            <textarea
              rows={2}
              placeholder="¿Por qué la rechaza? (opcional — ayuda a CTC a mejorar la próxima oferta)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              style={{ width: "100%", marginTop: 8, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 12.5, background: "var(--card)", fontFamily: "inherit", resize: "vertical" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", marginTop: 10 }}>
            {!rechazando ? (
              <>
                <button className="btn btn-sm btn-solid-accent" disabled={busy || !puedeAceptar} onClick={() => responder("aceptar")}>
                  {busy ? "Enviando…" : conDeclaracion ? "Aceptar con mi declaración" : "Aceptar oferta"}
                </button>
                <button className="btn btn-sm" disabled={busy} onClick={() => setRechazando(true)}>
                  Rechazar…
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-sm btn-solid" disabled={busy} onClick={() => responder("rechazar")}>
                  {busy ? "Enviando…" : "Confirmar rechazo"}
                </button>
                <button className="btn btn-sm" disabled={busy} onClick={() => setRechazando(false)}>
                  Volver
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
