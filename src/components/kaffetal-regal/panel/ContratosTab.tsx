"use client";

import { useState } from "react";
import Image from "next/image";
import { CONTRACT_STATUS_LABEL, GRADES, type GeneralInfo, type Lot, type ProducerContract, type ProducerOffer } from "../data";
import { respondToOffer } from "@/lib/ofertas/producerActions";
import { formatCop } from "@/lib/arena/inscriptions";
import { useToast } from "@/components/Toast";
import { CtcRef } from "./CtcRef";
import styles from "../AppDashboard.module.css";

// ── Contratos y Compras (V5.18: las cuatro secciones) ───────────────────────
// El circuito comercial del galardón, lado productor (mockups del owner):
//   1. OFERTAS DE TEMPORADA — lotes galardonados Red o superior, de esta
//      temporada o la pasada; CTCx confirma el trato y el productor DECIDE.
//      Aceptar CREA el contrato (pendiente de la firma de CTC).
//   2. CONTRATOS DE TEMPORADA — los aceptados: el seguimiento mes a mes de la
//      escalera de liberación mientras la ventana de venta está abierta. Un
//      lote de la temporada pasada se posiciona, pero SE VE como tal.
//   3. OFERTAS BLACK — la consideración de compra directa de CTCx sobre los
//      lotes Black. (Para grados superiores considerados en compra directa,
//      CTC contacta al productor fuera de la app.)
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
  gi: GeneralInfo;
  contracts: ProducerContract[];
  offers: ProducerOffer[];
  lots: Lot[];
  onRefreshData: () => void;
  onGoEvaluaciones: () => void;
}) {
  const isClubMember = !!gi.clubMemberSince;
  const abiertas = (kind: ProducerOffer["kind"]) => offers.filter((o) => o.kind === kind && o.status === "emitida");
  const historial = (kind: ProducerOffer["kind"]) =>
    offers.filter((o) => o.kind === kind && (o.status === "rechazada" || o.status === "retirada" || o.status === "expirada"));
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
          pasada</b>. CTC le presenta su oferta en firme — referencia la combinación de Grado, Puntaje, Variedad y
          Proceso — y <b>usted decide</b>: aceptar crea el contrato con CTC; rechazar la cierra sin compromiso.
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
        <div className={styles.secSub}>Contratos aceptados por usted — el seguimiento mes a mes de la ventana de venta</div>
        {!isClubMember && contracts.length === 0 && (
          <div className={styles.alist} style={{ marginTop: 8 }}>
            Sus contratos con CTC vivirán aquí. El camino: complete la ficha de un lote, solicite su evaluación en{" "}
            <button
              type="button"
              onClick={onGoEvaluaciones}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--green)", fontWeight: 700, font: "inherit" }}
            >
              Evaluar mi Café →
            </button>{" "}
            y, con el galardón, llegan su <b>Pasaporte del Kaffetal Club</b> y las ofertas de compra de CTC.
          </div>
        )}
        {isClubMember && (
          <div className={styles.alist} style={{ marginTop: 6 }}>
            Pasaporte del Kaffetal Club activo desde {new Date(gi.clubMemberSince!).toLocaleDateString("es-CO")}.
          </div>
        )}
        {contracts.length === 0 ? (
          isClubMember && (
            <div className={styles.alist} style={{ marginTop: 8 }}>Sin contratos todavía — nacen al aceptar una oferta.</div>
          )
        ) : (
          <div style={{ marginTop: 10 }}>
            {contracts.map((c) => {
              const oferta = ofertaDeContrato.get(c.id);
              return (
                <div className={styles.fincarow} key={c.id} style={{ marginTop: 10 }}>
                  <h5>
                    <CtcRef id={c.lotId} /> · {c.lotName}{" "}
                    {c.grade && <b style={{ color: GRADES[c.grade] }}>· {c.grade}</b>}
                  </h5>
                  <div className={styles.sub}>
                    Estado: <b>{CONTRACT_STATUS_LABEL[c.status]}</b>
                    {oferta?.seasonLabel && <> · Temporada de venta: <b>{oferta.seasonLabel}</b></>}
                    {c.quantityFrozenKg != null && <> · Congelado: <b>{c.quantityFrozenKg} kg pergamino</b></>}
                    {c.pricePerKgLocked != null && <> · Precio: <b>${c.pricePerKgLocked}/kg</b></>}
                  </div>
                  {oferta?.loteDeTemporadaPasada && (
                    <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700 }}>
                      Lote de la temporada pasada — posicionado en la ventana de esta temporada, y valorado como tal.
                    </div>
                  )}
                  {c.status === "pending_signature" && (
                    <div className={styles.sub}>CTC está preparando la firma — el precio y la cantidad se congelan al firmar.</div>
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

// La tarjeta de una oferta abierta: los snapshots congelados + la decisión.
// Botones abajo a la derecha, apilados — la regla de la casa.
function OfferCard({ offer, onRefreshData }: { offer: ProducerOffer; onRefreshData: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState("");
  const color = offer.grade ? GRADES[offer.grade] : "var(--line)";

  async function responder(respuesta: "aceptar" | "rechazar") {
    if (respuesta === "aceptar") {
      const ok = window.confirm(
        `¿Aceptar la oferta de CTC por ${offer.lotName}?\n\n` +
          `${formatCop(offer.pricePerKg)}/kg${offer.quantityKg ? ` · ${offer.quantityKg} kg` : ""} · Grado ${offer.grade ?? "—"}.\n` +
          "Al aceptar se crea su contrato con CTC (pendiente de firma)."
      );
      if (!ok) return;
    }
    setBusy(true);
    const res = await respondToOffer(offer.id, respuesta, respuesta === "rechazar" ? nota : undefined);
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
            Oferta de CTC: <b>{formatCop(offer.pricePerKg)}/kg</b>
            {offer.quantityKg != null && <> · <b>{offer.quantityKg} kg</b></>}
          </div>
          {offer.notes && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{offer.notes}</div>}

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
                <button className="btn btn-sm btn-solid-accent" disabled={busy} onClick={() => responder("aceptar")}>
                  {busy ? "Enviando…" : "Aceptar oferta"}
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
