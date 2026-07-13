"use client";

import { useState, type ReactNode } from "react";
import styles from "../shared.module.css";

// Kanban-card variant of FincaModalRow: a compact miniCard-style button inside
// a board column that opens a popup with the full lead detail. Summary and
// children are server-rendered; this client wrapper only owns open/close.
export function LeadModalRow({ summary, title, children }: { summary: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.leadCardBtn} onClick={() => setOpen(true)}>
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
