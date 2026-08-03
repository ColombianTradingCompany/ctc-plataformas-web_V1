"use client";

// ── Coffeed · la consola de DIRECCIÓN (ECP) ──────────────────────────────────
// Reparto del 2026-08-03 (owner): el Estudio de Contenido PRODUCE, el ECP
// RECIBE y PUBLICA. La mitad de producción de esta consola —Medios, Selección,
// Propuestas, Posts— se fue al taller (`StudioConsole`, en /socios/
// estudio-contenido/panel/source-wrapper). Lo que queda aquí es dirección:
//
//   Entregas  · la cola: lo que mandan las apps del Estudio → luz verde
//   Muro      · el destino (lo publicado + los anuncios)
//   Identidad · la guía estética que TODAS las apps obedecen
//   Canon     · la memoria narrativa, en espejo y solo lectura
//
// La cola es UNA para todas las apps del Estudio: un carrusel del Source
// Wrapper, un episodio de Datawave o un incrustado de Instagram/YouTube entran
// por la misma puerta y se publican con el mismo botón.

import { useCallback, useEffect, useRef, useState } from "react";
import { addAnnouncement, deleteAnnouncement, getEcpConsole, toggleAnnouncementPinned } from "@/lib/coffeed/ecpActions";
import {
  acceptDeliverable,
  publishDeliverable,
  returnDeliverable,
  submitEmbedDeliverable,
  unpublishDeliverable,
} from "@/lib/coffeed/deliverableActions";
import {
  COFFEED_APP_LABEL,
  COFFEED_KIND_LABEL,
  type CoffeedDeliverable,
  type CoffeedEcpBundle,
  type CoffeedResult,
} from "@/lib/coffeed/types";
import { CanonView } from "./CanonView";
import { CoffeedBrandPanel } from "./CoffeedBrandPanel";
import { Ring } from "./Ring";
import styles from "./coffeedConsole.module.css";

type View = "entregas" | "muro" | "marca" | "canon";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

type RunFn = (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]) => Promise<boolean>;

export function CoffeedConsole() {
  const [bundle, setBundle] = useState<CoffeedEcpBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("entregas");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kicker: string; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((kicker: string, msg: string) => {
    setToast({ kicker, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5200);
  }, []);

  const refresh = useCallback(async () => {
    const b = await getEcpConsole();
    setBundle(b);
  }, []);

  // Solo .then() en el cuerpo del efecto — gotcha #3 (set-state-in-effect).
  useEffect(() => {
    getEcpConsole().then((b) => {
      setBundle(b);
      setLoading(false);
    });
  }, []);

  const run = useCallback<RunFn>(
    async (fn, okMsg) => {
      setBusy(true);
      const r = await fn();
      if (r.ok) await refresh();
      setBusy(false);
      if (!r.ok) showToast("No se pudo", r.error);
      else if (okMsg) showToast(okMsg[0], okMsg[1]);
      return r.ok;
    },
    [refresh, showToast]
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div />
        <div style={{ padding: 40 }}>
          <span className={styles.ringRow}>
            <Ring /> Cargando Coffeed…
          </span>
        </div>
      </div>
    );
  }
  if (!bundle) {
    return (
      <div className={styles.page}>
        <div />
        <div className={styles.empty}>
          <h3>Tu sesión no abre Coffeed</h3>
          <p>Coffeed vive en el ECP y necesita una credencial interna con acceso a esa consola.</p>
        </div>
      </div>
    );
  }

  const { deliverables, announcements, threads, brand } = bundle;
  const cola = deliverables.filter((d) => d.state === "entregado" || d.state === "devuelto");
  const listas = deliverables.filter((d) => d.state === "aceptado");
  const publicadas = deliverables.filter((d) => d.state === "publicado");

  const counts: Record<View, number | string> = {
    entregas: cola.length + listas.length,
    muro: publicadas.length + announcements.length,
    marca: brand.palette.length,
    canon: threads.filter((t) => t.state === "open").length,
  };

  const navItem = (v: View, label: string) => (
    <button className={styles.navItem} aria-current={view === v ? "page" : undefined} onClick={() => { setView(v); window.scrollTo(0, 0); }}>
      {label}
      <span className={styles.navCount}>{counts[v]}</span>
    </button>
  );

  return (
    <div className={styles.page}>
      <aside className={styles.rail}>
        <div className={styles.railBrand}>
          <span className={styles.railDot} />
          Coffeed
        </div>
        {navItem("entregas", "Entregas")}
        {navItem("muro", "Muro")}
        <hr className={styles.navRule} />
        {navItem("marca", "Identidad de marca")}
        {navItem("canon", "Canon")}
        <div className={styles.railNote}>
          <span className={styles.eyebrow}>La producción</span>
          <b>Estudio de Contenido</b>
          <small>El taller produce y entrega aquí; el muro se manda desde esta consola.</small>
        </div>
      </aside>

      <main>
        {view === "entregas" && <EntregasView cola={cola} listas={listas} busy={busy} run={run} />}
        {view === "muro" && <MuroView publicadas={publicadas} announcements={announcements} busy={busy} run={run} />}
        {view === "marca" && <CoffeedBrandPanel brand={brand} busy={busy} run={run} refresh={refresh} showToast={showToast} />}
        {view === "canon" && <CanonView threads={threads} mirror />}
      </main>

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <b>{toast.kicker}</b>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ENTREGAS — la cola compartida de las apps del Estudio
// ============================================================

/** La previsualización cambia con el tipo: el sobre es uno, el contenido no. */
function DeliverablePreview({ d }: { d: CoffeedDeliverable }) {
  if (d.kind === "carrusel") {
    return (
      <div className={styles.previewStrip}>
        {d.panels.map((p, i) => (
          <div key={p.position} className={styles.previewPanel}>
            <span className={styles.eyebrow}>
              {String(i + 1).padStart(2, "0")}
              {p.role ? ` · ${p.role}` : ""}
            </span>
            <p>{p.text}</p>
          </div>
        ))}
      </div>
    );
  }
  if (d.media?.embedUrl) {
    return (
      <div className={styles.previewMedia}>
        <iframe src={d.media.embedUrl} title={d.title} loading="lazy" allowFullScreen />
      </div>
    );
  }
  if (d.media) {
    return (
      <div className={styles.previewMedia}>
        <video src={d.media.url} poster={d.media.poster ?? undefined} controls preload="metadata" />
      </div>
    );
  }
  return <p className={styles.postExcerpt}>{d.excerpt ?? "Sin previsualización."}</p>;
}

function EntregasView({
  cola,
  listas,
  busy,
  run,
}: {
  cola: CoffeedDeliverable[];
  listas: CoffeedDeliverable[];
  busy: boolean;
  run: RunFn;
}) {
  const [returning, setReturning] = useState<CoffeedDeliverable | null>(null);
  const [note, setNote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareCaption, setShareCaption] = useState("");

  const card = (d: CoffeedDeliverable) => (
    <article key={d.id} className={`${styles.post} ${d.state === "devuelto" ? styles.postPinned : ""}`}>
      <div className={styles.postHead}>
        <span className={styles.eyebrow}>
          {COFFEED_KIND_LABEL[d.kind]} · {COFFEED_APP_LABEL[d.app]}
          {d.chapterNo != null ? ` · cap. ${d.chapterNo}` : ""}
        </span>
        <span className={styles.eyebrow}>
          {d.submittedBy ?? "Estudio"} · {fmtDate(d.submittedAt)}
        </span>
      </div>
      <div className={styles.postBody}>
        <h2 className={styles.postTitle}>{d.title}</h2>
        {d.state === "devuelto" && d.reviewNote && (
          <p className={styles.postExcerpt}>
            <b>Devuelta:</b> {d.reviewNote}
          </p>
        )}
        <DeliverablePreview d={d} />
      </div>
      <div className={styles.postFoot}>
        <span>{d.state === "devuelto" ? "Esperando corrección del taller" : d.state === "aceptado" ? "Con luz verde" : "En cola"}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {d.state === "entregado" && (
            <>
              <button
                className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}
                disabled={busy}
                onClick={() => {
                  setNote("");
                  setReturning(d);
                }}
              >
                Devolver
              </button>
              <button
                className={`${styles.btn} ${styles.btnGo} ${styles.btnSm}`}
                disabled={busy}
                onClick={() => run(() => acceptDeliverable(d.id), ["Luz verde", "La entrega quedó lista para publicar."])}
              >
                Dar luz verde
              </button>
            </>
          )}
          {d.state === "aceptado" && (
            <button
              className={`${styles.btn} ${styles.btnGo} ${styles.btnSm}`}
              disabled={busy}
              onClick={() => run(() => publishDeliverable(d.id), ["Publicado", "Ya está en el muro de toda la red."])}
            >
              Publicar
            </button>
          )}
        </span>
      </div>
    </article>
  );

  return (
    <section>
      <div className={styles.headRow}>
        <div className={styles.viewhead}>
          <span className={styles.eyebrow}>La cola</span>
          <h1>Entregas</h1>
          <p>
            Lo que manda el Estudio de Contenido, venga de la app que venga. <b>Producir es del taller; publicar es de aquí.</b>{" "}
            Una entrega con luz verde se puede publicar; una devuelta vuelve al taller con tu nota.
          </p>
        </div>
        <div className={styles.headActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setSharing(true)}>
            Compartir de Instagram / YouTube
          </button>
        </div>
      </div>

      {cola.length === 0 && listas.length === 0 ? (
        <div className={styles.empty}>
          <h3>No hay nada esperando</h3>
          <p>Cuando el Estudio entregue un carrusel, un episodio o un incrustado, aparecerá aquí para tu luz verde.</p>
        </div>
      ) : (
        <div className={styles.wall}>
          {cola.map(card)}
          {listas.map(card)}
        </div>
      )}

      {returning && (
        <>
          <button className={styles.scrim} aria-label="Cerrar" onClick={() => setReturning(null)} />
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <span className={styles.eyebrow}>Entrega</span>
                <h2>Devolver al taller</h2>
              </div>
              <button className={styles.iconbtn} aria-label="Cerrar" onClick={() => setReturning(null)}>
                ✕
              </button>
            </div>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Qué hay que corregir</span>
              <textarea
                className={styles.input}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="El panel 4 no está trazado; el cierre repite el titular…"
              />
            </label>
            <p className={styles.hint}>La entrega no se borra: vuelve al taller con tu nota y se puede re-entregar corregida.</p>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={() => setReturning(null)}>
                Cancelar
              </button>
              <button
                className={`${styles.btn} ${styles.btnStamp} ${styles.btnSm}`}
                style={{ marginLeft: "auto" }}
                disabled={busy}
                onClick={() =>
                  run(() => returnDeliverable(returning.id, note), ["Devuelta", "El taller ya tiene tu nota."]).then((ok) => {
                    if (ok) setReturning(null);
                  })
                }
              >
                Devolver
              </button>
            </div>
          </div>
        </>
      )}

      {sharing && (
        <>
          <button className={styles.scrim} aria-label="Cerrar" onClick={() => setSharing(false)} />
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <span className={styles.eyebrow}>Muro</span>
                <h2>Compartir contenido</h2>
              </div>
              <button className={styles.iconbtn} aria-label="Cerrar" onClick={() => setSharing(false)}>
                ✕
              </button>
            </div>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Título</span>
              <input className={styles.input} value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} placeholder="Qué es y por qué lo compartimos" />
            </label>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Enlace</span>
              <input
                className={styles.input}
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/… · https://youtu.be/…"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Pie (opcional)</span>
              <textarea className={styles.input} value={shareCaption} onChange={(e) => setShareCaption(e.target.value)} />
            </label>
            <p className={styles.hint}>
              Pega el enlace tal y como sale del navegador — reconoce publicaciones y reels de Instagram, y videos y shorts de
              YouTube. Entra en la cola como cualquier otra entrega: hay que darle luz verde antes de publicarla.
            </p>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={() => setSharing(false)}>
                Cancelar
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                style={{ marginLeft: "auto" }}
                disabled={busy}
                onClick={() =>
                  run(() => submitEmbedDeliverable({ title: shareTitle, url: shareUrl, caption: shareCaption }), [
                    "En cola",
                    "El incrustado espera tu luz verde.",
                  ]).then((ok) => {
                    if (ok) {
                      setSharing(false);
                      setShareTitle("");
                      setShareUrl("");
                      setShareCaption("");
                    }
                  })
                }
              >
                Añadir a la cola
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// ============================================================
// MURO
// ============================================================

function MuroView({
  publicadas,
  announcements,
  busy,
  run,
}: {
  publicadas: CoffeedDeliverable[];
  announcements: CoffeedEcpBundle["announcements"];
  busy: boolean;
  run: RunFn;
}) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [area, setArea] = useState("Dirección");
  const [pinned, setPinned] = useState(false);

  const posts: ({ kind: "ann"; a: CoffeedEcpBundle["announcements"][number] } | { kind: "item"; d: CoffeedDeliverable })[] = [
    ...announcements.filter((a) => a.pinned).map((a) => ({ kind: "ann" as const, a })),
    ...publicadas.map((d) => ({ kind: "item" as const, d })),
    ...announcements.filter((a) => !a.pinned).map((a) => ({ kind: "ann" as const, a })),
  ];

  return (
    <section>
      <div className={styles.headRow}>
        <div className={styles.viewhead}>
          <span className={styles.eyebrow}>El destino</span>
          <h1>Muro</h1>
          <p>
            Lo publicado y lo anunciado, en un solo sitio. <b>Este muro es el mismo</b> que ven Kaffetal Regal, Cherry Picked y
            el Directorio del Café: capítulos, videos, incrustados y anuncios viajan juntos a las tres superficies.
          </p>
        </div>
        <div className={styles.headActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setComposing(true)}>
            Escribir anuncio
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <h3>El muro está en blanco</h3>
          <p>Publica la primera entrega o escribe un anuncio para estrenarlo.</p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setComposing(true)}>
            Escribir anuncio
          </button>
        </div>
      ) : (
        <div className={styles.wall}>
          {posts.map((p) =>
            p.kind === "ann" ? (
              <article key={`a-${p.a.id}`} className={`${styles.post} ${p.a.pinned ? styles.postPinned : ""}`}>
                <div className={styles.postHead}>
                  <span className={styles.eyebrow}>Anuncio{p.a.pinned ? " · fijado" : ""}</span>
                  <span className={styles.eyebrow}>{p.a.area ?? "CTC"}</span>
                </div>
                <div className={styles.postBody}>
                  <h2 className={styles.postTitle}>{p.a.title}</h2>
                  {p.a.body && <p className={styles.postExcerpt}>{p.a.body}</p>}
                </div>
                <div className={styles.postFoot}>
                  <span>{fmtDate(p.a.publishedAt)}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={busy} onClick={() => run(() => toggleAnnouncementPinned(p.a.id, !p.a.pinned))}>
                      {p.a.pinned ? "Soltar" : "Fijar"}
                    </button>
                    <button className={`${styles.btn} ${styles.btnStamp} ${styles.btnSm}`} disabled={busy} onClick={() => run(() => deleteAnnouncement(p.a.id))}>
                      Borrar
                    </button>
                  </span>
                </div>
              </article>
            ) : (
              <article key={`d-${p.d.id}`} className={styles.post}>
                <div className={styles.postHead}>
                  <span className={styles.eyebrow}>
                    {p.d.kind === "carrusel" ? `Capítulo ${p.d.chapterNo ?? ""}`.trim() : COFFEED_KIND_LABEL[p.d.kind]}
                  </span>
                  <span className={styles.eyebrow}>
                    {p.d.kind === "carrusel" ? `${p.d.panels.length} paneles` : COFFEED_APP_LABEL[p.d.app]}
                  </span>
                </div>
                <div className={styles.postBody}>
                  <h2 className={styles.postTitle}>{p.d.title}</h2>
                  <p className={styles.postExcerpt}>{p.d.excerpt ?? p.d.panels[0]?.text ?? p.d.media?.caption ?? ""}</p>
                </div>
                <div className={styles.postFoot}>
                  <span>{fmtDate(p.d.publishedAt)}</span>
                  <span>En las tres superficies</span>
                  <button
                    className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}
                    style={{ marginLeft: "auto" }}
                    disabled={busy}
                    onClick={() => run(() => unpublishDeliverable(p.d.id), ["Retirado", "La entrega salió de los muros públicos."])}
                  >
                    Retirar
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}

      {composing && (
        <>
          <button className={styles.scrim} aria-label="Cerrar" onClick={() => setComposing(false)} />
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <span className={styles.eyebrow}>Muro</span>
                <h2>Escribir anuncio</h2>
              </div>
              <button className={styles.iconbtn} aria-label="Cerrar" onClick={() => setComposing(false)}>
                ✕
              </button>
            </div>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Título</span>
              <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qué pasa" />
            </label>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Cuerpo</span>
              <textarea className={styles.input} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Qué necesita saber la red y para cuándo" />
            </label>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Área</span>
              <input className={styles.input} value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Fijar arriba del muro
            </label>
            <p className={styles.hint}>El anuncio se verá también en Kaffetal Regal, Cherry Picked y el Directorio.</p>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={() => setComposing(false)}>
                Cancelar
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                style={{ marginLeft: "auto" }}
                disabled={busy}
                onClick={() =>
                  run(() => addAnnouncement({ title, body, area, pinned }), ["Publicado", "El anuncio ya está en el muro de la red."]).then((ok) => {
                    if (ok) {
                      setComposing(false);
                      setTitle("");
                      setBody("");
                      setPinned(false);
                    }
                  })
                }
              >
                Publicar
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
