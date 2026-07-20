"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  applyCodeOnBehalf,
  assignLotToSession,
  assignToBatch,
  confirmInscriptionPayment,
  confirmSampleReceivedNom,
  createSondeoLotResultUploadUrl,
  createSondeoResultUploadUrl,
  lockBatch,
  markCashbackPaid,
  markSampleOrganized,
  postularOnBehalf,
  recordBatchResult,
  recordSondeoResult,
  regenerateMejoras,
  removeFromBatch,
  unsettleInscription,
} from "../nominadosActions";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { EMPTY_LAB_EVALUATION, labEvaluationHasData, labEvaluationScore, type LabEvaluation } from "@/lib/arena/labEvaluation";
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
      {/* Un código de campaña (KRX-) ya aplicado cierra la caja también aquí:
          el descuento quedó ligado al código y solo se confirma o revierte. */}
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

/** Columna "Envío a Sondeo": organizar la muestra y consolidarla en un envío.
 *  El registro del laboratorio vive en la SIGUIENTE columna (SondeoResultControls)
 *  — el envío es un paso independiente ANTES de los resultados (2026-07-20). */
export function SondeoControls({
  lotId,
  sampleReady,
  batchId,
  batchStatus,
  openBatches,
}: {
  lotId: string;
  sampleReady: boolean;
  batchId: string | null;
  batchStatus: string | null;
  openBatches: { id: string; label: string }[];
}) {
  const { pending, error, run } = useAction();
  const [batch, setBatch] = useState("");

  return (
    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span className={`${styles.badge} ${sampleReady ? styles.badgeGood : styles.badgeWarn}`}>
          {sampleReady ? "Muestra organizada ✓" : "Muestra por organizar"}
        </span>
        {batchId && (
          <span className={styles.badge}>
            {batchStatus === "abierto" ? "En envío (abierto)" : "Envío despachado"}
          </span>
        )}
      </div>
      {!sampleReady && (
        <button className="btn btn-sm" disabled={pending} onClick={() => run(() => markSampleOrganized(lotId))}>
          Marcar muestra organizada
        </button>
      )}
      {sampleReady && !batchId && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select value={batch} onChange={(e) => setBatch(e.target.value)}>
            <option value="">Elegir envío…</option>
            {openBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" disabled={pending || !batch} onClick={() => run(() => assignToBatch(lotId, batch))}>
            Agregar al envío
          </button>
        </div>
      )}
      {batchId && batchStatus === "abierto" && (
        <button className="btn btn-sm" disabled={pending} onClick={() => run(() => removeFromBatch(lotId))}>
          Sacar del envío
        </button>
      )}
      {sampleReady && !batchId && (
        <p className={styles.meta} style={{ margin: 0 }}>
          Al cerrar su envío, el lote pasa a «Resultados del Laboratorio».
        </p>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/** Columna "Resultados del Laboratorio": registro del resultado POR LOTE con
 *  las interfaces B2 (SCA) y B3 (física) de la Ficha + el archivo del lab. */
export function SondeoResultControls({ lotId, lotName }: { lotId: string; lotName: string }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [ev, setEv] = useState<LabEvaluation>(EMPTY_LAB_EVALUATION);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const score = labEvaluationScore(ev);

  function submit(resultado: "aprobado" | "rechazado") {
    setUploadError(null);
    run(async () => {
      // 1) El archivo del laboratorio sube primero (vía URL firmada); si esa
      //    subida falla, no se registra nada — el resultado va completo o no va.
      let resultFile: { path: string; filename: string } | undefined;
      if (file) {
        setUploading(true);
        try {
          const prep = await createSondeoLotResultUploadUrl(lotId, file.name);
          if (!prep.ok) return prep;
          const supabase = createClient();
          const { error: upErr } = await supabase.storage.from("kaffetal-media").uploadToSignedUrl(prep.path, prep.token, file);
          if (upErr) return { ok: false as const, error: "La subida del archivo falló. Intente de nuevo." };
          resultFile = { path: prep.path, filename: file.name };
        } finally {
          setUploading(false);
        }
      }
      // 2) Registro estructurado: planilla + notas + veredicto.
      return recordSondeoResult(lotId, resultado, notes, undefined, {
        evaluation: labEvaluationHasData(ev) ? ev : undefined,
        resultFile,
      });
    });
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>
        Registrar resultado del laboratorio…
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>Resultado del laboratorio · {lotName}</h3>
            <p className={styles.meta} style={{ marginTop: 2 }}>
              Registre la planilla tal como llegó del laboratorio (mismas interfaces B2/B3 de la Ficha) y adjunte el
              documento original del resultado.
            </p>

            <div className={styles.field} style={{ marginTop: 10 }}>
              <label>Archivo del resultado (laboratorio)</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={pending || uploading}
              />
              {file && <p className={styles.meta} style={{ margin: "3px 0 0" }}>Se subirá al registrar: {file.name}</p>}
            </div>

            <LabEvalEditor value={ev} onChange={(patch) => setEv((v) => ({ ...v, ...patch }))} disabled={pending || uploading} />
            {score != null && (
              <p className={styles.meta} style={{ margin: "8px 0 0" }}>
                El total SCA de la planilla (<b>{score.toFixed(2)}</b>) quedará como puntaje del sondeo.
              </p>
            )}

            <div className={styles.field} style={{ marginTop: 10 }}>
              <label>Resumen del resultado (el productor lo verá)</label>
              <textarea
                rows={2}
                placeholder="Resultado del laboratorio / catación…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <button className="btn btn-sm btn-solid" disabled={pending || uploading || !notes.trim()} onClick={() => submit("aprobado")}>
                {pending || uploading ? "Registrando…" : "Aprobado → En Fila"}
              </button>
              <button className="btn btn-sm" disabled={pending || uploading || !notes.trim()} onClick={() => submit("rechazado")}>
                Rechazado (cashback 80% + mejoras IA)
              </button>
            </div>
            <ErrorLine error={error ?? uploadError} />
          </div>
        </div>
      )}
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

export function BatchAdminControls({ batch }: { batch: { id: string; label: string; status: string } }) {
  const { pending, error, run } = useAction();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();

  async function uploadResult(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const prep = await createSondeoResultUploadUrl(batch.id, file.name);
      if (!prep.ok) {
        setUploadError(prep.error);
        return;
      }
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from("kaffetal-media").uploadToSignedUrl(prep.path, prep.token, file);
      if (upErr) {
        setUploadError("La subida falló. Intente de nuevo.");
        return;
      }
      const rec = await recordBatchResult(batch.id, prep.path, file.name);
      if (!rec.ok) setUploadError(rec.error);
      else router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {batch.status === "abierto" && (
        <button className="btn btn-sm" disabled={pending} onClick={() => run(() => lockBatch(batch.id))}>
          Cerrar sub-set para envío
        </button>
      )}
      {batch.status !== "abierto" && (
        <label className="btn btn-sm" style={{ cursor: uploading ? "wait" : "pointer" }}>
          {uploading ? "Subiendo…" : "Adjuntar resultados"}
          <input
            type="file"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadResult(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      <ErrorLine error={error ?? uploadError} />
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
