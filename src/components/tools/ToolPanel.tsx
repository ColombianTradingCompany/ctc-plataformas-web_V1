"use client";

import { useState } from "react";
import { TOOLS, type ToolId } from "@/lib/tools/catalog";
import styles from "./ToolPanel.module.css";

// Panel de opciones + visor. Lo comparten las tres superficies (Kaffetal Regal,
// Cherry Picked y el ECP): cada una le pasa su lista de herramientas y sus
// textos ya traducidos, así que el componente no sabe nada de idiomas.

export type ToolCopy = {
  id: ToolId;
  name: string;
  desc: string;
};

export type ToolPanelLabels = {
  /** Texto del botón que abre la herramienta en una pestaña propia. */
  openInTab: string;
  /** Instrucción cuando todavía no se eligió ninguna. */
  choose: string;
  /** Etiqueta accesible del grupo de opciones. */
  groupAria: string;
  /** Prefijo del title del iframe ("Herramienta: X"). */
  frameTitle: (name: string) => string;
};

export function ToolPanel({
  tools,
  labels,
  initial,
}: {
  tools: ToolCopy[];
  labels: ToolPanelLabels;
  /** Si se pasa, arranca con esa herramienta abierta en vez del panel vacío. */
  initial?: ToolId;
}) {
  const [active, setActive] = useState<ToolId | null>(initial ?? null);
  const activeCopy = tools.find((t) => t.id === active) ?? null;
  const activeDef = active ? TOOLS[active] : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.options} role="group" aria-label={labels.groupAria}>
        {tools.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
              aria-pressed={isActive}
              onClick={() => setActive(t.id)}
            >
              <span className={styles.optionTop}>
                <span className={styles.optionName}>{t.name}</span>
                <span className={styles.langTag}>{TOOLS[t.id].lang.toUpperCase()}</span>
              </span>
              <span className={styles.optionDesc}>{t.desc}</span>
            </button>
          );
        })}
      </div>

      {activeCopy && activeDef ? (
        <>
          <div className={styles.viewerHead}>
            <span className={styles.viewerTitle}>{activeCopy.name}</span>
            <div className={styles.viewerActions}>
              <a className="btn btn-sm" href={activeDef.src} target="_blank" rel="noopener noreferrer">
                {labels.openInTab}
              </a>
            </div>
          </div>
          <div className={styles.frameBox}>
            {/* key: fuerza un iframe nuevo al cambiar de herramienta, para que
                cada una arranque limpia en vez de heredar el estado anterior. */}
            <iframe
              key={activeDef.id}
              className={styles.frame}
              src={activeDef.src}
              title={labels.frameTitle(activeCopy.name)}
              loading="lazy"
              // Las herramientas son nuestras y autocontenidas, pero se les
              // concede lo mínimo: scripts y formularios sí; navegar la ventana
              // de arriba, no.
              sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
            />
          </div>
        </>
      ) : (
        <p className={styles.empty}>{labels.choose}</p>
      )}
    </div>
  );
}
