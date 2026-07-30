"use client";

// ── Coffeed · la consola editorial del ECP ───────────────────────────────────
// Desde el 2026-07-30 el módulo vive en el ECP (dirección): la narrativa de la
// red la decide CTC. El índice del módulo es un sub-rail propio — el rail del
// ECP sigue mandando por fuera; este solo ordena las siete vistas:
//
//   Muro            · el destino (capítulos publicados + anuncios)
//   Canon           · la memoria narrativa
//   Identidad       · la guía estética que fuerza que todo se vea igual
//   ── Producción ──
//   Medios de Consulta   · qué se puede consultar (lista blanca validada)
//   Selección de Fuentes · barrido de 7 días + triaje + selección
//   Propuestas           · extracción (backend) → 3 ángulos → Crear Post
//   Posts en Fila        · el post terminado → publicar

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addAnnouncement,
  addManualItem,
  closeCycleEmpty,
  deleteAnnouncement,
  getCoffeedConsole,
  removeEntry,
  removeSource,
  setDecision,
  setSourceList,
  startCycle,
  toggleAnnouncementPinned,
  unpublishPost,
  updateEntryTriage,
} from "@/lib/coffeed/actions";
import { runTriage, sweepSources, validateSourceUrl } from "@/lib/coffeed/aiActions";
import { runExtraction } from "@/lib/coffeed/aiActions";
import type {
  CoffeedConsoleBundle,
  CoffeedItemKind,
  CoffeedResult,
  CoffeedSample,
  CoffeedSource,
  CoffeedThread,
} from "@/lib/coffeed/types";
import { CoffeedBrandPanel } from "./CoffeedBrandPanel";
import { PostsView, PropuestasView } from "./CoffeedPipeline";
import { Ring } from "./Ring";
import styles from "./coffeedConsole.module.css";

type View = "muro" | "canon" | "marca" | "medios" | "seleccion" | "propuestas" | "posts";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export function CoffeedConsole() {
  const [bundle, setBundle] = useState<CoffeedConsoleBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("muro");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kicker: string; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((kicker: string, msg: string) => {
    setToast({ kicker, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5200);
  }, []);

  const refresh = useCallback(async () => {
    const b = await getCoffeedConsole();
    setBundle(b);
  }, []);

  // Solo .then() en el cuerpo del efecto — gotcha #3 (set-state-in-effect).
  useEffect(() => {
    getCoffeedConsole().then((b) => {
      setBundle(b);
      setLoading(false);
    });
  }, []);

  const run = useCallback(
    async (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]): Promise<boolean> => {
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

  const { openCycle, cycles, samples, sources, threads, brand } = bundle;
  const picked = samples.filter((s) => s.decision === "picked");
  const counts: Record<View, number | string> = {
    muro: bundle.chapters.length + bundle.announcements.length,
    canon: threads.filter((t) => t.state === "open").length,
    marca: brand.palette.length,
    medios: sources.filter((s) => s.list === "white" && s.status === "approved").length,
    seleccion: openCycle ? picked.length : "—",
    propuestas: cycles.filter((c) => ["extrayendo", "extraido", "propuestas"].includes(c.status)).length,
    posts: cycles.filter((c) => ["post", "listo"].includes(c.status)).length,
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
        {navItem("muro", "Muro")}
        <hr className={styles.navRule} />
        {navItem("canon", "Canon")}
        {navItem("marca", "Identidad de marca")}
        <span className={styles.navGroupLabel}>Producción</span>
        {navItem("medios", "Medios de Consulta")}
        {navItem("seleccion", "Selección de Fuentes")}
        {navItem("propuestas", "Propuestas")}
        {navItem("posts", "Posts en Fila")}
      </aside>

      <main>
        {view === "muro" && <MuroView bundle={bundle} busy={busy} run={run} />}
        {view === "canon" && <CanonView threads={threads} />}
        {view === "marca" && <CoffeedBrandPanel brand={brand} busy={busy} run={run} refresh={refresh} showToast={showToast} />}
        {view === "medios" && <MediosView sources={sources} busy={busy} run={run} refresh={refresh} showToast={showToast} />}
        {view === "seleccion" && (
          <SeleccionView
            bundle={bundle}
            busy={busy}
            run={run}
            showToast={showToast}
            onExtracted={() => setView("propuestas")}
          />
        )}
        {view === "propuestas" && <PropuestasView cycles={cycles} busy={busy} run={run} showToast={showToast} />}
        {view === "posts" && <PostsView cycles={cycles} busy={busy} run={run} showToast={showToast} />}
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

type RunFn = (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]) => Promise<boolean>;

// ============================================================
// MURO
// ============================================================

function MuroView({ bundle, busy, run }: { bundle: CoffeedConsoleBundle; busy: boolean; run: RunFn }) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [area, setArea] = useState("Dirección");
  const [pinned, setPinned] = useState(false);

  const posts: ({ kind: "ann"; a: CoffeedConsoleBundle["announcements"][number] } | { kind: "ch"; c: CoffeedConsoleBundle["chapters"][number] })[] = [
    ...bundle.announcements.filter((a) => a.pinned).map((a) => ({ kind: "ann" as const, a })),
    ...bundle.chapters.map((c) => ({ kind: "ch" as const, c })),
    ...bundle.announcements.filter((a) => !a.pinned).map((a) => ({ kind: "ann" as const, a })),
  ];

  return (
    <section>
      <div className={styles.headRow}>
        <div className={styles.viewhead}>
          <span className={styles.eyebrow}>El destino</span>
          <h1>Muro</h1>
          <p>
            Lo publicado y lo anunciado, en un solo sitio. <b>Este muro es el mismo</b> que ven Kaffetal Regal, Cherry Picked y
            el Directorio del Café: los capítulos y los anuncios viajan juntos a las tres superficies.
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
          <p>Publica el primer capítulo o escribe un anuncio para estrenarlo.</p>
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
              <article key={`c-${p.c.draftId}`} className={styles.post}>
                <div className={styles.postHead}>
                  <span className={styles.eyebrow}>Capítulo {p.c.chapterNo}</span>
                  <span className={styles.eyebrow}>{p.c.panels.length} paneles</span>
                </div>
                <div className={styles.postBody}>
                  <h2 className={styles.postTitle}>{p.c.title}</h2>
                  <p className={styles.postExcerpt}>{p.c.excerpt ?? p.c.panels[0]?.text ?? ""}</p>
                </div>
                <div className={styles.postFoot}>
                  <span>{fmtDate(p.c.publishedAt)}</span>
                  <span>En las tres superficies</span>
                  <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} style={{ marginLeft: "auto" }} disabled={busy} onClick={() => run(() => unpublishPost(p.c.draftId), ["Retirado", "El capítulo salió de los muros públicos."])}>
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

// ============================================================
// CANON
// ============================================================

function CanonView({ threads }: { threads: CoffeedThread[] }) {
  return (
    <section>
      <div className={styles.viewhead}>
        <span className={styles.eyebrow}>Memoria narrativa</span>
        <h1>Canon</h1>
        <p>
          Lo que ya contamos y lo que quedó abierto. Sin esto, cada capítulo sería huérfano. Se actualiza solo al publicar: el
          hilo que el capítulo continúa se marca, y el que abre nace aquí.
        </p>
      </div>
      {threads.length === 0 ? (
        <div className={styles.empty}>
          <h3>El canon está por escribirse</h3>
          <p>Los hilos nacen cuando un capítulo publicado abre uno. El primero estrena la memoria.</p>
        </div>
      ) : (
        <div className={styles.threads}>
          {threads.map((t) => (
            <div key={t.id} className={styles.threadRow}>
              <div>
                <div className={styles.threadName}>{t.name}</div>
                <div className={styles.eyebrow}>
                  {t.openedIn != null ? `Abierto en cap. ${t.openedIn}` : "Origen sin registrar"}
                  {t.lastSeenIn != null ? ` · última mención: cap. ${t.lastSeenIn}` : ""}
                </div>
                {t.summary && <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{t.summary}</div>}
              </div>
              <span className={`${styles.stateChip} ${t.state === "open" ? styles.stateOpen : t.state === "paused" ? styles.statePaused : styles.stateClosed}`}>
                {t.state === "open" ? "Abierto" : t.state === "paused" ? "En pausa" : "Cerrado"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// MEDIOS DE CONSULTA
// ============================================================

function MediosView({
  sources,
  busy,
  run,
  refresh,
  showToast,
}: {
  sources: CoffeedSource[];
  busy: boolean;
  run: RunFn;
  refresh: () => Promise<void>;
  showToast: (k: string, m: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);

  const validate = async () => {
    setChecking(true);
    setVerdict(null);
    const res = await validateSourceUrl(url);
    setChecking(false);
    if (!res.ok) {
      setVerdict({ ok: false, text: res.error });
      return;
    }
    const v = res.verdict;
    setVerdict({
      ok: v.verdict === "aprobado",
      text: v.verdict === "aprobado" ? `«${v.name}» entró a la lista blanca. ${v.reason}` : `«${v.name}» fue rechazado: ${v.reason}`,
    });
    setUrl("");
    await refresh();
    showToast(v.verdict === "aprobado" ? "Medio aprobado" : "Medio rechazado", v.reason);
  };

  const block = (list: "white" | "black") => {
    const rows = sources.filter((s) => s.list === list);
    return (
      <div className={`${styles.list} ${list === "black" ? styles.listBlock : ""}`}>
        <div className={styles.listHead}>
          <span className={styles.eyebrow} style={list === "black" ? { color: "var(--stamp)" } : undefined}>
            {list === "white" ? "Lista blanca · se barren" : "Lista negra · nunca entran"}
          </span>
          <span className={styles.eyebrow}>{rows.length}</span>
        </div>
        {rows.length === 0 && <div className={styles.colEmpty}>Vacía.</div>}
        {rows.map((s) => (
          <div key={s.id} className={styles.sourceRow}>
            <div>
              <div className={styles.sourceName}>
                {s.name} <span className={styles.tag}>{s.kind === "youtube" ? "YouTube" : "Medio"}</span>
              </div>
              <div className={styles.sourceMeta}>
                {s.category ?? "sin eje"}
                {s.url ? ` · ${s.url}` : ""}
                {s.lastSweptAt ? ` · barrido ${fmtDate(s.lastSweptAt)}` : ""}
              </div>
              {s.validationNote && <div className={styles.sourceNote}>{s.validationNote}</div>}
            </div>
            <div className={styles.sourceActions}>
              <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={busy} onClick={() => run(() => setSourceList(s.id, list === "white" ? "black" : "white"))}>
                {list === "white" ? "Bloquear" : "Permitir"}
              </button>
              <button className={styles.iconbtn} title="Quitar" disabled={busy} onClick={() => run(() => removeSource(s.id))}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section>
      <div className={styles.viewhead}>
        <span className={styles.eyebrow}>Etapa 01 · el universo consultable</span>
        <h1>Medios de Consulta</h1>
        <p>
          Los canales y medios donde el sistema busca novedades. Al añadir uno, un agente sale a mirarlo: comprueba que exista,
          que publique de forma recurrente y que su materia toque el café. Si no sirve, lo rechaza con motivo y lo deja en la
          lista negra — así nadie vuelve a proponerlo sin saber por qué.
        </p>
      </div>

      <div className={styles.formCard} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className={styles.field} style={{ flex: "1 1 320px" }}>
            <span className={styles.eyebrow}>URL del canal de YouTube o del medio</span>
            <input
              className={`${styles.input} ${styles.inputMono}`}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/@Lavaive"
              disabled={checking}
            />
          </label>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={checking || !url.trim()} onClick={validate}>
            {checking ? "Validando…" : "Validar y añadir"}
          </button>
        </div>
        {checking && (
          <span className={styles.ringRow}>
            <Ring /> El agente está mirando el medio: existencia, frecuencia de publicación y materia.
          </span>
        )}
        {verdict && <p className={verdict.ok ? styles.hint : styles.err}>{verdict.text}</p>}
        <p className={styles.hint}>Aquí no entra material suelto: un artículo o un vídeo concreto se añade en «Selección de Fuentes».</p>
      </div>

      <div className={styles.lists}>
        {block("white")}
        {block("black")}
      </div>
    </section>
  );
}

// ============================================================
// SELECCIÓN DE FUENTES
// ============================================================

function SeleccionView({
  bundle,
  busy,
  run,
  showToast,
  onExtracted,
}: {
  bundle: CoffeedConsoleBundle;
  busy: boolean;
  run: RunFn;
  showToast: (k: string, m: string) => void;
  onExtracted: () => void;
}) {
  const { openCycle, samples, threads } = bundle;
  const [sweeping, setSweeping] = useState(false);
  const [adding, setAdding] = useState(false);
  const [triaging, setTriaging] = useState<CoffeedSample | null>(null);

  const picked = samples.filter((s) => s.decision === "picked");
  const dropped = samples.filter((s) => s.decision === "dropped");

  const sweep = async () => {
    setSweeping(true);
    const res = await sweepSources();
    setSweeping(false);
    if (!res.ok) {
      showToast("No se pudo barrer", res.error);
      return;
    }
    await run(async () => ({ ok: true }));
    showToast("Barrido hecho", `${res.added} piezas nuevas de las ${res.found} encontradas en los últimos 7 días.`);
  };

  if (!openCycle) {
    return (
      <section>
        <div className={styles.viewhead}>
          <span className={styles.eyebrow}>Etapa 02 · triaje</span>
          <h1>Selección de Fuentes</h1>
          <p>Una sesión a la vez: se abre, se barre, se tría, se selecciona y se manda a extraer. Solo puede haber una abierta.</p>
        </div>
        <div className={styles.empty}>
          <h3>No hay sesión abierta</h3>
          <p>Abre una sesión para barrer los medios de consulta y elegir con qué se cuenta el próximo capítulo.</p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={() => run(startCycle, ["Sesión abierta", "Ya puedes barrer los medios de los últimos 7 días."])}>
            Abrir sesión de selección
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className={styles.headRow}>
        <div className={styles.viewhead}>
          <span className={styles.eyebrow}>Etapa 02 · triaje · capítulo {openCycle.chapterNo}</span>
          <h1>Selección de Fuentes</h1>
          <p>
            Solo titular, sumario y fecha: puntúa la relevancia, marca qué hilo del canon continúa y decide qué pasa a
            extracción. No todas tienen que entrar — un día sin material es una decisión válida.
          </p>
        </div>
        <div className={styles.headActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={sweeping || busy} onClick={sweep}>
            {sweeping ? "Barriendo…" : "Buscar en los medios (7 días)"}
          </button>
          <button className={`${styles.btn}`} disabled={busy} onClick={() => setAdding(true)}>
            Añadir URL a mano
          </button>
        </div>
      </div>

      {sweeping && (
        <p className={styles.ringRow} style={{ marginBottom: 14 }}>
          <Ring /> El agente recorre la lista blanca y trae titulares, sumarios y fechas de los últimos 7 días. Puede tardar
          un par de minutos.
        </p>
      )}
      {openCycle.sweptAt && !sweeping && (
        <p className={styles.hint} style={{ marginBottom: 14 }}>
          Último barrido: {fmtDate(openCycle.sweptAt)}.
        </p>
      )}

      <div className={styles.cupping}>
        <div className={styles.cuppingHead}>
          <span className={styles.eyebrow}>Pieza</span>
          <span className={styles.eyebrow}>Eje y hilo</span>
          <span className={styles.eyebrow}>Relevancia CTC</span>
          <span className={styles.eyebrow} style={{ textAlign: "right" }}>
            Decisión
          </span>
        </div>
        <div>
          {samples.length === 0 && (
            <div style={{ padding: 22 }}>
              <span className={styles.eyebrow}>La mesa está vacía — barre los medios o añade una URL a mano.</span>
            </div>
          )}
          {samples.map((s) => (
            <article key={s.entryId} className={[styles.sample, s.decision === "picked" ? styles.samplePicked : "", s.decision === "dropped" ? styles.sampleDropped : ""].join(" ")}>
              <div>
                <p className={styles.sampleTitle}>
                  {s.srcKey ? <b className={styles.mono}>[{s.srcKey.toUpperCase()}] </b> : null}
                  {s.title}
                </p>
                <div className={styles.sampleMeta}>
                  <span className={`${styles.tag} ${s.kind === "video" ? styles.tagVideo : styles.tagArticulo}`}>{s.kind === "video" ? "Vídeo" : "Artículo"}</span>
                  {s.origin === "manual" && <span className={`${styles.tag} ${styles.tagManual}`}>Manual</span>}
                  <span>{s.outlet}</span>
                  <span>{s.publishedAt ? fmtDate(s.publishedAt) : "sin fecha"}</span>
                  {s.hasExtraction && <span className={`${styles.tag} ${styles.tagOk}`}>extraída</span>}
                  <a className={styles.sampleLink} href={s.url} target="_blank" rel="noreferrer">
                    abrir ↗
                  </a>
                </div>
              </div>
              <button className={styles.triageBtn} title={s.reason ?? "Editar la clasificación"} onClick={() => setTriaging(s)}>
                <div className={styles.mono} style={{ fontSize: 12 }}>
                  {s.axis ?? "Sin clasificar"}
                </div>
                <div className={`${styles.threadTag} ${s.threadName ? "" : styles.threadNone}`}>
                  <span className={styles.threadBar} />
                  {s.threadName ?? "Sin hilo"}
                </div>
              </button>
              <div className={styles.score}>
                <div className={styles.scoreTrack}>{s.relevance != null && <span className={styles.scoreMark} style={{ left: `${s.relevance}%` }} data-v={s.relevance} />}</div>
                <div className={styles.scoreLegend}>
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
              <div className={styles.sampleActions}>
                {s.decision === "dropped" ? (
                  <button className={`${styles.btn} ${styles.btnSm} ${styles.btnStamp}`} disabled={busy} onClick={() => run(() => setDecision(s.entryId, "pending"))}>
                    Descartada
                  </button>
                ) : (
                  <>
                    <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} disabled={busy} onClick={() => run(() => setDecision(s.entryId, "dropped"))}>
                      Descartar
                    </button>
                    <button className={`${styles.btn} ${styles.btnSm} ${s.decision === "picked" ? styles.btnGo : ""}`} disabled={busy} onClick={() => run(() => setDecision(s.entryId, s.decision === "picked" ? "pending" : "picked"))}>
                      {s.decision === "picked" ? "Seleccionada" : "Seleccionar"}
                    </button>
                  </>
                )}
                <button className={styles.iconbtn} title="Quitar de la mesa" disabled={busy} onClick={() => run(() => removeEntry(s.entryId))}>
                  ✕
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.cuppingFoot}>
          <div className={styles.tally}>
            <strong>{picked.length}</strong> seleccionadas · <strong>{dropped.length}</strong> descartadas
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={busy || samples.length === 0} onClick={() => run(runTriage, ["Clasificado", "Revisa y decide — la decisión sigue siendo tuya."])}>
              Clasificar con IA
            </button>
            <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={busy} onClick={() => run(() => closeCycleEmpty(openCycle.id), ["Sesión cerrada", "Un día sin material es una decisión válida, no un fallo."])}>
              Cerrar sin producir
            </button>
            {/* El último botón del panel: cierra la selección y arranca la
                extracción, que ya es cosa del backend. */}
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
              disabled={busy || picked.length < 2}
              title={picked.length < 2 ? "Hacen falta al menos dos fuentes: con el tope de 3 paneles por fuente, una sola no llega a 5" : ""}
              onClick={() =>
                run(() => runExtraction(openCycle.id), ["Extracción lista", "El material ya está en Propuestas."]).then((ok) => ok && onExtracted())
              }
            >
              Extraer y continuar →
            </button>
          </div>
        </div>
      </div>

      {adding && <ManualItemModal busy={busy} run={run} close={() => setAdding(false)} />}
      {triaging && <TriageModal sample={triaging} threads={threads} busy={busy} run={run} close={() => setTriaging(null)} />}
    </section>
  );
}

function ManualItemModal({ busy, run, close }: { busy: boolean; run: RunFn; close: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [outlet, setOutlet] = useState("");
  const [kind, setKind] = useState<CoffeedItemKind>("articulo");
  const [summary, setSummary] = useState("");
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 10));

  return (
    <>
      <button className={styles.scrim} aria-label="Cerrar" onClick={close} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHead}>
          <div>
            <span className={styles.eyebrow}>Ingesta manual</span>
            <h2>Añadir una pieza a la mesa</h2>
          </div>
          <button className={styles.iconbtn} aria-label="Cerrar" onClick={close}>
            ✕
          </button>
        </div>
        <label className={styles.field}>
          <span className={styles.eyebrow}>URL de la pieza</span>
          <input className={`${styles.input} ${styles.inputMono}`} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </label>
        <label className={styles.field}>
          <span className={styles.eyebrow}>Titular</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tal cual lo publica el medio" />
        </label>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.eyebrow}>Medio o canal</span>
            <input className={styles.input} value={outlet} onChange={(e) => setOutlet(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.eyebrow}>Fecha de publicación</span>
            <input className={styles.input} type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.eyebrow}>Tipo</span>
            <select className={styles.input} value={kind} onChange={(e) => setKind(e.target.value as CoffeedItemKind)}>
              <option value="articulo">Artículo</option>
              <option value="video">Vídeo</option>
            </select>
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.eyebrow}>Sumario</span>
          <textarea className={styles.input} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Dos líneas: qué dice y por qué importa" />
        </label>
        <div className={styles.modalFoot}>
          <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={close}>
            Cancelar
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            style={{ marginLeft: "auto" }}
            disabled={busy}
            onClick={() => run(() => addManualItem({ url, title, outlet, kind, summary, publishedAt }), ["Añadida", "Entra a la mesa sin pasar por las listas."]).then((ok) => ok && close())}
          >
            Añadir a la mesa
          </button>
        </div>
      </div>
    </>
  );
}

function TriageModal({
  sample,
  threads,
  busy,
  run,
  close,
}: {
  sample: CoffeedSample;
  threads: CoffeedThread[];
  busy: boolean;
  run: RunFn;
  close: () => void;
}) {
  const [axis, setAxis] = useState(sample.axis ?? "");
  const [relevance, setRelevance] = useState(sample.relevance != null ? String(sample.relevance) : "");
  const [threadId, setThreadId] = useState(sample.threadId ?? "");
  return (
    <>
      <button className={styles.scrim} aria-label="Cerrar" onClick={close} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHead}>
          <div>
            <span className={styles.eyebrow}>Clasificación</span>
            <h2>Ajustar la pieza</h2>
          </div>
          <button className={styles.iconbtn} aria-label="Cerrar" onClick={close}>
            ✕
          </button>
        </div>
        <p style={{ margin: 0, fontWeight: 500 }}>{sample.title}</p>
        {sample.reason && (
          <p className={styles.eyebrow} style={{ margin: 0 }}>
            La IA dijo: {sample.reason}
          </p>
        )}
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.eyebrow}>Eje</span>
            <input className={styles.input} value={axis} onChange={(e) => setAxis(e.target.value)} list="coffeed-axes" placeholder="Mercados, Regulación…" />
            <datalist id="coffeed-axes">
              {["Mercados", "Industria", "Regulación", "Calidad", "Logística", "Clima", "Consumo"].map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label className={styles.field}>
            <span className={styles.eyebrow}>Relevancia CTC (0–100)</span>
            <input className={`${styles.input} ${styles.inputMono}`} type="number" min={0} max={100} value={relevance} onChange={(e) => setRelevance(e.target.value)} />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.eyebrow}>Hilo del canon que continúa</span>
          <select className={styles.input} value={threadId} onChange={(e) => setThreadId(e.target.value)}>
            <option value="">Sin hilo</option>
            {threads
              .filter((t) => t.state !== "closed")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
        <div className={styles.modalFoot}>
          <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={close}>
            Cancelar
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            style={{ marginLeft: "auto" }}
            disabled={busy}
            onClick={() =>
              run(() =>
                updateEntryTriage(sample.entryId, {
                  axis: axis.trim() || null,
                  relevance: relevance.trim() === "" ? null : Math.max(0, Math.min(100, Number(relevance))),
                  threadId: threadId || null,
                })
              ).then((ok) => ok && close())
            }
          >
            Guardar
          </button>
        </div>
      </div>
    </>
  );
}
