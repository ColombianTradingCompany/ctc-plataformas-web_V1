"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import {
  addSondeoEvaluation,
  applyCodeOnBehalf,
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
import { decidirSubvencion, emitirFactura, recibirMuestraAction } from "../solicitudesActions";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, computeSca, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { gradoPorPuntaje, redondeaPuntaje } from "@/lib/grados/definicion";
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
          <option value="">Sin subvención (tarifa plena)</option>
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
        Se parte en 2 × 250 g para el Q-Grader · 2 × 250 g de reserva CPS · el resto, el kilo CTCx que se trilla (~750 g de verde: 400 g de tostado para
        ensayos + 250 g de verde al vacío).
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
export function ConfirmarCentroControls({
  lotId,
  lotName,
  alta,
}: {
  lotId: string;
  lotName: string;
  alta: { id: string; escala: string; puntaje: number | null; qGrader: string | null; fecha: string; rueda: string[]; notas: string | null };
}) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [motivo, setMotivo] = useState("");
  const puntaje = alta.puntaje != null ? redondeaPuntaje(alta.puntaje) : null;
  const grado = puntaje != null ? gradoPorPuntaje(puntaje) : null;
  return (
    <div style={{ marginTop: 6 }}>
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        Confirmar el alta del Centro…
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>Alta del Centro de Calidad · {lotName}</h3>
            <p className={styles.meta} style={{ marginTop: 2 }}>
              Q-Grader <b>{alta.qGrader ?? "—"}</b> · {alta.escala.toUpperCase()} <b>{alta.puntaje != null ? alta.puntaje.toFixed(2) : "—"}</b> · dada de alta el {alta.fecha}
              {alta.rueda.length > 0 && <> · rueda: {alta.rueda.join(", ")}</>}
            </p>
            {alta.notas && <p className={styles.meta}>Notas del Q-Grader: {alta.notas}</p>}
            <div className={styles.field} style={{ marginTop: 10 }}>
              <label>Resumen del resultado (el productor lo verá)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resultado de la evaluación…" />
            </div>
            {/* El puntaje manda: el grado se DERIVA del alta del Centro; nadie lo digita. */}
            <p className={styles.meta} style={{ margin: "8px 0 6px" }}>
              {puntaje == null
                ? "El alta no trae puntaje — devuélvala al Centro."
                : grado
                  ? <>Puntaje <b>{puntaje}</b> → Grado <b style={{ color: grado.hex }}>{grado.nombre}</b> (derivado — el puntaje manda).</>
                  : <>Puntaje <b>{puntaje}</b>: por debajo de 80 no hay galardón — registre «No supera».</>}
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
              <input placeholder="Motivo para devolverla al Centro" value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ maxWidth: 300 }} />
              <button className="btn btn-sm" disabled={pending || !motivo.trim()} onClick={() => run(() => devolverEvaluacionAlCentro(alta.id, motivo))}>
                Devolver al Centro
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
}: {
  lotId: string;
  lotName: string;
  evaluations: LabEvaluation[];
  resultFilename: string | null;
  /** El Q-Grader del bache — firma la planilla oficial al galardonar. */
  qGraderName: string;
}) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [ev, setEv] = useState<LabEvaluation>(EMPTY_LAB_EVALUATION);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const resultUp = useUpload();

  function saveEvaluation() {
    run(async () => {
      const res = await addSondeoEvaluation(lotId, ev);
      if (res.ok) {
        setEv(EMPTY_LAB_EVALUATION);
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
                  return (
                    <p key={i} className={styles.meta} style={{ margin: 0 }}>
                      Planilla {i + 1}: SCA <b>{total != null ? total.toFixed(2) : "—"}</b>
                      {total != null && ` · ${computeSca(e).cls}`}
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
                <LabEvalEditor value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} disabled={pending} />
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
            {/* El puntaje manda (V5.17): el grado se DERIVA de la última
                planilla con gradoPorPuntaje — aquí se previsualiza para que el
                registrador vea qué va a firmar; nadie digita un grado. */}
            {(() => {
              const previewEval = adding && labEvaluationHasData(ev) ? ev : evaluations.length ? evaluations[evaluations.length - 1] : null;
              const rawScore = previewEval ? labEvaluationScore(previewEval) : null;
              const puntaje = rawScore != null ? redondeaPuntaje(rawScore) : null;
              const grado = puntaje != null ? gradoPorPuntaje(puntaje) : null;
              const sinQGrader = !qGraderName.trim();
              return (
                <>
                  <p className={styles.meta} style={{ margin: "8px 0 6px" }}>
                    {puntaje == null
                      ? "Sin planilla con puntaje SCA — registre una para poder galardonar."
                      : grado
                        ? <>Puntaje <b>{puntaje}</b> → Grado <b style={{ color: grado.hex }}>{grado.nombre}</b> (derivado — el puntaje manda).</>
                        : <>Puntaje <b>{puntaje}</b>: por debajo de 80 no hay galardón — registre «No supera».</>}
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
