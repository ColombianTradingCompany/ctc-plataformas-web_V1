"use client";

import { useEffect } from "react";

// Caja de diálogo del directorio. Cierra con Escape, con la ✕ y tocando el
// fondo — igual que el prototipo, pero el fondo se distingue del contenido
// comparando el target con currentTarget en vez de mirar la clase CSS.
export function Modal({
  titulo,
  eyebrow,
  ancho,
  onClose,
  children,
  pie,
}: {
  titulo: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Ancho máximo de la caja; por defecto el de la hoja (620px). */
  ancho?: number;
  onClose: () => void;
  children: React.ReactNode;
  pie?: React.ReactNode;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onClose]);

  return (
    <div
      className="modal abierto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal__caja" style={ancho ? { width: `min(${ancho}px,100%)` } : undefined}>
        <div className="cinta-h" />
        <div className="modal__top">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h3>{titulo}</h3>
          </div>
          <button className="modal__cerrar" onClick={onClose} aria-label="Cerrar" type="button">
            ×
          </button>
        </div>
        {children}
        {pie ? <div className="modal__pie">{pie}</div> : null}
      </div>
    </div>
  );
}
