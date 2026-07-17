"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markLotApto, markLotNoApto } from "../actions";
import styles from "../shared.module.css";

// El veredicto de la Evaluación Documental (EVA): Apto abre el tramo pagado de
// la Arena; No Apto exige una razón que el productor verá en su panel. Mismo
// patrón que ConfirmReceiptButton: la acción devuelve resultado y el rechazo se
// muestra inline — nunca lanza (un throw en una form action revienta la página).
export function EvaVerdictButtons({
  lotId,
  eudrReady,
  eudrLabel,
}: {
  lotId: string;
  eudrReady: boolean;
  eudrLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  function apto() {
    setError(null);
    startTransition(async () => {
      const res = await markLotApto(lotId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function noApto() {
    setError(null);
    startTransition(async () => {
      const res = await markLotNoApto(lotId, reason);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div style={{ marginTop: 10, borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span className={`${styles.badge} ${eudrReady ? styles.badgeGood : styles.badgeWarn}`}>
          {eudrReady ? "EUDR ✓" : `EUDR: ${eudrLabel}`}
        </span>
        <span className={styles.badge}>Veredicto EVA</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-sm btn-solid" onClick={apto} disabled={pending}>
          {pending ? "Guardando…" : "Declarar Apto → Nominados"}
        </button>
        <button className="btn btn-sm" onClick={() => setShowReason((v) => !v)} disabled={pending}>
          No Apto…
        </button>
      </div>
      {showReason && (
        <div style={{ marginTop: 8 }}>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Razón del No Apto (el productor la verá en su panel)"
            style={{ width: "100%" }}
          />
          <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={noApto} disabled={pending || !reason.trim()}>
            Confirmar No Apto
          </button>
        </div>
      )}
      {error && (
        <p className={styles.warn} style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
