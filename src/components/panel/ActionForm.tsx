"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/shared.module.css";

// ── Por qué existe este componente (auditoría 2026-07-18) ────────────────────
// Un `throw` dentro de una Server Action enlazada como `<form action={fn}>` NO
// se puede atrapar en el cliente: React lo manda al error boundary y REVIENTA
// la página entera. Ya nos pasó una vez con "Confirmar recibido" (V12) y se
// arregló SOLO para esa acción; la auditoría encontró el mismo patrón vivo en
// publishLot (hoy `declararEnCatalogo`, V5.196), signContract, approveFinca y setFincaCertShared — todas con
// rechazos de negocio ALCANZABLES (no es miembro del Club, falta contrato,
// falta polígono EUDR…), es decir, clics normales que tumbaban el tablero.
//
// Encima, en producción Next REDACTA el mensaje de un throw de Server Action,
// así que ni siquiera se vería el motivo: solo un error genérico.
//
// La solución es la que ya usa el resto del repo: la acción DEVUELVE un
// resultado y el rechazo se muestra inline. Este componente generaliza ese
// patrón para cualquier formulario del panel.

// V5.203: `aviso` (opcional) = lo principal se hizo, pero algo de después no (p. ej. el pago quedó y la compra no entró al stock). Se
// pinta en ámbar; nunca se traga en silencio (regla de la casa) y no invita a repetir lo que ya se hizo.
export type ActionResult = { ok: true; aviso?: string } | { ok: false; error: string };

// V5.203 (owner, 2026-10-10 — «CTCx Compras no parece estar funcionando bien»): una compra a mano se registraba sin decir nada y el
// formulario quedaba lleno, así que un segundo clic la registraba dos veces. Tres props OPCIONALES (los usos de antes no cambian):
// `successMessage` (se dice al salir bien), `resetOnSuccess` (el formulario vuelve a vacío) y `onSuccess` (solo desde un componente
// cliente: un servidor no puede pasar funciones).

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
  successMessage,
  resetOnSuccess = false,
  onSuccess,
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
  successMessage?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <form
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        setError(null);
        setListo(null);
        setAviso(null);
        startTransition(async () => {
          const res = await action(formData);
          if (res.ok) {
            if (resetOnSuccess) form.reset();
            // V5.203 · corrección (H12): con un aviso, el éxito no se canta a la vez («ya está en el stock» junto a «no entró al stock»).
            if (successMessage && !res.aviso) setListo(successMessage);
            if (res.aviso) setAviso(res.aviso);
            onSuccess?.();
            router.refresh();
          } else setError(res.error);
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
      {aviso && !error && (
        <p className={styles.warn} role="status" style={{ marginTop: 8 }}>
          {aviso}
        </p>
      )}
      {listo && !error && (
        <p role="status" style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: "#166534" }}>
          {listo}
        </p>
      )}
    </form>
  );
}
