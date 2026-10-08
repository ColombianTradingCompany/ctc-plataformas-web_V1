"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CONTRACT_STATUS_LABEL, GRADES, ctcLotReference, type DespachoDelTrato, type GeneralInfo, type Lot, type ProducerContract, type ProducerOffer } from "../data";
import { aceptarProvisionalmente, previsualizarOferta, registrarExistencia, respondToOffer, type VistaPreviaDeOferta } from "@/lib/ofertas/producerActions";
import { cancelarPorDespacho, pasarALaVentanaSiguiente, pedirProrroga, previsualizarRetiro, registrarDespacho, retirarDelTrato } from "@/lib/trato/producerActions";
import { formatCop } from "@/lib/arena/inscriptions";
import { BACHES_DE_DESPACHO, CARGA_KG, LUGAR_DE_ENTREGA_POR_DEFECTO, MORA, PENALIDAD_RETIRO_PCT, PAGO_AL_DESPACHO_PCT } from "@/lib/trato/terminos";
import { fechaLarga } from "@/lib/trato/modalidades";
import { fechaParaElProductor } from "@/lib/trato/fechas";
import { fletePorKg, REGION_DE_FLETE_LABEL } from "@/lib/trato/flete";
import { MORA_LABEL, mesesDelTrato } from "@/lib/trato/mesAMes";
import { CalculadoraDelTrato, type DecisionDelTrato } from "./CalculadoraDelTrato";
import { FirmaDelContrato, type FirmaDelProductor } from "./FirmaDelContrato";
import { PropuestaSelection } from "./PropuestaSelection";
import { GlosarioDelTrato } from "./GlosarioDelTrato";
import { RatificarContrato } from "./RatificarContrato";
import { useToast } from "@/components/Toast";
import { CtcRef } from "./CtcRef";
import styles from "../AppDashboard.module.css";

// ── Contratos y Compras (V5.18 · aceptar con claridad V5.83 · por VENTANAS de ciclos desde la V5.175) ─────────────────────────
// El circuito comercial del galardón, lado productor (docs/PLAN_CICLOS.md):
//   1. PARTICIPACIÓN EN CHERRY PICKED — la invitación de CTCx, anclada al PVC. La FECHA DE FIRMA decide la ventana (un ciclo con
//      25 % de retiro libre, o extendida al ciclo siguiente con 30 %), y la calculadora la enseña con la cuenta del servidor; el
//      productor declara cuánto deja disponible (≥ el mínimo, o hasta la mitad sin retiro si la existencia no alcanza) y firma
//      con el dedo. CTCx compra el SACO con la firma, FUERA de lo declarado.
//   2. COMPRAS DE CTCx SELECTION — una compra en firme a hasta el PVC − 8 %, que se negocia (no cambia).
//   3. CONTRATOS — «Mi trato»: la ventana, lo declarado, lo vendido semana a semana, lo retirado, lo que queda en la vitrina, los
//      despachos (saco, adelanto, vendido) con sus plazos, prórroga y pagos 60/40, y el retiro. Los tratos viejos por meses y las
//      compras de Selection se siguen viendo mes a mes.
//   4. OFERTAS BLACK y 5. SUBASTAS TYRIAN — sin cambios.
export function ContratosTab({
  gi,
  asistida = false,
  cuenta = "",
  contracts,
  offers,
  lots,
  onRefreshData,
  onGoEvaluaciones,
}: {
  /** V5.84: de aquí sale el estado de la cuenta (`producer_profiles.estado_cuenta`, lo escribe solo el owner). */
  gi: GeneralInfo;
  /** V5.190: la sesión la abrió CTCx desde el OCP: la invitación ofrece «Aceptar contrato provisionalmente». */
  asistida?: boolean;
  /** V5.190: el código del productor (CTC-P-…), que nombra al Productor en el texto provisional. */
  cuenta?: string;
  contracts: ProducerContract[];
  offers: ProducerOffer[];
  lots: Lot[];
  onRefreshData: () => void;
  onGoEvaluaciones: () => void;
}) {
  // V5.169: «Participación en Cherry Picked» (temporada · excepción) y «Compra CTCx Selection» (directa) van por separado.
  const esDeLaClase = (o: ProducerOffer, kind: ProducerOffer["kind"]) => (kind === "temporada" ? o.kind === "temporada" || o.kind === "excepcion" : o.kind === kind);
  const abiertas = (kind: ProducerOffer["kind"]) => offers.filter((o) => esDeLaClase(o, kind) && (o.status === "emitida" || o.status === "contraofertada"));
  const historial = (kind: ProducerOffer["kind"]) =>
    offers.filter((o) => esDeLaClase(o, kind) && (o.status === "rechazada" || o.status === "retirada" || o.status === "expirada"));
  // La oferta aceptada que dio origen a cada contrato: trae el encuadre de temporada congelado.
  const ofertaDeContrato = new Map(offers.filter((o) => o.contractId).map((o) => [o.contractId!, o]));
  const cuentaCongelada = gi.estadoCuenta === "congelada";

  // Tyrian «rumbo a subasta»: galardonado Tyrian sin oferta abierta ni contrato.
  const conOfertaAbierta = new Set(offers.filter((o) => o.status === "emitida" || o.status === "contraofertada").map((o) => o.lotId));
  const conContrato = new Set(contracts.map((c) => c.lotId));
  const rumboASubasta = lots.filter((l) => l.stage === 8 && l.grade === "Tyrian" && !conOfertaAbierta.has(l.id) && !conContrato.has(l.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
      {cuentaCongelada && (
        <div className={styles.alist} style={{ border: "1.5px solid var(--accent)", borderRadius: 10, padding: "10px 14px", background: "var(--paper)", lineHeight: 1.6 }}>
          <b>Su cuenta está congelada por ruptura contractual.</b>
          {gi.estadoCuentaMotivo && <> Motivo: {gi.estadoCuentaMotivo}.</>} Mientras esté congelada no puede aceptar ofertas ni retirar de sus
          tratos. Si hubo una causa legítima, escríbale a CTCx: la reactivación la decide CTCx.
        </div>
      )}

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Participación en Cherry Picked</span>
        </div>
        <div className={styles.secSub}>CTCx le invita a vender su café en Cherry Picked, por ventanas de ciclos</div>
        <div className={styles.alist} style={{ marginTop: 8 }}>
          <b>Cherry Picked</b> es la vitrina de CTCx donde su café se ofrece a compradores con su nombre y su finca, mientras sigue en su finca.{" "}
          La fecha en que firma decide su <b>ventana</b>: si firma en la semana 1 de un ciclo, vende ese ciclo; si firma después, la ventana se extiende
          al ciclo siguiente (para que sus muestras viajen en el flete). Usted decide <b>cuánto deja disponible</b> y juega con el escenario de
          ventas: <b>CTCx no se compromete a comprar cantidades fijas</b>. Con la firma, CTCx le compra un saco fuera de lo declarado. Aceptar es
          firmar el contrato con el dedo.
        </div>
        <OfferList offers={abiertas("temporada")} historial={historial("temporada")} vacio="Sin invitaciones abiertas. Cuando un lote suyo salga galardonado Red o superior, la invitación de CTCx aparecerá aquí." onRefreshData={onRefreshData} asistida={asistida} cuenta={cuenta} />
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Compras de CTCx Selection</span>
        </div>
        <div className={styles.secSub}>Propuestas de CTCx para comprar su lote, o una parte, ahora</div>
        <div className={styles.alist} style={{ marginTop: 8 }}>
          Una propuesta de compra en firme a <b>hasta el PVC − 8 %</b> (no es el PVC). Puede aceptarla y firmar, contraofertar las veces que quiera, o
          desistir.
        </div>
        <OfferList offers={abiertas("directa")} historial={historial("directa")} vacio="Sin propuestas de compra abiertas." onRefreshData={onRefreshData} />
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Contratos</span>
        </div>
        <div className={styles.secSub}>Mi trato: su ventana, lo vendido semana a semana, sus despachos y su retiro</div>
        {contracts.length === 0 ? (
          <div className={styles.alist} style={{ marginTop: 8 }}>
            Sus contratos con CTCx vivirán aquí. El camino: complete la ficha de un lote, solicite su evaluación en{" "}
            <button type="button" onClick={onGoEvaluaciones} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--green)", fontWeight: 700, font: "inherit" }}>
              Evaluar mi Café →
            </button>{" "}
            y, con el galardón, llegan las invitaciones de CTCx. Un contrato nace cuando usted acepta una.
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {contracts.map((c) =>
              c.ventanaTipo ? (
                <ContratoPorVentana key={c.id} contract={c} cuentaCongelada={cuentaCongelada} onRefreshData={onRefreshData} asistida={asistida} />
              ) : (
                <ContratoPorMeses key={c.id} contract={c} oferta={ofertaDeContrato.get(c.id)} />
              )
            )}
          </div>
        )}
      </section>

      <section>
        <div className={styles.secHead}>
          <span className={styles.secTitle}>Ofertas Black</span>
        </div>
        <div className={styles.secSub}>Ofertas enviadas por CTCx sobre los lotes evaluados «Black»</div>
        <div className={styles.alist} style={{ marginTop: 8 }}>
          Un lote <b>Black</b> puede entrar en consideración de <b>compra directa</b>: CTCx lo negocia y, si decide comprar, la oferta le llega aquí.
          (Para grados superiores considerados en compra directa, CTCx lo contacta directamente, fuera de la plataforma.)
        </div>
        <OfferList offers={abiertas("black")} historial={historial("black")} vacio="Sin ofertas Black por ahora." onRefreshData={onRefreshData} />
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
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "3px 0" }}>
                  <CtcRef id={l.id} />
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <b style={{ color: GRADES.Tyrian }}>Grado Tyrian</b> — rumbo a subasta. CTCx corre la puja y el <b>mejor postor</b> le llegará aquí
                  como oferta: usted decide si vende.
                </div>
              </div>
            ))}
          </div>
        )}
        <OfferList offers={abiertas("subasta")} historial={historial("subasta")} vacio={rumboASubasta.length ? "" : "Sin lotes Tyrian por ahora — es la rareza más alta de la escala."} onRefreshData={onRefreshData} />
      </section>
    </div>
  );
}

// V5.188 (feedback de revisión: «"4/1/2027" se lee 4 de enero o 1 de abril»): toda fecha con su mes en letras, y los instantes en la
// hora de Colombia («3 de enero de 2027»).
const fecha = (iso: string | null) => fechaParaElProductor(iso);
const kgTxt = (n: number) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} kg`;
const td: React.CSSProperties = { textAlign: "right", padding: "3px 4px", whiteSpace: "nowrap" };
const caja: React.CSSProperties = { marginTop: 8, border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--card)" };
const inputCss: React.CSSProperties = { padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" };

const DESPACHO_LABEL: Record<DespachoDelTrato["tipo"], string> = { saco: "Saco de la firma", adelanto: "Compra adelantada", vendido: "Lo vendido" };
const ESTADO_DESPACHO: Record<DespachoDelTrato["estado"], string> = { pendiente: "Por despachar", despachado: "Despachado", recibido: "Recibido", cancelado: "Cancelado", movido: "Pasado a otra ventana" };

// «Mi trato» por ventana (V5.175): la ventana, la cuenta (declarado · vendido · retirado · en la vitrina · retiro libre que queda),
// las ventas confirmadas semana a semana, los despachos con sus acciones, y el retiro.
function ContratoPorVentana({ contract: c, cuentaCongelada, onRefreshData, asistida = false }: { contract: ProducerContract; cuentaCongelada: boolean; onRefreshData: () => void; asistida?: boolean }) {
  const k = c.cuenta;
  const vigente = c.status === "active" || c.status === "pending_signature";
  const [ratificando, setRatificando] = useState(false);
  const porRatificar = Boolean(c.provisionalAt) && !c.ratificadoAt && vigente;
  return (
    <div className={styles.fincarow} style={{ marginTop: 10 }}>
      <h5>
        <CtcRef id={c.lotId} /> · {c.lotName} {c.grade && <b style={{ color: GRADES[c.grade] }}>· {c.grade}</b>}
      </h5>
      {/* V5.190 (owner): un contrato que CTCx aceptó PROVISIONALMENTE en una sesión asistida: vigente, y el productor lo ratifica. */}
      {porRatificar && (
        <div style={{ margin: "6px 0 8px", border: "1.5px solid #E8A317", background: "#FFF4DC", color: "#3A2C00", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.55 }}>
          <b>Contrato provisional.</b> CTCx lo aceptó el {fecha(c.provisionalAt)} en una sesión asistida, en su favor y como parte del grupo de
          Pioneros{c.provisionalResponsable ? <> (responsable de CTCx: <b>{c.provisionalResponsable}</b>)</> : null}. Ya está vigente. Revíselo y
          ratifíquelo con su firma: al ratificar puede ajustar la cantidad declarada; el precio, la ventana y lo demás no cambian. Ningún cambio
          será unilateral.
          {asistida ? (
            <div style={{ marginTop: 6, fontWeight: 700 }}>La ratificación la hace el Productor desde su propia cuenta, no en esta sesión asistida.</div>
          ) : !ratificando ? (
            <div style={{ marginTop: 8, textAlign: "right" }}>
              <button type="button" className="btn btn-sm btn-solid-accent" onClick={() => setRatificando(true)}>
                Ratificar y firmar
              </button>
            </div>
          ) : null}
          {ratificando && !asistida && (
            <RatificarContrato
              contractId={c.id}
              onCancelar={() => setRatificando(false)}
              onListo={() => {
                setRatificando(false);
                onRefreshData();
              }}
            />
          )}
        </div>
      )}
      {c.provisionalAt && c.ratificadoAt && (
        <div className={styles.sub} style={{ marginBottom: 4 }}>
          Ratificado y firmado por usted el {fecha(c.ratificadoAt)} (CTCx lo había aceptado provisionalmente el {fecha(c.provisionalAt)}).
        </div>
      )}
      <div className={styles.sub}>
        Estado: <b>{CONTRACT_STATUS_LABEL[c.status]}</b>
        {c.vigenciaDesde && c.vigenciaHasta && (
          <>
            {" "}· Ventana: <b>{fechaLarga(c.vigenciaDesde)} → {fechaLarga(c.vigenciaHasta)}</b> ({c.ventanaTipo === "extendida" ? "extendida" : "un ciclo"}
            {c.ventanaCiclos.length ? ` · ${c.ventanaCiclos.join(" y ")}` : ""})
          </>
        )}
        {c.pricePerKgLocked != null && <> · Precio: <b>{formatCop(c.pricePerKgLocked)}/kg</b></>}
        {c.signedAt && <> · Firmado por CTCx el {fecha(c.signedAt)}</>}
      </div>
      <div className={styles.alist} style={{ marginTop: 4 }}>
        {c.sinRetiro ? (
          <>Declaración reducida (la existencia no alcanzaba el mínimo de {c.minimoKg} kg): <b>sin retiro libre</b>.</>
        ) : (
          <>Retiro libre hasta el <b>{c.retiroLibrePct ?? 0} %</b> de lo declarado, solo de lo no vendido; por encima, {PENALIDAD_RETIRO_PCT} % por carga.</>
        )}{" "}
        CTCx paga el {PAGO_AL_DESPACHO_PCT} % de cada envío con el tiquete de despacho y el resto al recibirlo, comprobada la humedad y la actividad de agua.
        {c.termsVersion && <> · términos {c.termsVersion}</>}
      </div>
      {c.status === "pending_signature" && <div className={styles.sub}>Usted ya firmó: falta la firma de CTCx para que el trato quede vigente. Su saco sale igual al cierre de esta semana.</div>}
      {c.producerSignedAt && (
        <a className="btn btn-sm" href={`/kaffetal-regal/contrato/${c.id}`} target="_blank" rel="noopener noreferrer" style={{ justifySelf: "start", marginTop: 6 }}>
          Ver mi contrato firmado
        </a>
      )}
      {c.status === "ruptura" && <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700 }}>Ruptura contractual declarada por CTCx. Su cuenta quedó congelada; si hubo causa legítima, escríbale a CTCx.</div>}
      {c.status === "cancelled" && <div className={styles.sub} style={{ fontWeight: 700 }}>Contrato cancelado.</div>}

      {k && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 6, marginTop: 8 }}>
          {[
            ["Declarado", kgTxt(k.declaradoKg)],
            ["Vendido a CTCx", kgTxt(k.vendidoKg)],
            ["Retirado", kgTxt(k.retiradoKg)],
            ["En la vitrina", kgTxt(k.disponibleKg)],
            ["Retiro libre que queda", k.sinRetiro ? "—" : kgTxt(k.libreRestanteKg)],
          ].map(([t, v]) => (
            <div key={t} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", background: "var(--paper)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t}</div>
              <b style={{ fontSize: 14 }}>{v}</b>
            </div>
          ))}
        </div>
      )}

      {c.ventas.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
          <thead>
            <tr style={{ color: "var(--muted)" }}>
              <th style={{ textAlign: "left", padding: "3px 4px" }}>Semana</th>
              <th style={td}>Vendido</th>
              <th style={td}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {c.ventas.map((v) => (
              <tr key={v.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "3px 4px" }}>Semana del {fecha(v.semana)}</td>
                <td style={td}>{kgTxt(v.kg)}</td>
                <td style={td}>{formatCop(v.totalCop)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* V5.186 (owner): el bache abierto de lo vendido, con su plazo, a la vista (V5.183: lo vendido sale por baches). */}
      <BacheAbierto contract={c} contratoVigente={vigente} onRefreshData={onRefreshData} />

      {c.despachos.some((d) => !esBacheAbierto(d)) && (
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {c.despachos
            .filter((d) => !esBacheAbierto(d))
            .map((d) => (
              <DespachoItem key={d.id} d={d} contratoVigente={vigente} onRefreshData={onRefreshData} />
            ))}
        </div>
      )}

      {c.status === "active" && k && k.disponibleKg > 0 && c.pricePerKgLocked != null &&
        (cuentaCongelada ? <div className={styles.sub} style={{ marginTop: 6 }}>Con la cuenta congelada no se puede retirar de este trato.</div> : <RetiroForm contract={c} onRefreshData={onRefreshData} />)}
    </div>
  );
}

// ── V5.186 · el bache abierto (owner: «muestra el bache abierto con su plazo en "Mi trato"») ───────────────────────────────────
// Lo vendido sale por baches que decide el productor (V5.183): cada venta confirmada se suma al bache abierto —el despacho «vendido»
// pendiente— hasta que el productor lo despacha; tiene plazo al cierre de la 5.ª semana desde su primera venta. Aquí se ve qué lleva,
// cuánto vale, cuánto falta para el plazo y cuánto le pagan al despachar; el registro del tiquete es el de siempre (DespachoItem).
const esBacheAbierto = (d: DespachoDelTrato) => d.tipo === "vendido" && d.estado === "pendiente";

function diasHasta(iso: string): number {
  const fin = new Date(`${iso}T23:59:59-05:00`).getTime();
  return Math.ceil((fin - Date.now()) / 86_400_000) - 1;
}

function BacheAbierto({ contract: c, contratoVigente, onRefreshData }: { contract: ProducerContract; contratoVigente: boolean; onRefreshData: () => void }) {
  if (c.ventanaTipo == null) return null;
  const abiertos = c.despachos.filter(esBacheAbierto).sort((a, b) => (a.prorrogaHasta ?? a.plazo).localeCompare(b.prorrogaHasta ?? b.plazo));
  if (!abiertos.length) {
    if (c.status !== "active") return null;
    return (
      <div className={styles.sub} style={{ marginTop: 8 }}>
        📦 No hay un bache abierto: se abre con la próxima venta que CTCx le confirme y usted lo despacha cuando le convenga (se recomienda cada{" "}
        {BACHES_DE_DESPACHO.recomendadas.join(" o ")} semanas; a más tardar {BACHES_DE_DESPACHO.maxSemanas} semanas después de su primera venta).
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
      {abiertos.map((d) => {
        const plazo = d.prorrogaHasta ?? d.plazo;
        const dias = diasHasta(plazo);
        const ventas = c.ventas.filter((v) => v.despachoId === d.id);
        const color = dias < 0 ? "var(--red)" : dias <= 7 ? "var(--accent)" : "var(--green)";
        const pago60 = Math.round((d.totalCop * PAGO_AL_DESPACHO_PCT) / 100);
        return (
          <div key={d.id} style={{ border: `1.5px solid ${color}`, borderRadius: 10, padding: "10px 12px", background: "var(--paper)", display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
              <b style={{ fontSize: 14 }}>📦 Bache abierto · {kgTxt(d.kg)} vendidos · {formatCop(d.totalCop)}</b>
              <span style={{ fontSize: 12.5, fontWeight: 700, color }}>
                {dias < 0 ? `El plazo venció hace ${-dias} ${dias === -1 ? "día" : "días"}` : dias === 0 ? "El plazo vence hoy" : `Faltan ${dias} ${dias === 1 ? "día" : "días"}`}
              </span>
            </div>
            <div style={{ fontSize: 12.5 }}>
              Despáchelo cuando le convenga y <b>a más tardar el {fecha(plazo)}</b>
              {d.prorrogaHasta ? <> (con la prórroga; el plazo era el {fecha(d.plazo)})</> : null}. Se recomienda despachar cada {BACHES_DE_DESPACHO.recomendadas.join(" o ")} semanas;
              lo que CTCx le confirme mientras tanto se suma a este bache.
            </div>
            {ventas.length > 0 && (
              <div className={styles.sub}>
                Lleva {ventas.length === 1 ? "la venta" : `${ventas.length} ventas`} de {ventas.map((v) => `la semana del ${fecha(v.semana)} (${kgTxt(v.kg)})`).join(", ")}.
              </div>
            )}
            <div className={styles.sub}>
              Al registrar el tiquete recibe el {PAGO_AL_DESPACHO_PCT} %: <b>{formatCop(pago60)}</b>; el {100 - PAGO_AL_DESPACHO_PCT} % ({formatCop(d.totalCop - pago60)}) al recibirlo CTCx con la
              humedad y la actividad de agua en rango.
            </div>
            <DespachoItem d={d} contratoVigente={contratoVigente} onRefreshData={onRefreshData} />
          </div>
        );
      })}
    </div>
  );
}

// Un despacho: qué es, cuánto, para cuándo, su estado y sus pagos; si está pendiente, registrarlo o resolver que no salió.
function DespachoItem({ d, contratoVigente, onRefreshData }: { d: DespachoDelTrato; contratoVigente: boolean; onRefreshData: () => void }) {
  const { showToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [guia, setGuia] = useState("");
  const [peso, setPeso] = useState(String(d.kg));
  const [foto, setFoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const plazo = d.prorrogaHasta ?? d.plazo;

  async function correr(accion: () => Promise<{ ok: true } | { ok: false; message: string }>, ok: string, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    setBusy(true);
    const r = await accion();
    setBusy(false);
    if (r.ok) {
      showToast(ok);
      setAbierto(false);
      onRefreshData();
    } else showToast(r.message);
  }

  async function elegirFoto(file: File | undefined) {
    if (!file) return setFoto(null);
    // Se reduce a 1600 px en el navegador (JPEG): la guía y el bulto se leen igual y pesa poco.
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      lienzo.getContext("2d")?.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      setFoto(lienzo.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "var(--paper)", fontSize: 12.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span>
          <b>{DESPACHO_LABEL[d.tipo]}</b> · {kgTxt(d.kg)} · {formatCop(d.totalCop)}
        </span>
        <span style={{ color: d.estado === "pendiente" ? "var(--accent)" : "var(--muted)", fontWeight: 700 }}>
          {ESTADO_DESPACHO[d.estado]}
          {d.estado === "pendiente" && <> · sale a más tardar el {fechaLarga(plazo)}</>}
          {d.prorrogaHasta && d.estado === "pendiente" && <> (con prórroga)</>}
        </span>
      </div>
      {(d.guia || d.pagoDespachoAt || d.recibidoAt) && (
        <div style={{ color: "var(--muted)", marginTop: 3 }}>
          {d.guia && <>Guía {d.guia}{d.pesoKg != null && <> · {kgTxt(d.pesoKg)}</>} · </>}
          {d.pagoDespachoAt && <>pagado el {PAGO_AL_DESPACHO_PCT} % ({formatCop(d.pagoDespachoCop ?? 0)}) · </>}
          {d.recibidoAt && <>recibido el {fecha(d.recibidoAt)}{d.humedadPct != null && <> · humedad {d.humedadPct} %</>}{d.aw != null && <> · aw {d.aw}</>} · </>}
          {d.pagoRecepcionAt && <>pagado el resto ({formatCop(d.pagoRecepcionCop ?? 0)})</>}
        </div>
      )}
      {d.advertencias > 0 && <div style={{ color: "var(--accent)", marginTop: 3 }}>Advertencias: {d.advertencias}</div>}
      {d.estado === "pendiente" && contratoVigente && (
        <>
          {!abierto ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn btn-sm btn-solid-accent" type="button" disabled={busy} onClick={() => setAbierto(true)}>
                Registrar el despacho…
              </button>
              {/* V5.186: una sola prórroga por despacho; ya concedida, el botón no se ofrece (el servidor la rechazaría). */}
              {!d.prorrogaHasta && (
                <button className="btn btn-sm" type="button" disabled={busy} onClick={() => correr(() => pedirProrroga(d.id), "Prórroga registrada ✓ (queda como advertencia)", "¿Pedir una prórroga de una semana? Queda como advertencia en su cuenta.")}>
                  Pedir prórroga
                </button>
              )}
              {d.tipo !== "vendido" && (
                <>
                  <button className="btn btn-sm" type="button" disabled={busy} onClick={() => correr(() => pasarALaVentanaSiguiente(d.id), "Contrato pasado a la ventana siguiente ✓", "¿Pasar el contrato a la ventana siguiente? El saco sale a más tardar al cierre de su semana 1.")}>
                    Pasar a la ventana siguiente
                  </button>
                  <button className="btn btn-sm" type="button" disabled={busy} onClick={() => correr(() => cancelarPorDespacho(d.id), "Contrato cancelado", "¿Cancelar el contrato porque el saco no puede salir?")}>
                    Cancelar el contrato
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input placeholder="N.º de guía o tiquete" value={guia} onChange={(e) => setGuia(e.target.value)} style={{ ...inputCss, flex: "1 1 180px" }} />
                <label>
                  Peso{" "}
                  <input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} style={{ ...inputCss, width: 80 }} /> kg
                </label>
                <label style={{ fontSize: 12 }}>
                  Foto (opcional) <input type="file" accept="image/*" onChange={(e) => elegirFoto(e.target.files?.[0])} />
                </label>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="btn btn-sm btn-solid-accent" type="button" disabled={busy} onClick={() => correr(() => registrarDespacho(d.id, { guia, pesoKg: Number(peso.replace(",", ".")), fotoDataUrl: foto }), "Despacho registrado ✓ · CTCx confirma y paga el 60 %")}>
                  {busy ? "Registrando…" : "Registrar"}
                </button>
                <button className="btn btn-sm" type="button" disabled={busy} onClick={() => setAbierto(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// El retiro (V5.175): solo de lo no vendido; el productor escribe los kilos, VE la cuenta que hará el servidor y confirma.
function RetiroForm({ contract, onRefreshData }: { contract: ProducerContract; onRefreshData: () => void }) {
  const { showToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [kg, setKg] = useState("");
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [vista, setVista] = useState<{ libreKg: number; penalizadoKg: number; penalidadCop: number; quedaKg: number } | null>(null);
  const disponible = contract.cuenta?.disponibleKg ?? 0;
  const n = Number(String(kg).replace(",", "."));
  const valido = Number.isFinite(n) && n > 0 && n <= disponible + 1e-9;

  async function calcular() {
    if (!valido) return;
    setBusy(true);
    const r = await previsualizarRetiro(contract.id, n);
    setBusy(false);
    if (r.ok) setVista(r.retiro);
    else showToast(r.message);
  }

  async function confirmar() {
    if (!vista) return;
    if (!window.confirm(`¿Retirar ${n} kg de su ventana por ${contract.lotName}?\n\n${vista.libreKg} kg libres · ${vista.penalizadoKg} kg con penalidad: penalidad total a pagar ${formatCop(vista.penalidadCop)}.\nQuedarán ${vista.quedaKg} kg en la vitrina.`)) return;
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
    } else showToast(r.message);
  }

  if (!abierto)
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn btn-sm" type="button" onClick={() => setAbierto(true)}>
          Retirar kilos de lo no vendido…
        </button>
      </div>
    );
  return (
    <div style={caja}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Retirar de lo no vendido</div>
      <div className={styles.sub} style={{ marginBottom: 6 }}>
        Quedan {kgTxt(disponible)} en la vitrina{contract.cuenta && !contract.cuenta.sinRetiro && <> · retiro libre que queda: <b>{kgTxt(contract.cuenta.libreRestanteKg)}</b></>}. Lo que pase del retiro libre
        paga el {PENALIDAD_RETIRO_PCT} % del precio de cada carga.
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
            style={{ ...inputCss, width: 90 }}
          />{" "}
          kg
        </label>
        <input placeholder="Motivo (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} style={{ ...inputCss, flex: 1, minWidth: 160 }} />
      </div>
      {kg && !valido && <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>Escriba entre 0 y {disponible} kg.</div>}
      {vista && (
        <div className={styles.alist} style={{ marginTop: 6 }}>
          <b>{vista.libreKg} kg</b> libres · <b>{vista.penalizadoKg} kg</b> con penalidad · penalidad total a pagar: <b>{formatCop(vista.penalidadCop)}</b> · quedan {vista.quedaKg} kg en la vitrina
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
        <button className="btn btn-sm" type="button" disabled={busy} onClick={() => { setAbierto(false); setVista(null); }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Un trato viejo por meses o una compra de CTCx Selection (que sigue pagándose por mes): solo lectura, como antes.
function ContratoPorMeses({ contract: c, oferta }: { contract: ProducerContract; oferta: ProducerOffer | undefined }) {
  const nMeses = mesesDelTrato(c.freezeMonths);
  const enCurso = c.status === "active" || c.status === "reconditioning";
  return (
    <div className={styles.fincarow} style={{ marginTop: 10 }}>
      <h5>
        <CtcRef id={c.lotId} /> · {c.lotName} {c.grade && <b style={{ color: GRADES[c.grade] }}>· {c.grade}</b>}
      </h5>
      <div className={styles.sub}>
        Estado: <b>{CONTRACT_STATUS_LABEL[c.status]}</b>
        {oferta?.kind === "directa" && <> · Compra de CTCx Selection</>}
        {c.quantityFrozenKg != null && <> · {kgTxt(c.quantityFrozenKg)} de CPS</>}
        {c.pricePerKgLocked != null && <> · Precio: <b>{formatCop(c.pricePerKgLocked)}/kg</b></>}
        {c.signedAt && <> · Firmado el {fecha(c.signedAt)}</>}
      </div>
      {c.status === "pending_signature" && <div className={styles.sub}>{c.producerSignedAt ? "Usted ya firmó: falta la firma de CTCx." : "CTCx está preparando la firma."}</div>}
      {c.producerSignedAt && (
        <a className="btn btn-sm" href={`/kaffetal-regal/contrato/${c.id}`} target="_blank" rel="noopener noreferrer" style={{ justifySelf: "start", marginTop: 6 }}>
          Ver mi contrato firmado
        </a>
      )}
      {c.status !== "pending_signature" && c.months.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 6 }}>
          <thead>
            <tr style={{ color: "var(--muted)" }}>
              <th style={{ textAlign: "left", padding: "3px 4px" }}>Mes</th>
              <th style={td}>CTCx pidió</th>
              <th style={td}>Usted envió</th>
              <th style={td}>CTCx pagó</th>
              <th style={{ textAlign: "left", padding: "3px 4px" }}>Situación</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: nMeses }, (_, i) => i + 1).map((mes) => {
              const m = c.months.find((x) => x.mes === mes);
              return (
                <tr key={mes} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "3px 4px" }}>Mes {mes}</td>
                  <td style={td}>{m?.pedidoKg != null ? kgTxt(m.pedidoKg) : "—"}</td>
                  <td style={td}>{m?.enviadoKg != null ? kgTxt(m.enviadoKg) : "—"}</td>
                  <td style={td}>{m?.pagadoCop != null ? formatCop(m.pagadoCop) : "—"}</td>
                  <td style={{ padding: "3px 4px", color: "var(--muted)" }}>{m ? MORA_LABEL[m.mora] : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {enCurso && (
        <div className={styles.sub} style={{ marginTop: 4 }}>
          Si un pedido no se envía: {MORA.semanasSinCargo} semanas sin cargo, {MORA.semanasConRecargo} más con {MORA.recargoPct} %; después, ruptura contractual (la declara CTCx).
        </div>
      )}
    </div>
  );
}

function OfferList({ offers, historial, vacio, onRefreshData, asistida = false, cuenta = "" }: { offers: ProducerOffer[]; historial: ProducerOffer[]; vacio: string; onRefreshData: () => void; asistida?: boolean; cuenta?: string }) {
  return (
    <>
      {offers.length === 0 && vacio && <div className={styles.alist} style={{ marginTop: 10 }}>{vacio}</div>}
      {offers.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} onRefreshData={onRefreshData} asistida={asistida} cuenta={cuenta} />
          ))}
        </div>
      )}
      {historial.length > 0 && (
        <div className={styles.alist} style={{ marginTop: 10 }}>
          {historial.map((o) => (
            <span key={o.id}>
              {o.lotName} · oferta {o.status === "rechazada" ? "rechazada por usted" : o.status === "retirada" ? "retirada por CTCx" : "expirada"}
              {o.respondedAt && ` (${fechaParaElProductor(o.respondedAt)})`}
              <br />
            </span>
          ))}
        </div>
      )}
    </>
  );
}

const KIND_LABEL: Record<ProducerOffer["kind"], string> = {
  temporada: "Participación en Cherry Picked",
  directa: "Oferta directa · CTCx Selection",
  excepcion: "Participación en Cherry Picked (excepción)",
  black: "Oferta Black",
  subasta: "Mejor postor · subasta",
};

// La existencia del lote (A2), cuando falta para poder declarar: se registra aquí aunque la Ficha ya no se edite.
function ExistenciaForm({ lotId, onGuardada }: { lotId: string; onGuardada: () => void }) {
  const { showToast } = useToast();
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={caja}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>¿Cuánto café pergamino seco tiene este lote en total?</div>
      <div className={styles.sub} style={{ marginBottom: 6 }}>
        Con la existencia del lote se calcula lo que puede declarar en cada ventana (existencia − lo vendido − lo retirado). Queda en su Ficha (A2).
        Se necesita para firmar; mientras tanto, puede jugar con el escenario abajo.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="Ej. 1500" style={{ ...inputCss, width: 110 }} /> kg de CPS
        <button
          className="btn btn-sm btn-solid-accent"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await registrarExistencia(lotId, Number(kg.replace(",", ".")));
            setBusy(false);
            if (r.ok) {
              showToast("Existencia registrada ✓");
              onGuardada();
            } else showToast(r.message);
          }}
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// La tarjeta de una oferta abierta: los snapshots congelados, el anclaje y —para Cherry Picked— la ventana que decide la fecha de
// hoy (`previsualizarOferta`), la calculadora y la firma. Botones abajo a la derecha, apilados — la regla de la casa.
function OfferCard({ offer, onRefreshData, asistida = false, cuenta = "" }: { offer: ProducerOffer; onRefreshData: () => void; asistida?: boolean; cuenta?: string }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  // V5.190: el error del último intento de firmar se queda junto al botón (el aviso fugaz no bastaba: «carga, pero no hace nada»).
  const [errorFirma, setErrorFirma] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState("");
  const color = offer.grade ? GRADES[offer.grade] : "var(--line)";
  const conDeclaracion = Boolean(offer.termsVersion);
  const esSelection = offer.kind === "directa";
  const conVentana = conDeclaracion && !esSelection;
  const [fase, setFase] = useState<"calcular" | "firmar">("calcular");
  const [decision, setDecision] = useState<DecisionDelTrato | null>(null);
  const [vista, setVista] = useState<VistaPreviaDeOferta | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [cambiarExistencia, setCambiarExistencia] = useState(false);
  const lugarEntrega = offer.lugarEntrega ?? LUGAR_DE_ENTREGA_POR_DEFECTO;

  useEffect(() => {
    if (!conVentana) return;
    let vivo = true;
    previsualizarOferta(offer.id).then((r) => {
      if (vivo) setVista(r);
    });
    return () => {
      vivo = false;
    };
  }, [conVentana, offer.id, recarga]);

  const abierta = vista?.ok && vista.c.abierta ? vista.c : null;

  async function responder(respuesta: "aceptar" | "rechazar", firma?: FirmaDelProductor) {
    setBusy(true);
    const declaracionParaEnviar = conVentana && decision ? { lockedKg: decision.kg, aceptaTerminos: true } : undefined;
    const res = await respondToOffer(offer.id, respuesta, respuesta === "rechazar" ? nota : undefined, respuesta === "aceptar" ? declaracionParaEnviar : undefined, respuesta === "aceptar" ? firma : undefined);
    setBusy(false);
    if (res.ok) {
      setErrorFirma(null);
      showToast(respuesta === "aceptar" ? "Contrato firmado ✓ · CTCx lo firma y queda vigente" : "Oferta rechazada, sin compromiso");
      setRechazando(false);
      setNota("");
      onRefreshData();
    } else {
      setErrorFirma(res.message);
      showToast(res.message);
    }
  }

  // V5.190 (owner): en una sesión asistida, CTCx acepta PROVISIONALMENTE en favor del productor (sin su firma, su nombre ni su documento).
  async function aceptarProvisional(responsable: string) {
    if (!decision) return;
    setBusy(true);
    const res = await aceptarProvisionalmente(offer.id, { lockedKg: decision.kg, aceptaTerminos: true }, responsable);
    setBusy(false);
    if (res.ok) {
      setErrorFirma(null);
      showToast("Contrato aceptado provisionalmente ✓ · queda vigente; el Productor lo ratifica desde su cuenta");
      onRefreshData();
    } else {
      setErrorFirma(res.message);
      showToast(res.message);
    }
  }
  // Solo una participación en Cherry Picked anclada al PVC de su grado (el servidor lo vuelve a comprobar).
  const puedeProvisional = asistida && offer.kind === "temporada" && Boolean(offer.referencePriceSource) && conVentana;

  return (
    <div style={{ border: `1.5px solid ${color}`, borderRadius: 10, padding: "12px 14px", background: "var(--paper)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {offer.grade && <Image src={`/images/shared/grados/${offer.grade.toLowerCase()}.webp`} alt={`Grado ${offer.grade}`} width={160} height={160} style={{ width: 46, height: 46, objectFit: "contain", flexShrink: 0 }} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <b style={{ fontSize: 14 }}>{offer.lotName}</b>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "3px 0 6px" }}>
            <CtcRef id={offer.lotId} />
          </div>
          <div className={styles.chips}>
            <span className={styles.datachip}>{offer.esRenovacion ? "Renovación" : KIND_LABEL[offer.kind]}</span>
            {offer.grade && <span className={styles.datachip}>Grado: <b style={{ color }}>{offer.grade}</b></span>}
            {offer.score != null && <span className={styles.datachip}>Puntaje: <b>{offer.score}</b></span>}
            {offer.variety && <span className={styles.datachip}>Variedad: <b>{offer.variety}</b></span>}
            {offer.process && <span className={styles.datachip}>Proceso: <b>{offer.process}</b></span>}
            {offer.seasonLabel && <span className={styles.datachip}>Temporada: <b>{offer.seasonLabel}</b></span>}
          </div>
          {offer.loteDeTemporadaPasada && <div className={styles.sub} style={{ color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>Lote de la temporada pasada — su valor está enmarcado como tal.</div>}
          <div style={{ fontSize: 15, marginTop: 8 }}>
            Oferta de CTCx: <b>{formatCop(offer.pricePerKg)}/kg</b> de CPS <span style={{ fontSize: 12.5, color: "var(--muted)" }}>(café pergamino seco)</span>
            {/* V5.185 (owner): justo después, el equivalente por carga y, entre paréntesis, el Flete a CTCx que ya incluye. */}
            {" "}· <b>{formatCop(offer.pricePerKg * CARGA_KG)}</b> por carga <span style={{ fontSize: 12.5, color: "var(--muted)" }}>({CARGA_KG} kg)</span>
            {offer.flete && <span style={{ fontSize: 13, color: "var(--muted)" }}> (incluye {formatCop(offer.flete.carga)} de Flete a CTCx)</span>}
            {!conDeclaracion && offer.quantityKg != null && <> · <b>{offer.quantityKg} kg</b></>}
          </div>
          {/* V5.177: el Flete a CTCx de su región, ya sumado al precio. */}
          {offer.flete && (
            <div className={styles.sub} style={{ marginTop: 2 }}>
              Incluye el <b>Flete a CTCx</b> de {REGION_DE_FLETE_LABEL[offer.flete.region]}: {formatCop(offer.flete.carga)} por carga ({formatCop(fletePorKg(offer.flete.carga))}/kg). Usted despacha
              con el código corporativo de CTCx en Servientrega y paga el envío en la oficina.
            </div>
          )}
          {conDeclaracion && (
            <div className={styles.sub} style={{ marginTop: 4 }}>
              {offer.referencePriceSource && (
                <>
                  {/* V5.188: «PVC PVC-F4-2026» decía la sigla dos veces y no decía qué es; ahora nombra la edición y la explica. */}
                  Anclada a la edición <b>{offer.referencePriceSource.replace(/^PVC\s+/, "")}</b> del PVC (el precio de referencia de CTCx)
                  {offer.modificadorPct ? ` (${offer.modificadorPct > 0 ? "+" : ""}${offer.modificadorPct} %)` : ""} ·{" "}
                </>
              )}
              {offer.minKg != null && <>mínimo <b>{offer.minKg} kg</b> por ventana · </>}
              {offer.maxKg != null && <>hasta <b>{offer.maxKg} kg</b> · </>}
              {offer.sacoKg != null && offer.sacoKg > 0 && <>{offer.esRenovacion ? "compra adelantada" : "saco con la firma"} <b>{offer.sacoKg} kg</b> · </>}
              {offer.expiraAt && (
                <>
                  vence el <b>{fechaParaElProductor(offer.expiraAt)}</b> (al terminar el día, hora de Colombia) ·{" "}
                </>
              )}
              términos {offer.termsVersion}
            </div>
          )}
          {offer.notes && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{offer.notes}</div>}
          {lugarEntrega && <div style={{ fontSize: 12.5, marginTop: 4 }}>Entrega: {lugarEntrega}</div>}
          {/* V5.188 (feedback de revisión: «PVC, CPS, "Grado Red" y Cherry Picked no están definidos»): las palabras del trato. */}
          {(conDeclaracion || esSelection) && <GlosarioDelTrato grado={offer.grade} />}

          {esSelection && <PropuestaSelection offer={offer} onRefreshData={onRefreshData} />}

          {conVentana && !rechazando && fase === "calcular" && (
            <>
              {!vista && <div className={styles.sub} style={{ marginTop: 8 }}>Calculando su ventana…</div>}
              {vista && !vista.ok && <div className={styles.sub} style={{ marginTop: 8, color: "var(--accent)" }}>{vista.message}</div>}
              {vista?.ok && !vista.c.abierta && (
                <div className={styles.alist} style={{ marginTop: 8, border: "1px solid var(--accent)", borderRadius: 8, padding: "8px 10px" }}>
                  {vista.c.motivo}
                  {vista.c.reabre && <> Se puede firmar desde el <b>{fechaLarga(vista.c.reabre)}</b>.</>}
                </div>
              )}
              {abierta && (abierta.existenciaKg == null || cambiarExistencia) && (
                <ExistenciaForm
                  lotId={offer.lotId}
                  onGuardada={() => {
                    setCambiarExistencia(false);
                    setVista(null);
                    setRecarga((n) => n + 1);
                  }}
                />
              )}
              {/* V5.176: en una renovación el productor reconfirma su existencia (A2) antes de declarar. */}
              {abierta && abierta.existenciaKg != null && !cambiarExistencia && (
                <div className={styles.sub} style={{ marginTop: 8 }}>
                  Existencia registrada del lote: <b>{abierta.existenciaKg} kg</b> de CPS{abierta.disponibleKg != null && <> (le quedan {abierta.disponibleKg} kg)</>}.{" "}
                  <button type="button" onClick={() => setCambiarExistencia(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--green)", fontWeight: 700, font: "inherit" }}>
                    ¿Cambió? Actualizarla
                  </button>
                </div>
              )}
              {/* V5.180: la calculadora va siempre que la ventana esté abierta; sin existencia, solo la decisión espera. */}
              {abierta && (
                <CalculadoraDelTrato
                  c={abierta}
                  puedeDecidir={abierta.existenciaKg != null}
                  maxKg={offer.maxKg}
                  lugarEntrega={lugarEntrega}
                  fncCargaRef={offer.fncCargaRef}
                  onDecidir={(d) => {
                    setDecision(d);
                    setFase("firmar");
                  }}
                />
              )}
            </>
          )}
          {!esSelection && !rechazando && fase === "firmar" && (
            <FirmaDelContrato
              datos={{
                tipo: abierta && decision ? "cherry_picked" : "selection",
                ventana: abierta && decision ? { tipo: abierta.ventana.tipo, desde: abierta.ventana.desde, hasta: abierta.ventana.hasta, ciclos: abierta.ventana.ciclos, retiroLibrePct: abierta.ventana.retiroLibrePct, precio: abierta.ventana.precio } : null,
                sinRetiro: decision?.sinRetiro ?? false,
                sacoKg: abierta ? abierta.sacoKg : null,
                esRenovacion: abierta?.esRenovacion ?? false,
                minimoKg: abierta ? abierta.minimoKg : null,
                calidad: abierta?.calidad ?? null,
                flete: offer.flete,
                loteNombre: offer.lotName,
                loteReferencia: ctcLotReference(offer.lotId),
                grado: offer.grade ?? "—",
                copKg: abierta ? abierta.precioKg : offer.pricePerKg,
                declaradoKg: decision?.kg ?? offer.quantityKg ?? 0,
                lugarEntrega,
                termsVersion: offer.termsVersion,
                temporada: offer.seasonLabel,
              }}
              ocupado={busy}
              onFirmar={(f) => responder("aceptar", f)}
              onVolver={() => {
                setErrorFirma(null);
                setFase("calcular");
              }}
              error={errorFirma}
              provisional={puedeProvisional ? { cuenta, onAceptar: aceptarProvisional } : null}
            />
          )}

          {rechazando && (
            <textarea
              rows={2}
              placeholder="¿Por qué la rechaza? (opcional — ayuda a CTCx a mejorar la próxima oferta)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              style={{ width: "100%", marginTop: 8, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 12.5, background: "var(--card)", fontFamily: "inherit", resize: "vertical" }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", marginTop: 10 }}>
            {esSelection ? null : !rechazando ? (
              fase === "calcular" && (
                <>
                  {!conDeclaracion && (
                    <button className="btn btn-sm btn-solid-accent" disabled={busy} onClick={() => setFase("firmar")}>
                      Aceptar y firmar el contrato
                    </button>
                  )}
                  <button className="btn btn-sm" disabled={busy} onClick={() => setRechazando(true)}>
                    Rechazar…
                  </button>
                </>
              )
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
