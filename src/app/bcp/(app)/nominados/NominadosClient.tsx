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
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");

  return (
    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span className={`${styles.badge} ${sampleReady ? styles.badgeGood : styles.badgeWarn}`}>
          {sampleReady ? "Muestra organizada ✓" : "Muestra por organizar"}
        </span>
        {batchId && (
          <span className={`${styles.badge} ${batchStatus === "abierto" ? "" : styles.badgeGood}`}>
            {batchStatus === "abierto" ? "En envío (abierto)" : batchStatus === "cerrado" ? "Envío cerrado · esperando resultados" : "Resultados recibidos"}
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
      <div>
        <button className="btn btn-sm" onClick={() => setVerdictOpen((v) => !v)}>
          Registrar resultado…
        </button>
        {verdictOpen && (
          <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
            <textarea
              rows={2}
              placeholder="Resultado del laboratorio / catación (el productor lo verá)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <input
              placeholder="Puntaje (opcional)"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              style={{ maxWidth: 160 }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                className="btn btn-sm btn-solid"
                disabled={pending || !notes.trim()}
                onClick={() => run(() => recordSondeoResult(lotId, "aprobado", notes, score ? Number(score) : undefined))}
              >
                Aprobado → En Fila
              </button>
              <button
                className="btn btn-sm"
                disabled={pending || !notes.trim()}
                onClick={() => run(() => recordSondeoResult(lotId, "rechazado", notes, score ? Number(score) : undefined))}
              >
                Rechazado (cashback 80% + mejoras IA)
              </button>
            </div>
          </div>
        )}
      </div>
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
