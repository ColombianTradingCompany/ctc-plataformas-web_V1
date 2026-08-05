"use client";

// ── Source Wrapper · el taller editorial del Estudio de Contenido ────────────
// Reparto del 2026-08-03 (owner): la PRODUCCIÓN vuelve al socio Estudio de
// Contenido; el ECP recibe las entregas y manda el Muro. Esta consola es la
// app #1 del Estudio — antes era la mitad de abajo de la consola del ECP.
//
//   Canon                · la memoria narrativa (aquí SE ESCRIBE)
//   Medios de Consulta   · qué se puede consultar (lista blanca validada)
//   Selección de Fuentes · barrido de 7 días + triaje + selección
//   Propuestas           · extracción (backend) → 3 ángulos → Crear Post
//   Posts en Fila        · el post terminado → ENTREGAR al ECP
//
// Lo que ya NO vive aquí: el Muro, los anuncios y la Identidad de marca. La
// marca se LEE (la cinta de arriba) para no salirse de la familia, pero solo
// el ECP la cambia.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addManualItem,
  closeCycleEmpty,
  getStudioConsole,
  removeEntry,
  removeSource,
  setDecision,
  setSourceList,
  startCycle,
  updateEntryTriage,
} from "@/lib/coffeed/actions";
import { runTriage, sweepSources, validateSourceUrl } from "@/lib/coffeed/aiActions";
import { resolverFeeds } from "@/lib/coffeed/feedActions";
import { runExtraction } from "@/lib/coffeed/aiActions";
import type {
  CoffeedItemKind,
  CoffeedResult,
  CoffeedSample,
  CoffeedSource,
  CoffeedStudioBundle,
  CoffeedThread,
} from "@/lib/coffeed/types";
import { CanonView } from "./CanonView";
import { PostsView, PropuestasView } from "./CoffeedPipeline";
import { Ring } from "./Ring";
import styles from "./coffeedConsole.module.css";

type View = "canon" | "medios" | "seleccion" | "propuestas" | "posts";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export function StudioConsole() {
  const [bundle, setBundle] = useState<CoffeedStudioBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("seleccion");
  const [busy, setBusy] = useState(false);
  /** Qué paso está corriendo ahora mismo, para poder decirlo en pantalla. */
  const [working, setWorking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kicker: string; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((kicker: string, msg: string) => {
    setToast({ kicker, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5200);
  }, []);

  const refresh = useCallback(async () => {
    const b = await getStudioConsole();
    setBundle(b);
  }, []);

  // Solo .then() en el cuerpo del efecto — gotcha #3 (set-state-in-effect).
  useEffect(() => {
    getStudioConsole().then((b) => {
      setBundle(b);
      setLoading(false);
    });
  }, []);

  const run = useCallback<RunFn>(
    async (fn, okMsg, trabajando) => {
      setBusy(true);
      // Los pasos de IA tardan de treinta segundos a varios minutos. Deshabilitar
      // el botón no basta: parece que no ha pasado nada y se vuelve a hacer clic.
      // Este aviso NO se va solo — se va cuando el paso termina.
      if (trabajando) setWorking(trabajando);
      const r = await fn((texto) => setWorking(texto));
      if (r.ok) await refresh();
      setWorking(null);
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
            <Ring /> Cargando el taller…
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
          <h3>Tu sesión no abre el taller</h3>
          <p>
            El Source Wrapper es del Estudio de Contenido: necesita la credencial del socio o una credencial interna con
            acceso al ECP.
          </p>
        </div>
      </div>
    );
  }

  const { openCycle, cycles, samples, sources, threads, brand, deliveredDraftIds } = bundle;
  const picked = samples.filter((s) => s.decision === "picked");
  const counts: Record<View, number | string> = {
    canon: threads.filter((t) => t.state === "open").length,
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
          Source Wrapper
        </div>
        {navItem("seleccion", "Selección de Fuentes")}
        {navItem("propuestas", "Propuestas")}
        {navItem("posts", "Posts en Fila")}
        <hr className={styles.navRule} />
        {navItem("medios", "Medios de Consulta")}
        {navItem("canon", "Canon")}

        {/* La marca la manda el ECP: aquí se lee para no salirse de la familia. */}
        <div className={styles.railNote}>
          <span className={styles.eyebrow}>Identidad de marca</span>
          <b>{brand.companyName}</b>
          <span className={styles.swatches}>
            {brand.palette.map((c) => (
              <i key={c} style={{ background: c }} title={c} />
            ))}
          </span>
          <small>La define el ECP · aquí solo se consulta</small>
        </div>
      </aside>

      <main>
        {view === "canon" && <CanonView threads={threads} />}
        {view === "medios" && <MediosView sources={sources} busy={busy} run={run} refresh={refresh} showToast={showToast} />}
        {view === "seleccion" && (
          <SeleccionView
            bundle={bundle}
            busy={busy}
            run={run}
            refresh={refresh}
            showToast={showToast}
            onExtracted={() => setView("propuestas")}
          />
        )}
        {view === "propuestas" && <PropuestasView cycles={cycles} busy={busy} run={run} showToast={showToast} />}
        {view === "posts" && (
          <PostsView cycles={cycles} busy={busy} run={run} showToast={showToast} deliveredDraftIds={deliveredDraftIds} />
        )}
      </main>

      {working && (
        <div className={`${styles.toast} ${styles.working}`} role="status" aria-live="polite">
          <b>Trabajando<span className={styles.dots} aria-hidden /></b>
          {working}
          <small className={styles.workingHint}>Estos pasos llaman a la IA y pueden tardar varios minutos. No cierres la pestaña.</small>
        </div>
      )}
      {toast && !working && (
        <div className={styles.toast} role="status" aria-live="polite">
          <b>{toast.kicker}</b>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

type RunFn = (
  /** Recibe `avisar` para ir contando el progreso de un paso largo. */
  fn: (avisar: (texto: string) => void) => Promise<CoffeedResult>,
  okMsg?: [string, string],
  /** Qué decir mientras corre. Los pasos de IA tardan minutos y el botón
   *  deshabilitado no comunica nada. */
  trabajando?: string
) => Promise<boolean>;

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
  refresh,
  showToast,
  onExtracted,
}: {
  bundle: CoffeedStudioBundle;
  busy: boolean;
  run: RunFn;
  /** Para pintar lo que va entrando tanda a tanda, no solo al final. */
  refresh: () => Promise<void>;
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
    // El barrido es el paso MÁS largo (14 medios, minutos), así que pasa por
    // `run` como los demás para que salga el aviso de «Trabajando». Antes tenía
    // su propio estado y no avisaba de nada.
    setSweeping(true);
    let added = 0;
    let found = 0;
    let revisados = 0;
    const fallidos: { id: string; name: string }[] = [];
    const ok = await run(
      async (avisar) => {
        // PRIMERO los feeds. Un medio con feed se lee en segundos y con fecha
        // exacta; solo los que no tengan pasan por el agente, que es lento y
        // se equivoca. Esto se hace una vez por medio y queda guardado.
        const sinFeed: { id: string; name: string }[] = [];
        for (;;) {
          avisar(`Buscando el feed de cada medio. ${sinFeed.length ? `${sinFeed.length} sin feed hasta ahora.` : ""}`);
          const r = await resolverFeeds(sinFeed.map((f) => f.id));
          if (!r.ok) return { ok: false, error: r.error };
          sinFeed.push(...r.sinFeed);
          if (!r.pendientes) break;
        }
        if (sinFeed.length) {
          // No es un fallo: hay medios que sencillamente no publican feed. Se
          // dice para que se sepa cuáles van por el camino lento.
          avisar(`${sinFeed.length} medio(s) sin feed, irán por el agente: ${sinFeed.map((f) => f.name).join(", ")}.`);
        }

        // POR TANDAS. Los 14 medios de una vez pasaban de 300 s y Vercel mataba
        // la función sin dejar rastro; cada tanda cabe de sobra y el progreso
        // queda guardado, así que esto continúa donde lo dejó.
        for (;;) {
          const res = await sweepSources(fallidos.map((f) => f.id));
          if (!res.ok) return { ok: false, error: res.error };
          added += res.added;
          found += res.found;
          revisados += res.revisados;
          fallidos.push(...res.fallidos);
          // Se pinta lo que ya entró ANTES de pedir la siguiente tanda: así la
          // mesa se va llenando a la vista en vez de aparecer entera al final.
          await refresh();
          if (!res.pendientes) break;
          avisar(`Van ${revisados} medios revisados y quedan ${res.pendientes}. ${added} piezas nuevas hasta ahora.`);
        }
        return { ok: true };
      },
      undefined,
      "Preparando los medios de consulta."
    );
    setSweeping(false);
    if (ok) {
      // «No publicó nada» y «no llegué a mirarlo» no son lo mismo, y antes se
      // veían igual: una mesa vacía sin explicación.
      const nota = fallidos.length
        ? ` No se pudo consultar ${fallidos.length} medio(s) (${fallidos.map((f) => f.name).join(", ")}): siguen pendientes, vuelve a barrer para reintentarlos.`
        : "";
      showToast(
        "Barrido hecho",
        found
          ? `${added} piezas nuevas de las ${found} encontradas en ${revisados} medios.${nota}`
          : `Ninguno de los ${revisados} medios revisados publicó algo con fecha confirmada en los últimos 7 días.${nota || " Es una respuesta válida: añade una URL a mano o cierra la sesión sin producir."}`
      );
    }
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
                run(() => runExtraction(openCycle.id), ["Extracción lista", "El material ya está en Propuestas."], "Leyendo cada pieza y marcando sus afirmaciones.").then((ok) => ok && onExtracted())
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
