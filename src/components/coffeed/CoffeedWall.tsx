"use client";

// ── Coffeed · el muro en las superficies ─────────────────────────────────────
// El mismo componente de solo-lectura montado en Kaffetal Regal (módulo del
// hub), Cherry Picked (sección) y el Directorio (pestaña).
//
// 2026-07-30 (decisión del owner): el muro es EL MISMO dondequiera que se
// muestre Coffeed — capítulos publicados Y anuncios, mezclados por fecha con
// los fijados arriba. Antes los anuncios se quedaban en la consola; ya no.
// Carga sus propios datos: la superficie no tiene que enhebrar nada.

import { useEffect, useState } from "react";
import { getCoffeedWall } from "@/lib/coffeed/wallActions";
import { coffeedFontStack, type CoffeedWallBundle } from "@/lib/coffeed/types";
import styles from "./coffeedWall.module.css";

export type CoffeedWallLabels = {
  chapter: string;
  panels: string;
  announcement: string;
  pinned: string;
  emptyTitle: string;
  emptyBody: string;
  loading: string;
};

const ES: CoffeedWallLabels = {
  chapter: "Capítulo",
  panels: "paneles",
  announcement: "Anuncio",
  pinned: "fijado",
  emptyTitle: "El primer capítulo está en producción",
  emptyBody: "Coffeed es el noticiero de la red CTC: capítulos breves sobre el mercado del café, en paneles. Vuelve pronto.",
  loading: "Cargando el muro…",
};

export function CoffeedWall({ labels = ES, accent }: { labels?: CoffeedWallLabels; accent?: string }) {
  const [data, setData] = useState<CoffeedWallBundle | null>(null);

  useEffect(() => {
    let active = true;
    getCoffeedWall().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, []);

  const style: React.CSSProperties = {};
  if (accent) (style as Record<string, string>)["--cw-accent"] = accent;

  if (data === null) {
    return (
      <div className={styles.wall} style={style}>
        <span className={styles.eyebrow}>{labels.loading}</span>
      </div>
    );
  }

  // La tipografía de marca solo viste los bloques estándar del muro (titulares
  // y paneles), no el texto de la superficie que lo hospeda.
  const brandFont = coffeedFontStack(data.brand.fontFamily);
  const items: ({ kind: "ann"; id: string } | { kind: "ch"; id: string })[] = [
    ...data.announcements.filter((a) => a.pinned).map((a) => ({ kind: "ann" as const, id: a.id })),
    ...data.chapters.map((c) => ({ kind: "ch" as const, id: c.draftId })),
    ...data.announcements.filter((a) => !a.pinned).map((a) => ({ kind: "ann" as const, id: a.id })),
  ];

  if (items.length === 0) {
    return (
      <div className={styles.wall} style={style}>
        <div className={styles.empty}>
          <h4 style={{ fontFamily: brandFont }}>{labels.emptyTitle}</h4>
          <p>{labels.emptyBody}</p>
        </div>
      </div>
    );
  }

  const annById = new Map(data.announcements.map((a) => [a.id, a]));
  const chById = new Map(data.chapters.map((c) => [c.draftId, c]));

  return (
    <div className={styles.wall} style={style}>
      {items.map((it) => {
        if (it.kind === "ann") {
          const a = annById.get(it.id)!;
          return (
            <article key={`a-${a.id}`} className={`${styles.post} ${a.pinned ? styles.postPinned : ""}`}>
              <div className={styles.postHead}>
                <span className={`${styles.eyebrow} ${styles.chapterNo}`}>
                  {labels.announcement}
                  {a.pinned ? ` · ${labels.pinned}` : ""}
                </span>
                <span className={styles.eyebrow}>
                  {a.area ?? data.brand.companyName}
                  {a.publishedAt ? ` · ${new Date(a.publishedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                </span>
              </div>
              <h3 className={styles.postTitle} style={{ fontFamily: brandFont }}>
                {a.title}
              </h3>
              {a.body && <p className={styles.annBody}>{a.body}</p>}
            </article>
          );
        }
        const c = chById.get(it.id)!;
        return (
          <article key={`c-${c.draftId}`} className={styles.post}>
            <div className={styles.postHead}>
              <span className={`${styles.eyebrow} ${styles.chapterNo}`}>
                {labels.chapter} {c.chapterNo}
              </span>
              <span className={styles.eyebrow}>
                {c.panels.length} {labels.panels}
                {c.publishedAt ? ` · ${new Date(c.publishedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}` : ""}
              </span>
            </div>
            <h3 className={styles.postTitle} style={{ fontFamily: brandFont }}>
              {c.title}
            </h3>
            <div className={styles.strip}>
              {c.panels.map((p, i) => (
                <div key={p.position} className={[styles.panel, i === 0 ? styles.panelFirst : "", i === c.panels.length - 1 ? styles.panelLast : ""].join(" ")}>
                  <span className={styles.panelBar}>
                    {String(i + 1).padStart(2, "0")}
                    {p.role ? ` · ${p.role}` : ""}
                  </span>
                  <span className={styles.panelBody}>
                    <p className={styles.panelText} style={{ fontFamily: brandFont }}>
                      {p.text}
                    </p>
                  </span>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
