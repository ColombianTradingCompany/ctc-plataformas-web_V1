"use client";

// ── Campo de contraseña con "ojo" ────────────────────────────────────────────
// UNO para toda la plataforma (2026-08-04). Hay 16 campos de contraseña en 11
// ficheros repartidos por seis mundos de estilo distintos —el login maestro,
// los socios, KR, Cherry Picked, el Directorio, Terratalento, los candados del
// ECP— y ninguno debía llevar su propio interruptor copiado.
//
// Reemplaza `<input type="password" …/>` tal cual: acepta todas las props de un
// input y pasa el resto. No impone estilo; la superficie que lo monta sigue
// vistiéndolo con su propio CSS (ver PasswordField.module.css).
//
// Detalles que importan:
//   · `type="button"` en el botón — dentro de un <form>, un <button> sin type
//     es submit y mirar la contraseña enviaría el formulario.
//   · El botón SÍ está en el orden de tabulación: quitarlo del teclado deja la
//     función solo para quien usa ratón.
//   · El estado no se recuerda entre montajes a propósito: cada campo empieza
//     oculto, siempre.

import { useId, useState } from "react";
import styles from "./PasswordField.module.css";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Clase para el envoltorio, si la superficie necesita colocarlo. */
  wrapClassName?: string;
  /** Igual que wrapClassName pero en línea: el envoltorio pasa a ser el que
   *  ocupa el hueco del input, así que los anchos (maxWidth en una fila flex,
   *  p. ej.) van AQUÍ, no en el input. */
  wrapStyle?: React.CSSProperties;
};

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

export function PasswordField({ wrapClassName, wrapStyle, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const fallbackId = useId();
  const inputId = rest.id ?? fallbackId;

  return (
    <span className={wrapClassName ? `${styles.wrap} ${wrapClassName}` : styles.wrap} style={wrapStyle}>
      <input {...rest} id={inputId} type={show ? "text" : "password"} />
      <button
        type="button"
        className={styles.btn}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        aria-pressed={show}
        aria-controls={inputId}
        title={show ? "Ocultar" : "Mostrar"}
      >
        <EyeIcon off={show} />
      </button>
    </span>
  );
}
