"use client";

import styles from "./coffeedConsole.module.css";

/**
 * Anillo de progreso. Con `value` (0–1) dibuja el avance real; sin él gira
 * indeterminado — que es el caso de los agentes: una Server Action no puede
 * reportar avance parcial, así que lo honesto es un giro, no una barra falsa.
 */
export function Ring({ value }: { value?: number }) {
  const R = 7;
  const C = 2 * Math.PI * R;
  return (
    <svg className={styles.ring} viewBox="0 0 18 18" aria-hidden>
      <circle className={styles.ringTrack} cx="9" cy="9" r={R} fill="none" strokeWidth="2.4" />
      <circle
        className={value === undefined ? styles.ringHead : undefined}
        stroke="var(--stamp, #a3241b)"
        cx="9"
        cy="9"
        r={R}
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={value === undefined ? `${C * 0.28} ${C}` : `${C * Math.max(0, Math.min(1, value))} ${C}`}
        transform="rotate(-90 9 9)"
      />
    </svg>
  );
}
