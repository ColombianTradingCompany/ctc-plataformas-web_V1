"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import {
  addSondeoEvaluation,
  applyCodeOnBehalf,
  confirmarReporteQGraderOcp,
  prepararReporteQGraderOcp,
  asumirEvaluacion,
  assignLotsToBatch,
  cerrarBache,
  confirmInscriptionPayment,
  createSondeoLotResultUploadUrl,
  deleteSondeoBatch,
  devolverEvaluacionAlCentro,
  enviarAlCentro,
  markCashbackPaid,
  postularOnBehalf,
  recordEvaluationVerdict,
  reevaluar,
  regenerateMejoras,
  removeFromBatch,
  unsettleInscription,
} from "../nominadosActions";
import { decidirSubvencion, emitirFactura, guardarCarrilDePago, recibirMuestraAction } from "../solicitudesActions";
import { carrilConfigurado, type CarrilDePago } from "@/lib/arena/payment";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { AdjuntoReporteQGrader } from "@/components/bcp/AdjuntoReporteQGrader";
import { FichaCompletaLectura } from "@/components/bcp/FichaCompletaLectura";
import { TriadaDelLote } from "@/components/bcp/TriadaDelLote";
import type { FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";
import type { ReporteAdjunto } from "@/lib/evaluaciones/reporteReglas";
import { decidirPorPunto, rotuloDelPunto, type PuntoSca } from "@/lib/arena/homologacion";
import { EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, computeSca, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { gradoDelLote, redondeaPuntaje } from "@/lib/grados/definicion";
import { triadaDeLaFicha } from "@/lib/pvc/triadaDelLote";
import { openFactura, type FacturaData } from "@/lib/arena/factura";
import { MAX_BATCH_LOTS } from "@/lib/arena/inscriptions";
import { MUESTRA_EVALUACION_KG } from "@/lib/trato/terminos";
import styles from "@/components/panel/shared.module.css";

// Cada control del circuito sigue el patrón resultado-inline (V12): la acción devuelve {ok}|{ok:false,error}
// y el error se muestra junto al botón — nunca un throw, nunca un error boundary.
// V5.80 (fase 3): los controles de la solicitud (subvención, factura, recibo) y de los Baches de Evaluación
// (enviar al Centro, cerrar); el kanban de sondeo con laboratorio, prueba y solicitud formal se retiró.

type ActionResult = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };
  return { pending, error, run };
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className={styles.warn} style={{ marginTop: 6 }}>
      {error}
    </p>
  );
}

export function PostularOnBehalfButton({ lotId }: { lotId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => run(() => postularOnBehalf(lotId))}>
        {pending ? "Registrando…" : "Registrar la solicitud de evaluación en nombre del productor"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

// ── La solicitud: subvención → factura → pago → recibo ──────────────────────

/** CTCx decide la subvención de la solicitud (folio 7, paso 8). Solo con el pago pendiente. */
export function SubvencionForm({
  lotId,
  campaigns,
  actualId,
}: {
  lotId: string;
  campaigns: { id: string; name: string; pct: number }[];
  actualId: string | null;
}) {
  const { pending, error, run } = useAction();
  const [sel, setSel] = useState(actualId ?? "");
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">Sin subvención (tarifa plena · solo evaluación)</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.pct} %
            </option>
          ))}
        </select>
        <button
          className="btn btn-sm"
          disabled={pending || sel === (actualId ?? "")}
          onClick={() => {
            const fd = new FormData();
            fd.set("campaign_id", sel);
            run(() => decidirSubvencion(lotId, fd));
          }}
        >
          {pending ? "Guardando…" : "Decidir subvención"}
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function EmitirFacturaButton({ lotId }: { lotId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => run(() => emitirFactura(lotId))}>
        {pending ? "Emitiendo…" : "Corroborar y emitir factura de cobro"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

// V5.129 (owner, 2026-10-01): DÓNDE paga el productor. Hasta hoy era una constante vacía en el código y Kaffetal Regal decía
// «escríbanos»; ahora CTCx lo escribe aquí y lo leen la tarjeta de la solicitud del productor y la factura imprimible.
export function CarrilDePagoForm({ carril }: { carril: CarrilDePago }) {
  const { pending, error, run } = useAction();
  const listo = carrilConfigurado(carril);
  return (
    <details open={!listo} style={{ border: `1.5px solid ${listo ? "var(--line)" : "#92400E"}`, background: listo ? "transparent" : "#FEF3C7", borderRadius: 10, padding: "8px 12px", margin: "0 0 14px" }}>
      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
        Medio de pago que ve el productor ·{" "}
        {listo ? (
          <span style={{ fontWeight: 500 }}>
            {carril.medio} <span className="mono">{carril.numero}</span>
            {carril.titular ? ` · ${carril.titular}` : ""}
          </span>
        ) : (
          <span style={{ color: "#92400E" }}>SIN CONFIGURAR — hoy el productor solo lee «escríbanos y le confirmamos el medio de pago»</span>
        )}
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() => guardarCarrilDePago(fd));
        }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 10, alignItems: "end" }}
      >
        <div className={styles.field}>
          <label>Medio</label>
          <input name="medio" defaultValue={carril.medio} placeholder="Nequi · Bancolombia ahorros · Daviplata" maxLength={60} required />
        </div>
        <div className={styles.field}>
          <label>Número (celular o cuenta)</label>
          <input name="numero" defaultValue={carril.numero} placeholder="300 123 4567" maxLength={40} />
        </div>
        <div className={styles.field}>
          <label>A nombre de</label>
          <input name="titular" defaultValue={carril.titular} placeholder="Colombian Trading Company S.A.S." maxLength={120} />
        </div>
        <div className={styles.field}>
          <label>Indicaciones (opcional)</label>
          <input name="instrucciones" defaultValue={carril.instrucciones} placeholder="NIT, tipo de cuenta, llave…" maxLength={300} />
        </div>
        <div>
          <button className="btn btn-sm btn-solid" disabled={pending}>
            {pending ? "Guardando…" : "Guardar medio de pago"}
          </button>
        </div>
      </form>
      <p className={styles.meta} style={{ margin: "8px 0 0" }}>
        Aparece en la tarjeta de la solicitud en Kaffetal Regal (cuando la factura está emitida) y en la factura de cobro imprimible. Con el número vacío,
        las dos dicen «escríbanos a {carril.email}».
      </p>
      <ErrorLine error={error} />
    </details>
  );
}

export function VerFacturaButton({ factura }: { factura: FacturaData }) {
  return (
    <button className="btn btn-sm" onClick={() => openFactura(factura)}>
      Ver factura {factura.ref} ↗
    </button>
  );
}

export function PaymentControls({
  lotId,
  status,
  entryCode,
  dueLabel,
  facturaEmitida,
}: {
  lotId: string;
  status: string;
  entryCode: string | null;
  dueLabel: string;
  /** V5.80: el pago se confirma SOBRE la factura; sin ella el botón espera. */
  facturaEmitida: boolean;
}) {
  const { pending, error, run } = useAction();
  const [ref, setRef] = useState("");
  const [code, setCode] = useState("");
  const settled = status === "pagado" || status === "exento";

  if (settled) {
    return (
      <div style={{ marginTop: 8 }}>
        <span className={`${styles.badge} ${styles.badgeGood}`}>Pago ✓ ({status})</span>{" "}
        <button className="btn btn-sm" disabled={pending} onClick={() => run(() => unsettleInscription(lotId))}>
          Revertir
        </button>
        <ErrorLine error={error} />
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Referencia del pago (opcional)"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        <button
          className="btn btn-sm btn-solid"
          disabled={pending || !facturaEmitida}
          title={facturaEmitida ? "" : "Emita primero la factura de cobro: el pago se confirma sobre ella"}
          onClick={() => run(() => confirmInscriptionPayment(lotId, ref))}
        >
          {pending ? "Guardando…" : `Confirmar pago · ${dueLabel}`}
        </button>
        {/* V5.75 · Ruta Desacoplada: CTCx asume el costo de la evaluación (queda «exento», sin fingir un código). */}
        <button
          className="btn btn-sm"
          disabled={pending}
          title="La evaluación la paga CTCx (proveedor desacoplado u otra razón): la inscripción queda exenta, con registro"
          onClick={() => {
            if (confirm("¿CTCx asume el costo de esta evaluación? La inscripción quedará exenta (100 %) y quedará registrado quién lo decidió.")) run(() => asumirEvaluacion(lotId));
          }}
        >
          CTCx asume el costo
        </button>
      </div>
      {!facturaEmitida && (
        <p className={styles.meta} style={{ margin: 0 }}>
          Sin factura emitida no hay pago que conciliar (salvo que CTCx asuma el costo).
        </p>
      )}
      {/* Un código de campaña (KRX-) ya aplicado cierra la caja: el descuento
          quedó ligado y solo se confirma o revierte. */}
      {entryCode?.startsWith("KRX-") ? (
        <p className={styles.meta} style={{ margin: 0 }}>
          Código de subvención aplicado: <span className="mono">{entryCode}</span> — el descuento ya está ligado.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder={`Código de subvención (activo: ${entryCode ?? "—"})`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <button
            className="btn btn-sm"
            disabled={pending || !code.trim()}
            onClick={() => run(() => applyCodeOnBehalf(lotId, code))}
          >
            Aplicar código
          </button>
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/** El recibo físico: los kilos que llegaron y dónde quedan (V5.89: en qué BODEGA). Crea las filas de `muestras` Y la marca (una acción). */
export function ReciboForm({ lotId, shipped, bodegas = [] }: { lotId: string; shipped: boolean; bodegas?: { id: string; nombre: string }[] }) {
  const { pending, error, run } = useAction();
  const [kg, setKg] = useState(String(MUESTRA_EVALUACION_KG));
  const [bodegaId, setBodegaId] = useState(bodegas[0]?.id ?? "");
  const [ubicacion, setUbicacion] = useState("");
  const [custodio, setCustodio] = useState("");
  if (!shipped) {
    return (
      <p className={styles.meta} style={{ margin: "6px 0 0" }}>
        Muestra aún no enviada por el productor.
      </p>
    );
  }
  return (
    <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" style={{ width: 80 }} aria-label="Kilos recibidos" />
        <span className={styles.meta}>kg</span>
        {bodegas.length > 0 && (
          <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} aria-label="Bodega" style={{ maxWidth: 220 }}>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        )}
        <input placeholder="Detalle (estante, caja…)" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} style={{ maxWidth: 160 }} />
        <input placeholder="Custodio" value={custodio} onChange={(e) => setCustodio(e.target.value)} style={{ maxWidth: 160 }} />
        <button
          className="btn btn-sm btn-solid"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("kg", kg);
            fd.set("ubicacion", ubicacion);
            fd.set("custodio", custodio);
            fd.set("bodega_id", bodegaId);
            run(() => recibirMuestraAction(lotId, fd));
          }}
        >
          {pending ? "Recibiendo…" : "Confirmar muestra recibida"}
        </button>
      </div>
      <p className={styles.meta} style={{ margin: 0 }}>
        Se parte en 1 × 250 g para el Q-Grader · 3 × 250 g de reserva CPS (de ahí sale la revisión de los 90 días) · el resto, el kilo CTCx que se trilla
        (~750 g de verde: 400 g de tostado para ensayos + 2 × 125 g de verde al vacío).
      </p>
      <ErrorLine error={error} />
    </div>
  );
}

// ── Baches de Evaluación ─────────────────────────────────────────────────────

/** Bache abierto: selección múltiple (≤30) desde «Lotes a Evaluar». */
export function BatchPicker({
  batchId,
  candidates,
  slotsLeft,
}: {
  batchId: string;
  candidates: { lotId: string; name: string; producer: string }[];
  slotsLeft: number;
}) {
  const { pending, error, run } = useAction();
  const [sel, setSel] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!candidates.length) {
    return <p className={styles.meta}>Sin lotes a evaluar que subir (pagados y recibidos, sin bache).</p>;
  }
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <p className={styles.meta} style={{ margin: 0 }}>
        Elija lotes de «Lotes a Evaluar» ({slotsLeft} cupos libres de {MAX_BATCH_LOTS}):
      </p>
      {candidates.map((c) => (
        <label key={c.lotId} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
          <input type="checkbox" checked={sel.has(c.lotId)} onChange={() => toggle(c.lotId)} />
          <span style={{ flex: 1 }}>
            <b>{c.name}</b> · {c.producer}
          </span>
        </label>
      ))}
      <button
        className="btn btn-sm btn-solid"
        disabled={pending || sel.size === 0 || sel.size > slotsLeft}
        onClick={() => run(() => assignLotsToBatch(batchId, [...sel]))}
      >
        {pending ? "Subiendo…" : `Subir ${sel.size || ""} al bache`}
      </button>
      {sel.size > slotsLeft && <p className={styles.warn}>Seleccionó más lotes que cupos libres.</p>}
      <ErrorLine error={error} />
    </div>
  );
}

export function RemoveFromBatchButton({ lotId }: { lotId: string }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button className="btn btn-sm" disabled={pending} onClick={() => run(() => removeFromBatch(lotId))}>
        Sacar
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

/** Elimina un bache (con confirmación); los cafés sin veredicto vuelven a «Lotes a Evaluar». */
export function DeleteBatchButton({ batchId, label, lotCount }: { batchId: string; label: string; lotCount: number }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        style={{ borderColor: "var(--red)", color: "var(--red)" }}
        onClick={() => {
          if (window.confirm(`¿Eliminar el bache «${label}»?\n\n${lotCount} café(s) sin veredicto vuelven a «Lotes a Evaluar». Esta acción no se puede deshacer.`)) {
            run(() => deleteSondeoBatch(batchId));
          }
        }}
      >
        {pending ? "Eliminando…" : "Eliminar bache"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

/** «Enviar al Centro de Calidad»: abierto → en_centro. El Q-Grader es el contacto de la credencial elegida (V5.81). */
export function EnviarAlCentroForm({
  batchId,
  lotCount,
  centros,
}: {
  batchId: string;
  lotCount: number;
  /** Las credenciales del Centro con Evaluación de Lotes activa. Con una sola, no se pregunta. */
  centros: { id: string; nombre: string; qGrader: string }[];
}) {
  const { pending, error, run } = useAction();
  const [centroId, setCentroId] = useState(centros.length === 1 ? centros[0].id : "");
  const elegido = centros.find((c) => c.id === centroId);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {centros.length > 1 && (
          <select value={centroId} onChange={(e) => setCentroId(e.target.value)} style={{ maxWidth: 260 }}>
            <option value="">Centro de Calidad…</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · Q-Grader {c.qGrader}
              </option>
            ))}
          </select>
        )}
        <button
          className="btn btn-sm btn-solid"
          disabled={pending || lotCount === 0 || !elegido}
          title={lotCount === 0 ? "Suba lotes al bache primero" : ""}
          onClick={() => {
            const fd = new FormData();
            fd.set("centro_id", centroId);
            run(() => enviarAlCentro(batchId, fd));
          }}
        >
          {pending ? "Enviando…" : `Enviar al Centro de Calidad →${elegido && centros.length === 1 ? ` (${elegido.nombre} · Q-Grader ${elegido.qGrader})` : ""}`}
        </button>
      </div>
      {centros.length === 0 && (
        <p className={styles.warn} style={{ margin: 0 }}>
          Ningún Centro de Calidad tiene activo el módulo Evaluación de Lotes — actívelo en BCP · Socios.
        </p>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/** V5.81 · el alta del Centro de Calidad, pendiente: CTCx la CONFIRMA (galardona con el grado derivado / no supera) o la devuelve. */
/** V5.157: lo que el productor declaró en B1 — la otra mitad de la Ficha, para leerla junto a la planilla del Centro. */
export type B1DelLote = {
  finca: string | null;
  variedades: { nombre: string; pct: string; proceso: string }[];
  proceso: string | null;
  altitud: number | null;
  especie: string | null;
  humedad: string | null;
  densidad: string | null;
  aw: string | null;
  factorProductor: string | null;
  noLoSabe: boolean;
  puntajeEstimado: string | null;
};

export function ConfirmarCentroControls({
  lotId,
  lotName,
  alta,
  b1,
  ficha,
}: {
  lotId: string;
  lotName: string;
  alta: { id: string; escala: string; puntaje: number | null; punto: PuntoSca | null; qGrader: string | null; fecha: string; rueda: string[]; notas: string | null; planilla: LabEvaluation; codigoInterno: string | null; reporte: { fileName: string; url: string | null } | null };
  b1?: B1DelLote;
  /** V5.158: la Ficha Técnica entera del lote (datasheet), para la vista completa de solo lectura y la tríada. */
  ficha?: Partial<FichaFormData> | null;
}) {
  // V5.158 (owner): «quiero que se vean todos los datos» — la Ficha completa, abierta por defecto; se puede plegar.
  const [verFicha, setVerFicha] = useState(true);
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [motivo, setMotivo] = useState("");
  // V5.155 (owner, 2026-10-06): «no hay forma de ver el trabajo hecho… debo poder ver la información con un botón (abrir el
  // informe, no editable), y después elegir confirmar o enviar de vuelta al Centro con una nota». El informe es la misma
  // planilla, deshabilitada; la decisión va debajo.
  const [verInforme, setVerInforme] = useState(false);
  const puntaje = alta.puntaje != null ? redondeaPuntaje(alta.puntaje) : null;
  // V5.92: el grado FIRME sale del Punto (piso; un homologado nunca da Tyrian); si el intervalo cruza los 80, recata.
  // V5.160 (owner): el grado es El Punto y la Tríada; la tríada sale de la Ficha del lote (como en la acción).
  const triada = triadaDeLaFicha(ficha).triada;
  const decision = alta.punto ? decidirPorPunto(alta.punto, triada) : null;
  const grado = decision?.tipo === "galardon" ? decision.grado : null;
  const pendienteRecata = decision?.tipo === "pendiente_recata";
  return (
    <div style={{ marginTop: 6 }}>
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        Abrir el informe del Centro y decidir…
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>Informe del Centro de Calidad · {lotName}</h3>
            <p className={styles.meta} style={{ marginTop: 2 }}>
              Q-Grader <b>{alta.qGrader ?? "—"}</b> · <b>{alta.punto ? rotuloDelPunto(alta.punto) : "—"}</b> · dada de alta el {alta.fecha}
              {alta.codigoInterno && <> · código del laboratorio: <span className="mono">{alta.codigoInterno}</span></>}
              {alta.rueda.length > 0 && <> · rueda: {alta.rueda.join(" — ")}</>}
            </p>
            {alta.notas && <p className={styles.meta}>Notas del Q-Grader: {alta.notas}</p>}
            {alta.reporte && (
              <p className={styles.meta}>
                📎 Reporte original del Q-Grader: {alta.reporte.url ? <a href={alta.reporte.url} target="_blank" rel="noopener noreferrer">{alta.reporte.fileName}</a> : alta.reporte.fileName}
              </p>
            )}
            {/* V5.158 (owner): «quiero que se vean todos los datos» — la Ficha Técnica completa (A1–B4), de solo lectura. */}
            {ficha && (
              <div style={{ margin: "8px 0" }}>
                <button type="button" className="btn btn-sm" onClick={() => setVerFicha((v) => !v)} aria-expanded={verFicha}>
                  {verFicha ? "Ocultar la Ficha Técnica" : "Ver la Ficha Técnica completa (A1–B4, lo que declaró el productor)"}
                </button>
                {verFicha && (
                  <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginTop: 8, maxHeight: 520, overflowY: "auto" }} aria-label="Ficha Técnica del lote, solo lectura">
                    <FichaCompletaLectura datasheet={ficha} />
                  </div>
                )}
              </div>
            )}
            {/* V5.157 (owner): el B1 del lote, resumido — con la planilla del Centro, la Ficha Técnica completa. */}
            {b1 && !verFicha && (
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", margin: "8px 0", background: "var(--paper)" }} aria-label="B1 del lote">
                <p className={styles.meta} style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--ink)" }}>B1 · Variedades & Caracterización básica (lo que declaró el productor)</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2px 14px", fontSize: 12.5 }}>
                  {b1.finca && <span><b>Finca:</b> {b1.finca}</span>}
                  {b1.variedades.length > 0 && (
                    <span>
                      <b>Variedades:</b> {b1.variedades.map((v) => `${v.nombre}${v.pct ? ` ${v.pct} %` : ""}${v.proceso ? ` · ${v.proceso}` : ""}`).join(" — ")}
                    </span>
                  )}
                  {b1.especie && <span><b>Especie:</b> {b1.especie}</span>}
                  {b1.altitud != null && <span><b>Altitud:</b> {b1.altitud} msnm</span>}
                  {b1.humedad && <span><b>Humedad (productor):</b> {b1.humedad} %</span>}
                  {b1.densidad && <span><b>Densidad (productor):</b> {b1.densidad} g/L</span>}
                  {b1.aw && <span><b>aw (productor):</b> {b1.aw}</span>}
                  {b1.factorProductor && <span><b>Factor (productor):</b> {b1.factorProductor}</span>}
                  {b1.puntajeEstimado && <span><b>Puntaje estimado (productor):</b> {b1.puntajeEstimado}</span>}
                  {b1.noLoSabe && <span style={{ color: "var(--muted)" }}>El productor marcó «No lo sé» en la caracterización básica.</span>}
                </div>
              </div>
            )}
            <div style={{ margin: "8px 0" }}>
              <button type="button" className="btn btn-sm" onClick={() => setVerInforme((v) => !v)} aria-expanded={verInforme}>
                {verInforme ? "Ocultar la planilla" : "Ver la planilla completa (solo lectura) · B2 y B3 del Centro"}
              </button>
            </div>
            {verInforme && (
              <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }} aria-label="Planilla del Centro, solo lectura">
                <LabEvalEditor value={alta.planilla} onChange={() => {}} disabled />
              </div>
            )}
            <div className={styles.field} style={{ marginTop: 10 }}>
              <label>Resumen del resultado (el productor lo verá)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resultado de la evaluación…" />
            </div>
            {/* V5.158 (owner): «debe salir la escala A B C para cada parámetro de la tríada en la que cae». V5.160 (owner): la escala
                SCA de dos en dos es OBSOLETA y se retiró; EL grado es El Punto y la Tríada — esto es la regla, no una referencia. */}
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", margin: "8px 0" }} aria-label="Tríada del lote">
              <p className={styles.meta} style={{ margin: "0 0 2px", fontWeight: 700, color: "var(--ink)" }}>El grado · El Punto y la Tríada (variedad · proceso · reconocimiento, de su Ficha) con el Punto de la taza</p>
              <p className={styles.meta} style={{ margin: "0 0 8px" }}>
                La misma taza vale distinto según la variedad, el proceso y los reconocimientos: un café común (CCC) necesita más puntaje para la misma banda que uno con surplus.
              </p>
              <TriadaDelLote ficha={ficha} sca={alta.punto?.bajo ?? null} />
            </div>
            {/* El puntaje manda: el grado se DERIVA del alta del Centro; nadie lo digita. */}
            <p className={styles.meta} style={{ margin: "8px 0 6px" }}>
              {puntaje == null
                ? "El alta no trae puntaje — devuélvala al Centro."
                : pendienteRecata
                  ? <>El Punto homologado cruza los 80 ({alta.punto?.bajo}–{alta.punto?.alto}): ni galardón ni «No supera» — acuerde una recata SCA 2004 nativa.</>
                  : grado
                    ? <>Punto <b>{puntaje}</b> × tríada <span className="mono">{`${triada.variedad}${triada.proceso}${triada.reconocimiento}`}</span> → Grado firme <b style={{ color: grado.hex }}>{grado.nombre}</b> (derivado — los puntos mandan{decision?.tipo === "galardon" && decision.techo ? <>; hasta {decision.techo.nombre} con recata SCA</> : null}).</>
                    : <>Punto <b>{puntaje}</b> con tríada <span className="mono">{`${triada.variedad}${triada.proceso}${triada.reconocimiento}`}</span>: los puntos no llegan a Black (un café común entra desde 82) — registre «No supera».</>}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                className="btn btn-sm btn-solid"
                disabled={pending || !notes.trim() || !grado}
                onClick={() => run(() => recordEvaluationVerdict(lotId, "aprobado", notes, undefined, { centroEvaluationId: alta.id }))}
              >
                {grado ? `Galardonar → ${grado.nombre}` : "Galardonar"}
              </button>
              <button className="btn btn-sm" disabled={pending || !notes.trim()} onClick={() => run(() => recordEvaluationVerdict(lotId, "rechazado", notes, undefined, { centroEvaluationId: alta.id }))}>
                No supera (reporte de mejoras, sin costo)
              </button>
            </div>
            <div style={{ borderTop: "1px dashed var(--line)", marginTop: 12, paddingTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="Nota para el Centro: qué revisar" value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ maxWidth: 360 }} aria-label="Nota para el Centro" />
              <button className="btn btn-sm" disabled={pending || !motivo.trim()} onClick={() => run(() => devolverEvaluacionAlCentro(alta.id, motivo))}>
                Enviar de vuelta al Centro para revisión
              </button>
            </div>
            <ErrorLine error={error} />
          </div>
        </div>
      )}
    </div>
  );
}

export function CerrarBacheButton({ batchId, pendientes }: { batchId: string; pendientes: number }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button className="btn btn-sm" disabled={pending || pendientes > 0} title={pendientes > 0 ? `Quedan ${pendientes} lote(s) sin veredicto` : ""} onClick={() => run(() => cerrarBache(batchId))}>
        {pending ? "Cerrando…" : "Cerrar bache"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}

/** Por lote, con el bache en el Centro: varias planillas B2/B3 + archivo + el veredicto (galardona con el grado
 *  derivado del puntaje / rechazado ⇒ cashback 80%). Hasta la fase 4 lo registra CTCx; después, el Q-Grader. */
export function SondeoRegistroControls({
  lotId,
  lotName,
  evaluations,
  resultFilename,
  qGraderName,
  ficha,
}: {
  lotId: string;
  lotName: string;
  evaluations: LabEvaluation[];
  resultFilename: string | null;
  /** El Q-Grader del bache — firma la planilla oficial al galardonar. */
  qGraderName: string;
  /** V5.160: la Ficha del lote, de la que sale la tríada (el grado es El Punto y la Tríada). */
  ficha?: Partial<FichaFormData> | null;
}) {
  const triada = triadaDeLaFicha(ficha).triada;
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [ev, setEv] = useState<LabEvaluation>(EMPTY_LAB_EVALUATION);
  // V5.151 (owner): el reporte original del Q-Grader, adjunto a ESTA planilla (opcional).
  const [reporte, setReporte] = useState<ReporteAdjunto | null>(null);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const resultUp = useUpload();

  function saveEvaluation() {
    run(async () => {
      const res = await addSondeoEvaluation(lotId, ev, reporte);
      if (res.ok) {
        setEv(EMPTY_LAB_EVALUATION);
        setReporte(null);
        setAdding(false);
      }
      return res;
    });
  }

  function verdict(resultado: "aprobado" | "rechazado") {
    run(async () => {
      let resultFile: { path: string; filename: string } | undefined;
      if (file) {
        setUploading(true);
        resultUp.start();
        try {
          const prep = await createSondeoLotResultUploadUrl(lotId, file.name);
          if (!prep.ok) { resultUp.fail(); return prep; }
          const put = await putSignedUrlWithProgress(prep.path, prep.token, file, resultUp.progress);
          if (!put.ok) { resultUp.fail(); return { ok: false as const, error: "La subida del archivo falló." }; }
          resultUp.done();
          resultFile = { path: prep.path, filename: file.name };
        } finally {
          setUploading(false);
        }
      }
      return recordEvaluationVerdict(lotId, resultado, notes, undefined, {
        evaluation: adding && labEvaluationHasData(ev) ? ev : undefined,
        resultFile,
      });
    });
  }

  return (
    <div style={{ marginTop: 6 }}>
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        Registrar veredicto ({evaluations.length} planilla{evaluations.length === 1 ? "" : "s"})…
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>Registro de evaluación · {lotName}</h3>
            <p className={styles.meta} style={{ marginTop: 2 }}>
              Un lote puede tener VARIAS planillas B2/B3 (réplicas del Q-Grader). El puntaje sale de la
              última registrada, salvo veredicto con puntaje explícito.
            </p>

            {evaluations.length > 0 && (
              <div style={{ display: "grid", gap: 4, margin: "10px 0" }}>
                {evaluations.map((e, i) => {
                  const total = labEvaluationScore(e);
                  const adjunto = (e as { reporte_file_name?: string | null }).reporte_file_name;
                  return (
                    <p key={i} className={styles.meta} style={{ margin: 0 }}>
                      Planilla {i + 1}: SCA <b>{total != null ? total.toFixed(2) : "—"}</b>
                      {total != null && ` · ${computeSca(e).cls}`}
                      {adjunto && <> · 📎 {adjunto}</>}
                    </p>
                  );
                })}
              </div>
            )}

            {!adding ? (
              <button className="btn btn-sm" onClick={() => setAdding(true)}>
                + Nueva planilla B2/B3
              </button>
            ) : (
              <div style={{ border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
                <LabEvalEditor value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} disabled={pending} triada={triada} />
                <AdjuntoReporteQGrader
                  value={reporte}
                  onChange={setReporte}
                  preparar={(meta) => prepararReporteQGraderOcp(lotId, meta)}
                  confirmar={(path, meta) => confirmarReporteQGraderOcp(lotId, path, meta)}
                  disabled={pending}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="btn btn-sm btn-solid" disabled={pending} onClick={saveEvaluation}>
                    Guardar planilla
                  </button>
                  <button className="btn btn-sm" onClick={() => setAdding(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className={styles.field} style={{ marginTop: 12 }}>
              <label>Archivo del Q-Grader {resultFilename && <span className={styles.meta}>(actual: {resultFilename})</span>}</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={pending || uploading} />
                <UploadProgressRing state={resultUp.state} size={26} />
              </div>
            </div>
            <div className={styles.field}>
              <label>Resumen del resultado (el productor lo verá)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resultado de la evaluación…" />
            </div>
            {/* Los puntos mandan (V5.17 → V5.160): el grado se DERIVA de la última planilla con `gradoDelLote` (El Punto y la
                Tríada) — aquí se previsualiza para que el registrador vea qué va a firmar; nadie digita un grado. */}
            {(() => {
              const previewEval = adding && labEvaluationHasData(ev) ? ev : evaluations.length ? evaluations[evaluations.length - 1] : null;
              const rawScore = previewEval ? labEvaluationScore(previewEval) : null;
              const puntaje = rawScore != null ? redondeaPuntaje(rawScore) : null;
              const grado = puntaje != null ? gradoDelLote(puntaje, triada).grado : null;
              const sinQGrader = !qGraderName.trim();
              return (
                <>
                  <p className={styles.meta} style={{ margin: "8px 0 6px" }}>
                    {puntaje == null
                      ? "Sin planilla con puntaje SCA — registre una para poder galardonar."
                      : grado
                        ? <>Punto <b>{puntaje}</b> × tríada <span className="mono">{`${triada.variedad}${triada.proceso}${triada.reconocimiento}`}</span> → Grado <b style={{ color: grado.hex }}>{grado.nombre}</b> (derivado — los puntos mandan).</>
                        : <>Punto <b>{puntaje}</b> con tríada <span className="mono">{`${triada.variedad}${triada.proceso}${triada.reconocimiento}`}</span>: los puntos no llegan a Black — registre «No supera».</>}
                    {grado && sinQGrader && <> ⚠ Defina el Q-Grader del bache (al enviarlo al Centro) antes de galardonar.</>}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-sm btn-solid"
                      disabled={pending || uploading || !notes.trim() || !grado || sinQGrader}
                      onClick={() => verdict("aprobado")}
                    >
                      {grado ? `Galardonar → ${grado.nombre}` : "Galardonar"}
                    </button>
                    <button className="btn btn-sm" disabled={pending || uploading || !notes.trim()} onClick={() => verdict("rechazado")}>
                      No supera (reporte de mejoras, sin costo)
                    </button>
                  </div>
                </>
              );
            })()}
            <ErrorLine error={error} />
          </div>
        </div>
      )}
    </div>
  );
}

export function CashbackControls({ lotId, amountLabel }: { lotId: string; amountLabel: string }) {
  const { pending, error, run } = useAction();
  const [ref, setRef] = useState("");
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <input placeholder="Ref. Nequi" value={ref} onChange={(e) => setRef(e.target.value)} style={{ maxWidth: 160 }} />
      <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => run(() => markCashbackPaid(lotId, ref))}>
        Cashback pagado · {amountLabel}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

/** V5.82 · la re-evaluación (folio 12): CTCx la acuerda con su razón; la solicitud vuelve a empezar a tarifa plena. */
export function ReevaluarForm({ lotId }: { lotId: string }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [acuerdo, setAcuerdo] = useState("");
  if (!open) {
    return (
      <button className="btn btn-sm" onClick={() => setOpen(true)}>
        Re-evaluar (tarifa plena)…
      </button>
    );
  }
  return (
    <div style={{ display: "grid", gap: 6, width: "100%" }}>
      <textarea rows={2} placeholder="Por qué CTCx acuerda la re-evaluación: qué mejora aseguraría la oferta (el productor lo lee)" value={acuerdo} onChange={(e) => setAcuerdo(e.target.value)} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          className="btn btn-sm btn-solid"
          disabled={pending || !acuerdo.trim()}
          onClick={() => {
            if (!window.confirm("¿Acordar la re-evaluación? La solicitud vuelve a empezar a tarifa plena, sin subvención; el productor recibe factura nueva y manda una muestra nueva. Si sube de grado, se le reembolsa el 80 %.")) return;
            const fd = new FormData();
            fd.set("acuerdo", acuerdo);
            run(() => reevaluar(lotId, fd));
          }}
        >
          {pending ? "Abriendo…" : "Acordar re-evaluación"}
        </button>
        <button className="btn btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function RegenerateMejorasButton({ lotId, has }: { lotId: string; has: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button className="btn btn-sm" disabled={pending} onClick={() => run(() => regenerateMejoras(lotId))}>
        {pending ? "Generando…" : has ? "Regenerar mejoras (IA)" : "Generar mejoras (IA)"}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}
