"use client";

import { useState } from "react";
import Image from "next/image";
import { CONTRACT_STATUS_LABEL, GRADES, type GeneralInfo, type Lot, type ProducerContract, type ProducerOffer } from "../data";
import { respondToOffer } from "@/lib/ofertas/producerActions";
import { formatCop } from "@/lib/arena/inscriptions";
import { simularTrato, type Declaracion } from "@/lib/trato/simulador";
import { MORA, PENALIDAD_RETIRO_PCT, TRAMO_LIBRE_ACUMULADO_PCT } from "@/lib/trato/terminos";
import { useToast } from "@/components/Toast";
import { CtcRef } from "./CtcRef";
import styles from "../AppDashboard.module.css";

// ── Contratos y Compras (V5.18: las cuatro secciones · V5.83: aceptar con claridad) ────────
// El circuito comercial del galardón, lado productor (mockups del owner; folio 8, pasos 14–16):
//   1. OFERTAS DE TEMPORADA — lotes galardonados Red o superior, de esta
//      temporada o la pasada; CTCx oferta ANCLADA al PVC y el productor DECIDE
//      con la calculadora: cuánto compromete (≥ el mínimo del grado), por
//      trimestre o por 30 días, y acepta las condiciones. Aceptar CREA el
//      contrato LLENO (precio y cantidad ya fijados), pendiente de la firma de CTC.
//   2. CONTRATOS DE TEMPORADA — «Mi trato»: lo declarado, el precio, la compra
//      inicial de CTC, los tramos libres de retiro y el seguimiento mes a mes.
//   3. OFERTAS BLACK — la consideración de compra directa de CTCx sobre los
//      lotes Black (precio negociado; se acepta sin declaración).
//   4. SUBASTAS TYRIAN — «el podio de los mejores, al mejor postor»: el lote
//      Tyrian va rumbo a subasta y el mejor postor llega como oferta.
export function ContratosTab({
  contracts,
  offers,
  lots,
  onRefreshData,
  onGoEvaluaciones,
}: {
  /** Se conserva en la firma por AppDashboard; el Club se retiró en la V5.77 y ya no se lee aquí. */
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

  // Tyrian «rumbo a subasta»: galardonado Tyrian sin oferta abierta ni contrato.
  const conOfertaAbierta = new Set(offers.filter((o) => o.status === "emitida").map((o) => o.lotId));
  const conContrato = new Set(contracts.map((c) => c.lotId));
  const rumboASubasta = lots.filter(
    (l) => l.stage === 8 && l.grade === "Tyrian" && !conOfertaAbierta.has(l.id) && !conContrato.has(l.id)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
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
            {contracts.map((c) => {
              const oferta = ofertaDeContrato.get(c.id);
              const sim =
                c.quantityFrozenKg != null && c.pricePerKgLocked != null
                  ? simularTrato({ declaradoKg: c.quantityFrozenKg, copKg: c.pricePerKgLocked, declaracion: c.declaracion ?? "trimestre", grado: c.grade?.toLowerCase() })
                  : null;
              return (
                <div className={styles.fincarow} key={c.id} style={{ marginTop: 10 }}>
                  <h5>
                    <CtcRef id={c.lotId} /> · {c.lotName}{" "}
                    {c.grade && <b style={{ color: GRADES[c.grade] }}>· {c.grade}</b>}
                  </h5>
                  <div className={styles.sub}>
                    Estado: <b>{CONTRACT_STATUS_LABEL[c.status]}</b>
                    {oferta?.seasonLabel && <> · Temporada de venta: <b>{oferta.seasonLabel}</b></>}
                    {c.quantityFrozenKg != null && <> · Declarado: <b>{c.quantityFrozenKg} kg de CPS</b>{c.declaracion && <> ({c.declaracion === "trimestre" ? "trimestre" : "30 días"})</>}</>}
                    {c.pricePerKgLocked != null && <> · Precio: <b>{formatCop(c.pricePerKgLocked)}/kg</b>{c.referencePriceSource && <> ({c.referencePriceSource})</>}</>}
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
                  <div className={styles.track} aria-label="Progreso del trato">
                    {[1, 2, 3].map((m) => (
                      <i key={m} className={c.releases.find((r) => r.month === m)?.releasedAt ? styles.on : ""} />
                    ))}
                  </div>
                  {c.releases.length > 0 && (
                    <div className={styles.alist} style={{ marginTop: 4 }}>
                      {c.releases.map((r) => (
                        <span key={r.month}>
                          Mes {r.month}: {r.releasedKg != null ? `liberó ${r.releasedKg} kg` : "pendiente"}
                          {r.shippedAt ? " · enviado" : ""}
                          {r.month < 3 ? " · " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.humidity.length > 0 && (
                    <div className={styles.alist} style={{ marginTop: 6 }}>
                      Humedad: {c.humidity.map((h) => `mes ${h.month}: ${h.pct.toFixed(1)}%${h.flagged ? " ⚠" : " ✓"}`).join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
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
