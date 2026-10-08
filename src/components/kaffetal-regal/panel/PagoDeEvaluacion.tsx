"use client";

import { EVALUATION_FEE_COP, formatCop, dueFor } from "@/lib/arena/inscriptions";
import { SUBVENCION_KR_PCT, SUBVENCION_MAX_PCT } from "@/lib/arena/subvencion";
import { MUESTRA_EVALUACION_KG } from "@/lib/trato/terminos";
import { carrilConfigurado, type CarrilDePago } from "@/lib/arena/payment";
import styles from "../AppDashboard.module.css";

// ── Cuánto y dónde se paga la evaluación (V5.129, owner 2026-10-01) ──────────────────────────────────────────────────
// «Debe ser más claro cuánto y dónde hay que pagar; además, cuando se emite la factura en OCP, debe ser reflejada en KR.»
// Antes: un párrafo de ocho líneas y, en la tarjeta, una frase gris. Ahora:
//   · `ComoFunciona`         los cuatro pasos y las tres cifras, de un vistazo.
//   · `CuentaDeLaSolicitud`  LA CUENTA de cada lote: tarifa − subvención = total, y debajo el estado de la factura
//                            (sin emitir · emitida, con su número y dónde pagar · pagada).
//   · `DondePagar`           el carril que CTCx configuró en el OCP (`payment.ts`), o el aviso de que aún no lo hay.

const AMBAR = "#92400E";
const AMBAR_FONDO = "#FEF3C7";

const PASOS: [string, string][] = [
  ["Solicite", "Con «Solicitar evaluación» en su lote Apto. Puede escribir un código de subvención o pedirle a CTCx más coinversión en la nota."],
  ["Reciba su factura", "CTCx corrobora la solicitud y le emite la factura de cobro con el total. No pague antes de tenerla."],
  ["Pague", "Al medio de pago que aparece en su factura, con la referencia de su lote en el mensaje."],
  ["Envíe la muestra", `${MUESTRA_EVALUACION_KG} kg de pergamino seco, contra entrega: el flete lo paga CTCx al recibirla.`],
];

export function ComoFunciona() {
  const cifra = (rotulo: string, valor: string, nota: string) => (
    <div style={{ border: "1.5px solid var(--line)", borderRadius: 10, padding: "8px 12px", background: "var(--card)" }}>
      <div className={styles.k}>{rotulo}</div>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{nota}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
        {cifra("Tarifa por lote", formatCop(EVALUATION_FEE_COP), "Registrar la finca y armar la ficha no cuesta.")}
        {cifra(`Solicitando desde aquí · ${SUBVENCION_KR_PCT} %`, formatCop(dueFor(SUBVENCION_KR_PCT)), "La coinversión de CTCx con la que nace toda solicitud.")}
        {cifra(`Con código o a pedido · hasta ${SUBVENCION_MAX_PCT} %`, `desde ${formatCop(dueFor(SUBVENCION_MAX_PCT))}`, "CTCx decide su coinversión al corroborar.")}
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
        {PASOS.map(([titulo, detalle], k) => (
          <li key={titulo} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
            <span aria-hidden style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: "50%", background: "var(--green)", color: "#fff", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {k + 1}
            </span>
            <span>
              <b>{titulo}.</b> <span style={{ color: "var(--muted)" }}>{detalle}</span>
            </span>
          </li>
        ))}
      </ol>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        La tarifa cubre el análisis físico, la catación por un <b>Q-Grader certificado</b>, el factor de rendimiento, la certificación CTC y
        el feedback — <b>salga o no salga galardonado</b>.
      </div>
    </div>
  );
}

/** Dónde se paga: el carril que CTCx configuró, con la referencia del lote. */
export function DondePagar({ carril, referencia }: { carril: CarrilDePago; referencia: string }) {
  if (!carrilConfigurado(carril)) {
    return (
      <div style={{ fontSize: 13 }}>
        <b>Dónde pagar:</b> escríbanos a <b>{carril.email}</b> con la referencia <b className="mono">{referencia}</b> y le confirmamos el medio de
        pago el mismo día.
      </div>
    );
  }
  return (
    <div style={{ fontSize: 13, display: "grid", gap: 2 }}>
      <div>
        <b>Dónde pagar:</b> {carril.medio} <b className="mono" style={{ fontSize: 16 }}>{carril.numero}</b>
        {carril.titular && <> — a nombre de <b>{carril.titular}</b></>}
      </div>
      {carril.instrucciones && <div style={{ color: "var(--muted)" }}>{carril.instrucciones}</div>}
      <div>
        En el mensaje del pago escriba la referencia <b className="mono">{referencia}</b> y envíe el comprobante a <b>{carril.email}</b>.
      </div>
    </div>
  );
}

export function CuentaDeLaSolicitud({
  tarifaCop,
  discountPct,
  totalCop,
  status,
  facturaRef,
  facturaEmitidaAt,
  referencia,
  carril,
  onVerFactura,
}: {
  tarifaCop: number;
  discountPct: number;
  totalCop: number;
  status: "pendiente" | "pagado" | "exento";
  facturaRef: string | null;
  facturaEmitidaAt: string | null;
  /** El código corto del lote: lo que el productor escribe en el pago. */
  referencia: string;
  carril: CarrilDePago;
  onVerFactura: () => void;
}) {
  const fila = (rotulo: string, valor: string, fuerte = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: fuerte ? 16 : 13, fontWeight: fuerte ? 800 : 400 }}>
      <span>{rotulo}</span>
      <span className="mono">{valor}</span>
    </div>
  );
  const exento = status === "exento";
  const pagado = status === "pagado";
  const emitida = facturaEmitidaAt ? new Date(facturaEmitidaAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <div style={{ border: `1.5px solid ${pagado || exento ? "var(--green)" : facturaRef ? "var(--accent)" : "var(--line)"}`, borderRadius: 10, background: "var(--card)", overflow: "hidden", maxWidth: 560 }}>
      <div style={{ padding: "10px 14px", display: "grid", gap: 4 }}>
        <span className={styles.k}>Su cuenta</span>
        {fila("Tarifa de evaluación", formatCop(tarifaCop))}
        {discountPct > 0 && fila(`Coinversión de CTCx ${discountPct} %`, `− ${formatCop(tarifaCop - totalCop)}`)}
        <div style={{ borderTop: "1.5px solid var(--line)", margin: "2px 0" }} />
        {exento ? fila("Total a pagar", `${formatCop(0)} · la asume CTCx`, true) : fila(pagado ? "Total pagado" : "Total a pagar", formatCop(totalCop), true)}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1.5px solid var(--line)", display: "grid", gap: 6 }}>
        {exento ? (
          <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 13 }}>✓ Evaluación sin costo para usted: la asume CTCx.</span>
        ) : pagado ? (
          <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 13 }}>
            ✓ Factura {facturaRef ? <span className="mono">{facturaRef}</span> : ""} pagada. No debe nada por este lote.{" "}
            {facturaRef && (
              <button className="btn btn-sm" onClick={onVerFactura} style={{ marginLeft: 4 }}>
                Ver factura ↗
              </button>
            )}
          </span>
        ) : facturaRef ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
              <span style={{ background: "var(--accent)", color: "#fff", fontWeight: 800, borderRadius: 6, padding: "2px 8px", fontSize: 11.5 }}>FACTURA EMITIDA</span>
              <span>
                <b className="mono">{facturaRef}</b>
                {emitida ? ` · ${emitida}` : ""}
              </span>
              <button className="btn btn-sm" onClick={onVerFactura}>
                Ver factura ↗
              </button>
            </div>
            <DondePagar carril={carril} referencia={referencia} />
          </>
        ) : (
          <div style={{ fontSize: 13, background: AMBAR_FONDO, color: AMBAR, borderRadius: 8, padding: "6px 10px" }}>
            <b>Todavía no pague.</b> CTCx corrobora su solicitud y le emite la factura de cobro; cuando esté lista la verá aquí mismo, con el
            número y dónde pagar. El total de arriba puede bajar si CTCx sube su coinversión.
          </div>
        )}
      </div>
    </div>
  );
}
