"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./shared.module.css";

// ── Por qué existe este componente (auditoría 2026-07-18) ────────────────────
// Un `throw` dentro de una Server Action enlazada como `<form action={fn}>` NO
// se puede atrapar en el cliente: React lo manda al error boundary y REVIENTA
// la página entera. Ya nos pasó una vez con "Confirmar recibido" (V12) y se
// arregló SOLO para esa acción; la auditoría encontró el mismo patrón vivo en
// publishLot, signContract, approveFinca y setFincaCertShared — todas con
// rechazos de negocio ALCANZABLES (no es miembro del Club, falta contrato,
// falta polígono EUDR…), es decir, clics normales que tumbaban el tablero.
//
// Encima, en producción Next REDACTA el mensaje de un throw de Server Action,
// así que ni siquiera se vería el motivo: solo un error genérico.
//
// La solución es la que ya usa el resto del repo: la acción DEVUELVE un
// resultado y el rechazo se muestra inline. Este componente generaliza ese
// patrón para cualquier formulario del panel.

export type ActionResult = { ok: true } | { ok: false; error: string };

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Guardando…",
  buttonClassName = "btn btn-sm btn-solid",
  buttonStyle,
  className,
  style,
  disabled,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const res = await action(formData);
          if (res.ok) router.refresh();
          else setError(res.error);
        });
      }}
    >
      {children}
      <button className={buttonClassName} style={buttonStyle} type="submit" disabled={pending || disabled}>
        {pending ? pendingLabel : submitLabel}
      </button>
      {error && (
        <p className={styles.warn} style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </form>
  );
}
