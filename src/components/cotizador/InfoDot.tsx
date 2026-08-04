"use client";

// La «i» de ayuda junto a una etiqueta. Es un <button>, no un <span> con title:
// así se alcanza con el teclado y el lector de pantalla lo anuncia. El texto va
// también en `title` para quien pase el ratón sin hacer clic.

import { useId, useState } from "react";
import styles from "./infoDot.module.css";

export function InfoDot({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.dot}
        aria-label={label ? `Qué es ${label}` : "Más información"}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        title={text}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open && (
        <span role="tooltip" id={id} className={styles.bubble}>
          {text}
        </span>
      )}
    </span>
  );
}
