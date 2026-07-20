"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "../shared.module.css";

// Kanban-card variant of FincaModalRow: a compact miniCard-style button inside
// a board column that opens a popup with the full lead detail. Summary and
// children are server-rendered; this client wrapper only owns open/close.
// `anchorId` (2026-07-20): deep-link desde "Tareas pendientes de CTC" — con
// #<anchorId> en la URL, la tarjeta se desplaza a la vista y abre su modal.
export function LeadModalRow({
  summary,
  title,
  children,
  anchorId,
}: {
  summary: ReactNode;
  title: string;
  children: ReactNode;
  anchorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!anchorId) return;
    // Microtarea para no llamar setState sincrónicamente en el cuerpo del
    // efecto (regla react-hooks/set-state-in-effect — gotcha #3 del repo).
    Promise.resolve().then(() => {
      if (window.location.hash === `#${anchorId}`) {
        rowRef.current?.scrollIntoView({ block: "center" });
        setOpen(true);
      }
    });
  }, [anchorId]);

  return (
    <>
      <button type="button" id={anchorId} ref={rowRef} className={styles.leadCardBtn} onClick={() => setOpen(true)}>
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
