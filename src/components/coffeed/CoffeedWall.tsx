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
import { coffeedFontStack, type CoffeedMedia, type CoffeedWallBundle } from "@/lib/coffeed/types";
import styles from "./coffeedWall.module.css";

/** "9:16" → "9 / 16". Cada proveedor trae su proporción natural por defecto. */
function aspectOf(media: CoffeedMedia): string {
  const m = media.aspect?.match(/^(\d+)\s*[:/]\s*(\d+)$/);
  if (m) return `${m[1]} / ${m[2]}`;
  if (media.provider === "youtube") return "16 / 9";
  if (media.provider === "instagram") return "4 / 5";
  return "9 / 16"; // el escenario de Datawave
}

/** El medio del muro: iframe para lo incrustado, <video> para el archivo propio. */
function WallMedia({ media, title }: { media: CoffeedMedia; title: string }) {
  const style = { ["--cw-aspect" as string]: aspectOf(media) } as React.CSSProperties;
  const cls = [styles.media, media.provider === "instagram" ? styles.mediaInstagram : ""].join(" ");

  if (media.embedUrl) {
    return (
      <div className={cls} style={style}>
        <iframe
          src={media.embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className={cls} style={style}>
      <video src={media.url} poster={media.poster ?? undefined} controls preload="metadata" playsInline />
    </div>
  );
}

export type CoffeedWallLabels = {
  chapter: string;
  panels: string;
  announcement: string;
  pinned: string;
  video: string;
  shared: string;
  /** RT-Scriptor. Opcional a propósito: las superficies que ya traen su propio
   *  juego de etiquetas (Cherry Picked en inglés) no se rompen al añadirla. */
  storyboard?: string;
  emptyTitle: string;
  emptyBody: string;
  loading: string;
};

const ES: CoffeedWallLabels = {
  chapter: "Capítulo",
  panels: "paneles",
  announcement: "Anuncio",
  pinned: "fijado",
  video: "Video",
  shared: "Compartido",
  storyboard: "Guion",
  emptyTitle: "El primer capítulo está en producción",
  emptyBody: "Coffeed es el noticiero de la red CTC: capítulos breves sobre el mercado del café, en paneles. Vuelve pronto.",
  loading: "Cargando el muro…",
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

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
  const items: ({ kind: "ann"; id: string } | { kind: "item"; id: string })[] = [
    ...data.announcements.filter((a) => a.pinned).map((a) => ({ kind: "ann" as const, id: a.id })),
    ...data.items.map((c) => ({ kind: "item" as const, id: c.id })),
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
  const itemById = new Map(data.items.map((c) => [c.id, c]));

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
                  {a.publishedAt ? ` · ${fmtDay(a.publishedAt)}` : ""}
                </span>
              </div>
              <h3 className={styles.postTitle} style={{ fontFamily: brandFont }}>
                {a.title}
              </h3>
              {a.body && <p className={styles.annBody}>{a.body}</p>}
            </article>
          );
        }
        const c = itemById.get(it.id)!;
        // El carrusel numera capítulo; el video y el incrustado no entran en
        // esa serie — llevan su propia etiqueta.
        const stamp =
          c.kind === "carrusel"
            ? `${labels.chapter} ${c.chapterNo ?? ""}`.trim()
            : c.kind === "video"
              ? labels.video
              : c.kind === "guion"
                ? (labels.storyboard ?? "Guion")
                : labels.shared;
        const meta =
          c.kind === "carrusel"
            ? `${c.panels.length} ${labels.panels}`
            : c.kind === "guion"
              ? `${c.guion?.frames.length ?? 0} · ${data.brand.companyName}`
              : (c.media?.provider === "youtube" ? "YouTube" : c.media?.provider === "instagram" ? "Instagram" : data.brand.companyName);

        return (
          <article key={`c-${c.id}`} className={styles.post}>
            <div className={styles.postHead}>
              <span className={`${styles.eyebrow} ${styles.chapterNo}`}>{stamp}</span>
              <span className={styles.eyebrow}>
                {meta}
                {c.publishedAt ? ` · ${fmtDay(c.publishedAt)}` : ""}
              </span>
            </div>
            <h3 className={styles.postTitle} style={{ fontFamily: brandFont }}>
              {c.title}
            </h3>

            {c.kind === "carrusel" && (
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
            )}

            {(c.kind === "video" || c.kind === "embed") && c.media && <WallMedia media={c.media} title={c.title} />}

            {/* RT-Scriptor: la tira de fotogramas se lee como se leería un
                tablero — de izquierda a derecha, con el pie de cada cuadro. */}
            {c.kind === "guion" && c.guion && (
              <div className={styles.strip}>
                {c.guion.frames.map((f, i) => (
                  <div
                    key={i}
                    className={[styles.panel, i === 0 ? styles.panelFirst : "", i === c.guion!.frames.length - 1 ? styles.panelLast : ""].join(" ")}
                  >
                    <span className={styles.panelBar}>{f.label}</span>
                    <span className={styles.panelBody}>
                      <img src={f.url} alt={f.label} style={{ width: "100%", display: "block" }} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {c.excerpt && c.kind !== "carrusel" && <p className={styles.caption}>{c.excerpt}</p>}
            {c.media?.caption && <p className={styles.caption}>{c.media.caption}</p>}
          </article>
        );
      })}
    </div>
  );
}
