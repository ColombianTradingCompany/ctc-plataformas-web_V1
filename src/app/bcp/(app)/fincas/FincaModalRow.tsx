"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "../shared.module.css";

// Compact clickable finca row that opens a popup panel with the full detail
// (approve/reject, EUDR editor, comm log). Keeps the Fincas list scannable
// instead of a wall of tall cards. `summary` and `children` are server-rendered
// and passed in as props; this client wrapper only owns the open/close state.
//
// `anchorId` (2026-07-20): permite DEEP-LINKS desde "Tareas pendientes de CTC"
// — si la URL llega con #<anchorId>, la fila se desplaza a la vista y abre su
// modal sola, aterrizando exactamente en el elemento al que refiere la tarea.
export function FincaModalRow({
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
      <button type="button" id={anchorId} ref={rowRef} className={styles.fincaRow} onClick={() => setOpen(true)}>
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
