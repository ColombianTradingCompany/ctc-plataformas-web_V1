"use client";

import { useState, type ReactNode } from "react";
import styles from "../shared.module.css";

// Compact clickable finca row that opens a popup panel with the full detail
// (approve/reject, EUDR editor, comm log). Keeps the Fincas list scannable
// instead of a wall of tall cards. `summary` and `children` are server-rendered
// and passed in as props; this client wrapper only owns the open/close state.
export function FincaModalRow({ summary, title, children }: { summary: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.fincaRow} onClick={() => setOpen(true)}>
        <span style={{ flex: 1, minWidth: 0 }}>{summary}</span>
        <span className={styles.fincaRowChevron} aria-hidden>
          ›
        </span>
      </button>
      {open && (
        <div className="modal-bg open" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
            <h3>{title}</h3>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
