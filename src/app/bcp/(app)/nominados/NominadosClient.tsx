"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addSondeoEvaluation,
  applyCodeOnBehalf,
  assignLotToSession,
  assignLotsToBatch,
  confirmInscriptionPayment,
  confirmSampleReceivedNom,
  createBatchProofUploadUrl,
  createSondeoLotResultUploadUrl,
  deleteSondeoBatch,
  markBatchDelivered,
  markBatchReceived,
  markBatchSent,
  markCashbackPaid,
  planSondeoBatch,
  postularOnBehalf,
  recordSondeoResult,
  regenerateMejoras,
  removeFromBatch,
  setBatchLab,
  unsettleInscription,
} from "../nominadosActions";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, computeSca, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { openSondeoRequest } from "@/lib/arena/sondeoRequestPrint";
import styles from "../shared.module.css";

// Cada control del tablero Nominados sigue el patrón resultado-inline (V12):
// la acción devuelve {ok}|{ok:false,error} y el error se muestra junto al
// botón — nunca un throw, nunca un error boundary.

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
        {pending ? "Postulando…" : "Postular en nombre del productor"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

export function PaymentControls({
  lotId,
  status,
  entryCode,
  dueLabel,
}: {
  lotId: string;
  status: string;
  entryCode: string | null;
  dueLabel: string;
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
          disabled={pending}
          onClick={() => run(() => confirmInscriptionPayment(lotId, ref))}
        >
          {pending ? "Guardando…" : `Confirmar pago · ${dueLabel}`}
        </button>
      </div>
      {/* Un código de campaña (KRX-) ya aplicado cierra la caja: el descuento
          quedó ligado y solo se confirma o revierte. */}
      {entryCode?.startsWith("KRX-") ? (
        <p className={styles.meta} style={{ margin: 0 }}>
          Código de campaña aplicado: <span className="mono">{entryCode}</span> — el descuento ya está ligado.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder={`Código de campaña (activo: ${entryCode ?? "—"})`}
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

export function ConfirmSampleButton({ lotId, shipped }: { lotId: string; shipped: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div style={{ marginTop: 6 }}>
      <button className="btn btn-sm" disabled={pending || !shipped} onClick={() => run(() => confirmSampleReceivedNom(lotId))}>
        {pending ? "Confirmando…" : shipped ? "Confirmar muestra recibida" : "Muestra aún no enviada"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

export function AssignSessionControls({
  lotId,
  openSessions,
}: {
  lotId: string;
  openSessions: { id: string; label: string; free: number }[];
}) {
  const { pending, error, run } = useAction();
  const [sess, setSess] = useState("");
  if (!openSessions.length) {
    return <p className={styles.meta}>Sin sesiones abiertas con cupo — cree una en /bcp/arena.</p>;
  }
  return (
    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <select value={sess} onChange={(e) => setSess(e.target.value)}>
        <option value="">Elegir sesión…</option>
        {openSessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label} · {s.free} cupos
          </option>
        ))}
      </select>
      <button className="btn btn-sm btn-solid" disabled={pending || !sess} onClick={() => run(() => assignLotToSession(lotId, sess))}>
        {pending ? "Asignando…" : "Confirmar sesión"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

// ── Baches de Sondeo ─────────────────────────────────────────────────────────

/** Columna «Nuevo Sondeo»: selección múltiple (≤30) desde el pool En Fila. */
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
    return <p className={styles.meta}>Sin lotes elegibles en «En Fila» (pendientes de sondeo).</p>;
  }
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <p className={styles.meta} style={{ margin: 0 }}>
        Elija lotes de «En Fila» ({slotsLeft} cupos libres de 30):
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
        {pending ? "Agregando…" : `Agregar ${sel.size || ""} al bache`}
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

/** Elimina un bache (con confirmación); los cafés sin veredicto vuelven a En Fila. */
export function DeleteBatchButton({ batchId, label, lotCount }: { batchId: string; label: string; lotCount: number }) {
  const { pending, error, run } = useAction();
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        style={{ borderColor: "var(--red)", color: "var(--red)" }}
        onClick={() => {
          if (window.confirm(`¿Eliminar el bache «${label}»?\n\n${lotCount} café(s) sin veredicto vuelven a «En Fila». Esta acción no se puede deshacer.`)) {
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

export function PlanBatchButton({ batchId }: { batchId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => run(() => planSondeoBatch(batchId))}>
        {pending ? "Cerrando…" : "Cerrar Bache de sondeo →"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

/** Columna «Sondeo Planeado»: lab + Solicitud formal + prueba de recibo + Bache Enviado. */
export function PlannedBatchControls({
  batch,
  samples,
}: {
  batch: { id: string; label: string; labName: string; labContact: string };
  samples: { reference: string; kg: string }[];
}) {
  const { pending, error, run } = useAction();
  const [labName, setLabName] = useState(batch.labName);
  const [labContact, setLabContact] = useState(batch.labContact);
  const [proof, setProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function send() {
    run(async () => {
      if (!proof) return { ok: false as const, error: "Adjunte la prueba de confirmación de recibo (PDF del correo o confirmación escrita)." };
      setUploading(true);
      try {
        const prep = await createBatchProofUploadUrl(batch.id, proof.name);
        if (!prep.ok) return prep;
        const supabase = createClient();
        const { error: upErr } = await supabase.storage.from("kaffetal-media").uploadToSignedUrl(prep.path, prep.token, proof);
        if (upErr) return { ok: false as const, error: "La subida de la prueba falló. Intente de nuevo." };
        return markBatchSent(batch.id, prep.path, proof.name);
      } finally {
        setUploading(false);
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Laboratorio (nombre)" value={labName} onChange={(e) => setLabName(e.target.value)} style={{ maxWidth: 200 }} />
        <input placeholder="Contacto (correo / tel.)" value={labContact} onChange={(e) => setLabContact(e.target.value)} style={{ maxWidth: 200 }} />
        <button className="btn btn-sm" disabled={pending || !labName.trim()} onClick={() => run(() => setBatchLab(batch.id, labName, labContact))}>
          Guardar lab
        </button>
      </div>
      <div>
        <button
          className="btn btn-sm"
          disabled={!batch.labName}
          title={batch.labName ? "" : "Guarde primero el laboratorio"}
          onClick={() => openSondeoRequest({ batchLabel: batch.label, labName: batch.labName, labContact: batch.labContact, samples })}
        >
          Solicitud de Bache de muestras (imprimir) ↗
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <label className="btn btn-sm" style={{ cursor: "pointer" }}>
          {proof ? `Prueba: ${proof.name}` : "Adjuntar prueba de recibo…"}
          <input
            type="file"
            style={{ display: "none" }}
            onChange={(e) => setProof(e.target.files?.[0] ?? null)}
          />
        </label>
        <button className="btn btn-sm btn-solid" disabled={pending || uploading || !proof} onClick={send}>
          {uploading || pending ? "Enviando…" : "Bache Enviado →"}
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

/** Columna «Sondeo Pendiente»: las dos confirmaciones. */
export function PendingBatchControls({ batchId, received }: { batchId: string; received: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {!received ? (
        <button className="btn btn-sm" disabled={pending} onClick={() => run(() => markBatchReceived(batchId))}>
          Bache recibido en Lab ✓
        </button>
      ) : (
        <span className={`${styles.badge} ${styles.badgeGood}`}>Recibido en lab ✓</span>
      )}
      <button className="btn btn-sm btn-solid" disabled={pending || !received} onClick={() => run(() => markBatchDelivered(batchId))}>
        Pruebas entregadas →
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

/** Columna «Registro de Sondeo», por lote: varias planillas B2/B3 + archivo del
 *  lab + el veredicto (aprobado ⇒ vuelve a En Fila / rechazado ⇒ cashback). */
export function SondeoRegistroControls({
  lotId,
  lotName,
  evaluations,
  resultFilename,
}: {
  lotId: string;
  lotName: string;
  evaluations: LabEvaluation[];
  resultFilename: string | null;
}) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [ev, setEv] = useState<LabEvaluation>(EMPTY_LAB_EVALUATION);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
        try {
          const prep = await createSondeoLotResultUploadUrl(lotId, file.name);
          if (!prep.ok) return prep;
          const supabase = createClient();
          const { error: upErr } = await supabase.storage.from("kaffetal-media").uploadToSignedUrl(prep.path, prep.token, file);
          if (upErr) return { ok: false as const, error: "La subida del archivo falló." };
          resultFile = { path: prep.path, filename: file.name };
        } finally {
          setUploading(false);
        }
      }
      return recordSondeoResult(lotId, resultado, notes, undefined, {
        evaluation: adding && labEvaluationHasData(ev) ? ev : undefined,
        resultFile,
      });
    });
  }

  return (
    <div style={{ marginTop: 6 }}>
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        Registrar sondeo ({evaluations.length} planilla{evaluations.length === 1 ? "" : "s"})…
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>Registro de Sondeo · {lotName}</h3>
            <p className={styles.meta} style={{ marginTop: 2 }}>
              Un lote puede tener VARIAS planillas B2/B3 (réplicas del laboratorio). El puntaje del sondeo sale de la
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
              <label>Archivo del laboratorio {resultFilename && <span className={styles.meta}>(actual: {resultFilename})</span>}</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={pending || uploading} />
            </div>
            <div className={styles.field}>
              <label>Resumen del resultado (el productor lo verá)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resultado del laboratorio…" />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="btn btn-sm btn-solid" disabled={pending || uploading || !notes.trim()} onClick={() => verdict("aprobado")}>
                Aprobado → En Fila
              </button>
              <button className="btn btn-sm" disabled={pending || uploading || !notes.trim()} onClick={() => verdict("rechazado")}>
                Rechazado (cashback 80% + mejoras IA)
              </button>
            </div>
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
