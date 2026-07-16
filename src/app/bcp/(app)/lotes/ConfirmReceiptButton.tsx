"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmSampleReceived } from "../actions";
import styles from "../shared.module.css";

// El botón que antes reventaba la página: era un <form action> inline y
// confirmSampleReceived lanzaba en cada compuerta incumplida — un throw en una
// Server Action de formulario cae al error boundary de Next (el "crash").
// Ahora la acción devuelve resultado y el rechazo se muestra aquí, con las dos
// compuertas previas (EUDR → inscripción) visibles ANTES de hacer clic.
export function ConfirmReceiptButton({
  lotId,
  eudrReady,
  eudrLabel,
  inscriptionSettled,
}: {
  lotId: string;
  eudrReady: boolean;
  eudrLabel: string;
  inscriptionSettled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmSampleReceived(lotId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span className={`${styles.badge} ${eudrReady ? styles.badgeGood : styles.badgeWarn}`}>
          {eudrReady ? "EUDR ✓" : `EUDR: ${eudrLabel}`}
        </span>
        <span className={`${styles.badge} ${inscriptionSettled ? styles.badgeGood : styles.badgeWarn}`}>
          {inscriptionSettled ? "Inscripción ✓" : "Inscripción pendiente"}
        </span>
      </div>
      <button className="btn btn-sm btn-solid" onClick={confirm} disabled={pending}>
        {pending ? "Confirmando…" : "Confirmar recibido → Muestras Recibidas"}
      </button>
      {error && (
        <p className={styles.warn} style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
