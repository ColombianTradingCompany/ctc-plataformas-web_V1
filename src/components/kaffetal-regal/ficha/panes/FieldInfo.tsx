"use client";

import { useState } from "react";
import styles from "../../FichaView.module.css";

export function FieldInfo({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Más información"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 11, padding: 0, marginLeft: 4 }}
      >
        ⓘ
      </button>
      {open && <p className={styles.fexample} style={{ marginTop: 2, fontWeight: 400 }}>{text}</p>}
    </>
  );
}
