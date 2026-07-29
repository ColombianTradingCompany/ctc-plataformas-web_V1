"use client";

// ── Coffeed · el muro en las superficies ─────────────────────────────────────
// El mismo componente de solo-lectura montado en Kaffetal Regal (módulo del
// hub), Cherry Picked (sección) y el Directorio (pestaña): capítulos
// PUBLICADOS por el Estudio de Contenido, cada uno como carrusel de paneles.
// Carga sus propios datos vía getCoffeedWall() — la superficie no tiene que
// enhebrar nada por sus props de datos.

import { useEffect, useState } from "react";
import { getCoffeedWall } from "@/lib/coffeed/wallActions";
import type { CoffeedWallChapter } from "@/lib/coffeed/types";
import styles from "./coffeedWall.module.css";

export type CoffeedWallLabels = {
  chapter: string; // "Capítulo"
  panels: string; // "paneles"
  emptyTitle: string;
  emptyBody: string;
  loading: string;
};

const ES: CoffeedWallLabels = {
  chapter: "Capítulo",
  panels: "paneles",
  emptyTitle: "El primer capítulo está en producción",
  emptyBody: "Coffeed es el noticiero de la red CTC: capítulos breves sobre el mercado del café, en paneles. Vuelve pronto.",
  loading: "Cargando el muro…",
};

export function CoffeedWall({ labels = ES, accent }: { labels?: CoffeedWallLabels; accent?: string }) {
  const [chapters, setChapters] = useState<CoffeedWallChapter[] | null>(null);

  useEffect(() => {
    let active = true;
    getCoffeedWall().then((c) => {
      if (active) setChapters(c);
    });
    return () => {
      active = false;
    };
  }, []);

  const style = accent ? ({ "--cw-accent": accent } as React.CSSProperties) : undefined;

  if (chapters === null) {
    return (
      <div className={styles.wall} style={style}>
        <span className={styles.eyebrow}>{labels.loading}</span>
      </div>
    );
  }
  if (chapters.length === 0) {
    return (
      <div className={styles.wall} style={style}>
        <div className={styles.empty}>
          <h4>{labels.emptyTitle}</h4>
          <p>{labels.emptyBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wall} style={style}>
      {chapters.map((c) => (
        <article key={c.draftId} className={styles.post}>
          <div className={styles.postHead}>
            <span className={`${styles.eyebrow} ${styles.chapterNo}`}>
              {labels.chapter} {c.chapterNo}
            </span>
            <span className={styles.eyebrow}>
              {c.panels.length} {labels.panels}
              {c.publishedAt
                ? ` · ${new Date(c.publishedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`
                : ""}
            </span>
          </div>
          <h3 className={styles.postTitle}>{c.title}</h3>
          <div className={styles.strip}>
            {c.panels.map((p, i) => (
              <div
                key={p.position}
                className={[styles.panel, i === 0 ? styles.panelFirst : "", i === c.panels.length - 1 ? styles.panelLast : ""].join(" ")}
              >
                <span className={styles.panelBar}>
                  {String(i + 1).padStart(2, "0")}
                  {p.role ? ` · ${p.role}` : ""}
                </span>
                <span className={styles.panelBody}>
                  <p className={styles.panelText}>{p.text}</p>
                </span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
