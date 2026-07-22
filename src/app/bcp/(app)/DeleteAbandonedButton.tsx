"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./shared.module.css";

// Botón de "eliminar abandonado" (V2.0): confirmación + resultado inline. La
// REGLA vive en el servidor (deleteAbandonedLot/deleteAbandonedFinca exigen
// >10 días sin actividad); este botón solo confirma y muestra el rechazo.

export function DeleteAbandonedButton({
  action,
  confirmText,
  label = "Eliminar (abandonado)",
}: {
  action: () => Promise<{ ok: true } | { ok: false; error: string }>;
  confirmText: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button
        type="button"
        className="btn btn-sm"
        style={{ borderColor: "var(--red)", color: "var(--red)" }}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          setError(null);
          startTransition(async () => {
            const res = await action();
            if (res.ok) router.refresh();
            else setError(res.error);
          });
        }}
      >
        {pending ? "Eliminando…" : label}
      </button>
      {error && <span className={styles.warn} style={{ fontSize: 11.5 }}>{error}</span>}
    </span>
  );
}
