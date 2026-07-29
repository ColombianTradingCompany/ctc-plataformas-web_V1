"use client";

// ── Coffeed · el estudio de producción ───────────────────────────────────────
// Port a React del prototipo reference_coffeed/coffeed.html (v0.2): muro +
// pipeline editorial de 7 etapas. Vive dentro del panel del socio Estudio de
// Contenido; toda la red pasa por las Server Actions de src/lib/coffeed/ y el
// cliente refresca su bundle tras cada mutación (patrón Directorio).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addAnnouncement,
  addManualItem,
  addPanel,
  addSource,
  acceptDraft,
  buildScriptDeterministic,
  chooseProposal,
  closeCycleEmpty,
  createManualProposal,
  deleteAnnouncement,
  getCoffeedStudio,
  movePanel,
  patchPanel,
  publishChapter,
  removePanel,
  removeSource,
  saveExtraction,
  setDecision,
  startCycle,
  toggleAnnouncementPinned,
  unpublishChapter,
  updateEntryTriage,
  updateProposal,
} from "@/lib/coffeed/actions";
import { runExpand, runProposals, runTriage, runVideoScript } from "@/lib/coffeed/aiActions";
import {
  validateCoffeedDraft,
  COFFEED_RULES,
  type CoffeedItemKind,
  type CoffeedPanel,
  type CoffeedProposal,
  type CoffeedResult,
  type CoffeedSample,
  type CoffeedStudioBundle,
  type CoffeedThread,
} from "@/lib/coffeed/types";
import styles from "./coffeedStudio.module.css";

type View = "muro" | "mesa" | "extraccion" | "propuestas" | "borrador" | "guion" | "canon" | "fuentes";

type Drawer =
  | { type: "panel"; panel: CoffeedPanel }
  | { type: "addItem" }
  | { type: "announce" }
  | { type: "proposal"; proposal: CoffeedProposal }
  | { type: "manualProposal" }
  | { type: "triage"; sample: CoffeedSample }
  | { type: "extraction"; itemId: string; format: "transcript" | "markdown"; body: string }
  | { type: "addSource"; list: "white" | "black" };

const STAGES: { n: string; name: string; view: View; human?: boolean }[] = [
  { n: "01", name: "Ingesta", view: "fuentes" },
  { n: "02", name: "Mesa de cata", view: "mesa" },
  { n: "03", name: "Extracción", view: "extraccion" },
  { n: "04", name: "Propuestas", view: "propuestas" },
  { n: "05", name: "Revisión", view: "propuestas", human: true },
  { n: "06", name: "Borrador", view: "borrador" },
  { n: "07", name: "Guion de vídeo", view: "guion" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// Un cuerpo con marcadores ⟦texto|ref⟧ → lista de trozos renderizables.
type Chunk = { kind: "text"; text: string } | { kind: "claim"; text: string; ref: string };
function chunksOf(para: string): Chunk[] {
  const out: Chunk[] = [];
  let i = 0;
  while (i < para.length) {
    const a = para.indexOf("⟦", i);
    if (a === -1) {
      out.push({ kind: "text", text: para.slice(i) });
      break;
    }
    if (a > i) out.push({ kind: "text", text: para.slice(i, a) });
    const b = para.indexOf("⟧", a);
    if (b === -1) {
      out.push({ kind: "text", text: para.slice(a) });
      break;
    }
    const inner = para.slice(a + 1, b);
    const bar = inner.lastIndexOf("|");
    if (bar > 0) out.push({ kind: "claim", text: inner.slice(0, bar).trim(), ref: inner.slice(bar + 1).trim() });
    else out.push({ kind: "text", text: inner });
    i = b + 1;
  }
  return out;
}

export function CoffeedStudio({ orgName, panelHref }: { orgName: string; panelHref: string }) {
  const [bundle, setBundle] = useState<CoffeedStudioBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("mesa");
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kicker: string; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((kicker: string, msg: string) => {
    setToast({ kicker, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const refresh = useCallback(async () => {
    const b = await getCoffeedStudio();
    setBundle(b);
    setLoading(false);
  }, []);

  // Solo .then() en el cuerpo del efecto — gotcha #3 (set-state-in-effect).
  useEffect(() => {
    getCoffeedStudio().then((b) => {
      setBundle(b);
      setLoading(false);
    });
  }, []);

  /** Corre una action, refresca el bundle y saca el error al toast. */
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

  const go = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  };

  const cycle = bundle?.cycle ?? null;
  const samples = useMemo(() => bundle?.samples ?? [], [bundle]);
  const picked = useMemo(() => samples.filter((s) => s.decision === "picked"), [samples]);
  const extractionByItem = useMemo(() => new Map((bundle?.extractions ?? []).map((e) => [e.itemId, e])), [bundle]);
  const draft = bundle?.draft ?? null;
  const check = useMemo(() => validateCoffeedDraft(draft?.panels ?? []), [draft]);
  const draftLocked = draft != null && draft.state !== "draft";
  const today = new Date().toISOString().slice(0, 10);

  const counts: Record<string, string | number> = {
    wall: (bundle?.chapters.length ?? 0) + (bundle?.announcements.length ?? 0),
    samples: picked.length,
    docs: bundle?.extractions.length ?? 0,
    proposals: bundle?.proposals.length ?? 0,
    panels: draft?.panels.length ?? 0,
    scenes: bundle?.scenes ? bundle.scenes.length : "—",
    threads: bundle?.threads.filter((t) => t.state === "open").length ?? 0,
    sources: bundle?.sources.length ?? 0,
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div />
        <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
          <span className={styles.eyebrow}>Cargando el estudio…</span>
        </main>
      </div>
    );
  }
  if (!bundle) {
    return (
      <div className={styles.page}>
        <div />
        <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
          <div className={styles.empty}>
            <h3>Tu credencial no abre el estudio</h3>
            <p>Coffeed es el módulo del socio Estudio de Contenido. Vuelve a iniciar sesión con esa credencial.</p>
            <a className={styles.btn} href={panelHref}>Volver al panel</a>
          </div>
        </main>
      </div>
    );
  }

  const claimClick = async (itemId: string, text: string, ref: string) => {
    if (!draft) {
      showToast("Sin borrador", "Elige primero una propuesta (etapas 04–05) — el panel necesita un capítulo al que sumarse.");
      return;
    }
    if (draftLocked) {
      showToast("Capítulo cerrado", "El capítulo ya fue aceptado.");
      return;
    }
    const ext = extractionByItem.get(itemId);
    const claim = ext?.claims.find((c) => c.text === text && c.ref === ref);
    const ok = await run(() =>
      addPanel(draft.id, { text, note: "Traído desde la extracción.", role: "dato", itemId, ref, claimId: claim?.id ?? null })
    );
    if (ok) showToast("Panel creado", "Añadido al final del borrador con su referencia.");
  };

  const navItem = (v: View, n: string, label: string, count: string | number, disabled = false) => (
    <button className={styles.navItem} aria-current={view === v ? "page" : undefined} disabled={disabled} onClick={() => go(v)}>
      <span className={styles.navN}>{n}</span>
      {label}
      <span className={styles.navCount}>{count}</span>
    </button>
  );

  return (
    <div className={styles.page}>
      <aside className={styles.rail}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <span className={styles.brandDot} />
            Coffeed
          </div>
          <div className={styles.brandSub}>Estudio de Contenido · CTC</div>
        </div>

        <nav className={styles.railnav} aria-label="Secciones">
          <span className={styles.navLabel}>Producción</span>
          {navItem("muro", "01", "Muro", counts.wall)}
          {navItem("mesa", "02", "Mesa de cata", counts.samples)}
          {navItem("extraccion", "03", "Extracción", counts.docs)}
          {navItem("propuestas", "04", "Propuestas", counts.proposals)}
          {navItem("borrador", "05", "Borrador", counts.panels)}
          {navItem("guion", "06", "Guion de vídeo", counts.scenes, !draft || draft.state === "draft")}
          <span className={styles.navLabel}>Memoria</span>
          {navItem("canon", "07", "Canon", counts.threads)}
          <span className={styles.navLabel}>Ajustes</span>
          {navItem("fuentes", "08", "Fuentes", counts.sources)}
        </nav>

        <div className={styles.railFoot}>
          {cycle ? (
            <>
              Capítulo {cycle.chapterNo} {draft?.state === "draft" || !draft ? "en curso" : draft.state === "accepted" ? "aceptado" : "publicado"}
              <br />
            </>
          ) : (
            <>
              Sin ciclo abierto
              <br />
            </>
          )}
          {orgName}
          <br />
          <a href={panelHref}>← Panel del socio</a>
        </div>
      </aside>

      <main>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>Ciclo</span>
            <strong className={styles.cycleLabel}>
              {cycle ? `${new Date(cycle.date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })} · CAP-${String(cycle.chapterNo).padStart(3, "0")}` : "Sin abrir"}
            </strong>
          </div>
          <div className={styles.topActions}>
            {(!cycle || cycle.date !== today) && (
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                disabled={busy}
                onClick={() => run(startCycle, ["Ciclo abierto", "La mesa de cata recoge lo ingestado y espera tu triaje."])}
              >
                Abrir ciclo de hoy
              </button>
            )}
            <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={busy} onClick={() => setDrawer({ type: "addItem" })}>
              Añadir por URL
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={busy} onClick={() => setDrawer({ type: "announce" })}>
              Escribir anuncio
            </button>
          </div>
        </header>

        <nav className={styles.stages} aria-label="Etapas del ciclo">
          {STAGES.map((s, i) => {
            const cls = [styles.stage];
            const stage = cycle?.stage ?? 0;
            if (i + 1 < stage) cls.push(styles.stageDone);
            if (i + 1 === stage) cls.push(styles.stageNow);
            if (s.human) cls.push(styles.stageHuman);
            return (
              <button key={s.n} className={cls.join(" ")} onClick={() => go(s.view)}>
                <div className={styles.stageN}>{s.n}</div>
                <div className={styles.stageName}>{s.name}</div>
              </button>
            );
          })}
        </nav>

        <div className={styles.work}>
          {view === "muro" && (
            <MuroView bundle={bundle} busy={busy} run={run} onAnnounce={() => setDrawer({ type: "announce" })} />
          )}

          {view === "mesa" && (
            <section>
              <div className={styles.viewhead}>
                <span className={styles.eyebrow}>Etapa 02 · triaje</span>
                <h1>Mesa de cata</h1>
                <p>
                  Solo titular y sumario: puntúa la relevancia, marca qué hilo del canon continúa y decide qué pasa a extracción. No
                  todas tienen que entrar.
                </p>
              </div>
              {!cycle ? (
                <div className={styles.empty}>
                  <h3>No hay ciclo abierto</h3>
                  <p>Abre el ciclo de hoy para servir la mesa con lo ingestado. Un día sin material también es una decisión válida.</p>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={() => run(startCycle)}>
                    Abrir ciclo de hoy
                  </button>
                </div>
              ) : (
                <div className={styles.cupping}>
                  <div className={styles.cuppingHead}>
                    <span className={styles.eyebrow}>Muestra</span>
                    <span className={styles.eyebrow}>Eje y hilo</span>
                    <span className={styles.eyebrow}>Relevancia CTC</span>
                    <span className={styles.eyebrow} style={{ textAlign: "right" }}>
                      Decisión
                    </span>
                  </div>
                  <div>
                    {samples.length === 0 && (
                      <div style={{ padding: 24 }}>
                        <span className={styles.eyebrow}>La mesa está vacía — añade fuentes por URL desde la barra superior.</span>
                      </div>
                    )}
                    {samples.map((s) => (
                      <article
                        key={s.entryId}
                        className={[
                          styles.sample,
                          s.decision === "picked" ? styles.samplePicked : "",
                          s.decision === "dropped" ? styles.sampleDropped : "",
                        ].join(" ")}
                      >
                        <div>
                          <p className={styles.sampleTitle}>
                            {s.srcKey ? <b className={styles.mono}>[{s.srcKey.toUpperCase()}] </b> : null}
                            {s.title}
                          </p>
                          <div className={styles.sampleMeta}>
                            <span className={`${styles.tag} ${s.kind === "video" ? styles.tagVideo : styles.tagArticulo}`}>
                              {s.kind === "video" ? "Vídeo" : "Artículo"}
                            </span>
                            {s.origin === "manual" && <span className={`${styles.tag} ${styles.tagManual}`}>Manual</span>}
                            <span>{s.outlet}</span>
                            {s.hasExtraction && <span style={{ color: "var(--bean)" }}>■ extraída</span>}
                          </div>
                        </div>
                        <button
                          style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer" }}
                          title={s.reason ?? "Editar el triaje a mano"}
                          onClick={() => setDrawer({ type: "triage", sample: s })}
                        >
                          <div className={styles.mono} style={{ fontSize: 12 }}>
                            {s.axis ?? "Sin clasificar"}
                          </div>
                          <div className={`${styles.threadTag} ${s.threadName ? "" : styles.threadNone}`}>
                            <span className={styles.threadBar} />
                            {s.threadName ?? "Sin hilo"}
                          </div>
                        </button>
                        <div className={styles.score}>
                          <div className={styles.scoreTrack}>
                            {s.relevance != null && (
                              <span className={styles.scoreMark} style={{ left: `${s.relevance}%` }} data-v={s.relevance} />
                            )}
                          </div>
                          <div className={styles.scoreLegend}>
                            <span>0</span>
                            <span>50</span>
                            <span>100</span>
                          </div>
                        </div>
                        <div className={styles.sampleActions}>
                          {s.decision === "dropped" ? (
                            <button
                              className={`${styles.btn} ${styles.btnSm} ${styles.btnStamp}`}
                              disabled={busy}
                              onClick={() => run(() => setDecision(s.entryId, "pending"))}
                            >
                              Descartada
                            </button>
                          ) : (
                            <>
                              <button
                                className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                                disabled={busy}
                                onClick={() => run(() => setDecision(s.entryId, "dropped"))}
                              >
                                Descartar
                              </button>
                              <button
                                className={`${styles.btn} ${styles.btnSm} ${s.decision === "picked" ? styles.btnPrimary : ""}`}
                                disabled={busy}
                                onClick={() => run(() => setDecision(s.entryId, s.decision === "picked" ? "pending" : "picked"))}
                              >
                                {s.decision === "picked" ? "Seleccionada" : "Seleccionar"}
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className={styles.cuppingFoot}>
                    <div className={styles.tally}>
                      <strong>{picked.length}</strong> seleccionadas · <strong>{samples.filter((s) => s.decision === "dropped").length}</strong>{" "}
                      descartadas
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}
                        disabled={busy}
                        onClick={() => run(runTriage, ["Triaje hecho", "Haiku clasificó la mesa. Revisa y decide — la decisión sigue siendo tuya."])}
                      >
                        Triar con IA
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}
                        disabled={busy}
                        onClick={() =>
                          run(() => closeCycleEmpty(cycle.id, !cycle.closedEmpty), [
                            cycle.closedEmpty ? "Ciclo reabierto" : "Ciclo cerrado",
                            cycle.closedEmpty ? "La mesa vuelve a estar en juego." : "Un día sin material es una decisión válida, no un fallo.",
                          ])
                        }
                      >
                        {cycle.closedEmpty ? "Reabrir el ciclo" : "Cerrar el ciclo sin producir"}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                        disabled={picked.length < 2}
                        title={
                          picked.length < 2
                            ? "Hacen falta al menos dos fuentes: con el tope de 3 paneles por fuente, una sola no llega a 5"
                            : ""
                        }
                        onClick={() => go("extraccion")}
                      >
                        Continuar a extracción
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {view === "extraccion" && (
            <section>
              <div className={styles.viewhead}>
                <span className={styles.eyebrow}>Etapa 03 · extracción</span>
                <h1>Material en bruto</h1>
                <p>
                  Transcripciones y artículos convertidos a texto. Marca afirmaciones con ⟦texto|referencia⟧ al pegar el cuerpo: se
                  vuelven claims en verde y tocarlas crea un panel con su referencia ya puesta.
                </p>
              </div>
              {picked.length === 0 ? (
                <div className={styles.empty}>
                  <h3>Nada seleccionado aún</h3>
                  <p>La extracción trabaja sobre las fuentes seleccionadas en la mesa de cata.</p>
                  <button className={styles.btn} onClick={() => go("mesa")}>
                    Volver a la mesa
                  </button>
                </div>
              ) : (
                <>
                  <ExtractView
                    picked={picked}
                    activeDoc={activeDoc}
                    setActiveDoc={setActiveDoc}
                    extractionByItem={extractionByItem}
                    onEdit={(itemId) => {
                      const ext = extractionByItem.get(itemId);
                      const sample = picked.find((p) => p.itemId === itemId);
                      setDrawer({
                        type: "extraction",
                        itemId,
                        format: ext?.format ?? (sample?.kind === "video" ? "transcript" : "markdown"),
                        body: ext?.body ?? "",
                      });
                    }}
                    onClaim={claimClick}
                  />
                  <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                      disabled={busy}
                      onClick={() =>
                        run(runProposals, ["Etapas 03–04", "Tres propuestas listas para revisar. El sistema propone; tú decides."]).then(
                          (ok) => ok && go("propuestas")
                        )
                      }
                    >
                      Generar 3 propuestas (IA)
                    </button>
                    <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={() => go("propuestas")}>
                      Ir a propuestas
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {view === "propuestas" && (
            <section>
              <div className={styles.viewhead}>
                <span className={styles.eyebrow}>Etapas 04–05 · revisión humana</span>
                <h1>Tres ángulos</h1>
                <p>El sistema propone; tú decides. Elige uno, corrígelo o pide otra ronda. Este es el único punto donde el ciclo se detiene a esperar a una persona.</p>
              </div>
              {bundle.proposals.length === 0 ? (
                <div className={styles.empty}>
                  <h3>Aún no hay propuestas</h3>
                  <p>Genera tres ángulos con la IA desde la extracción, o escribe una propuesta manual si prefieres empezar tú.</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={busy}
                      onClick={() => run(runProposals, ["Propuestas listas", "Tres ángulos distintos, listos para tu revisión."])}
                    >
                      Generar 3 propuestas (IA)
                    </button>
                    <button className={styles.btn} disabled={busy} onClick={() => setDrawer({ type: "manualProposal" })}>
                      Propuesta manual
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.proposals}>
                    {bundle.proposals.map((p) => (
                      <article key={p.id} className={`${styles.proposal} ${p.chosen ? styles.proposalChosen : ""}`}>
                        <div className={styles.proposalHead}>
                          <span className={`${styles.eyebrow} ${styles.proposalAngle}`}>{p.angle}</span>
                          <h2 className={styles.proposalTitle}>{p.title}</h2>
                        </div>
                        <div className={styles.proposalBody}>
                          {p.hook && <p className={styles.proposalHook}>{p.hook}</p>}
                          {p.panelMap.length > 0 && (
                            <div className={styles.panelmap} aria-hidden>
                              {p.panelMap.map((k, i) => (
                                <span key={i} data-src={k} />
                              ))}
                            </div>
                          )}
                          <dl className={styles.proposalFacts}>
                            <div>
                              <dt>Paneles</dt>
                              <dd>{p.panelMap.length || "—"}</dd>
                            </div>
                            <div>
                              <dt>Fuentes</dt>
                              <dd>{new Set(p.panelMap).size || "—"}</dd>
                            </div>
                            <div>
                              <dt>Continúa</dt>
                              <dd>{p.continuesName ?? "hilo nuevo"}</dd>
                            </div>
                            <div>
                              <dt>Abre</dt>
                              <dd>{p.opens ?? "—"}</dd>
                            </div>
                          </dl>
                        </div>
                        <div className={styles.proposalFoot}>
                          <button
                            className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                            disabled={busy}
                            onClick={() => setDrawer({ type: "proposal", proposal: p })}
                          >
                            Corregir
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnSm} ${p.chosen ? styles.btnPrimary : ""}`}
                            disabled={busy || draftLocked}
                            onClick={() => run(() => chooseProposal(p.id), ["Ángulo elegido", p.title])}
                          >
                            {p.chosen ? "Elegida" : "Elegir"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}
                      disabled={busy || draftLocked}
                      onClick={() => run(runProposals, ["Otra ronda", "Se repitió la etapa 4. La propuesta elegida se conserva."])}
                    >
                      Pedir otra ronda (IA)
                    </button>
                    <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} disabled={busy} onClick={() => setDrawer({ type: "manualProposal" })}>
                      Propuesta manual
                    </button>
                    <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={() => go("mesa")}>
                      Volver a la mesa
                    </button>
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => go("borrador")}>
                      Ir al borrador
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {view === "borrador" && (
            <section>
              <div className={styles.viewhead}>
                <span className={styles.eyebrow}>Etapa 06 · borrador</span>
                <h1>{cycle ? `Capítulo ${cycle.chapterNo}` : "Borrador"}{draft ? ` — ${draft.title}` : ""}</h1>
                <p>Cada panel se lee solo, pero el orden cuenta la historia. Toca un panel para editarlo.</p>
              </div>
              {!draft ? (
                <div className={styles.empty}>
                  <h3>El borrador nace de una propuesta</h3>
                  <p>Elige un ángulo en la etapa de revisión y el capítulo se abre aquí con su titular.</p>
                  <button className={styles.btn} onClick={() => go("propuestas")}>
                    Ir a propuestas
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.rules}>
                    <div className={`${styles.ruleItem} ${check.countOk ? styles.ruleOk : styles.ruleWarn}`}>
                      <span className={styles.eyebrow}>Paneles</span>
                      <b>
                        {check.count} / {COFFEED_RULES.MIN}–{COFFEED_RULES.MAX}
                      </b>
                    </div>
                    <div className={`${styles.ruleItem} ${check.capOk ? styles.ruleOk : styles.ruleWarn}`}>
                      <span className={styles.eyebrow}>Máx. por fuente</span>
                      <b>
                        {check.maxSrc} / {COFFEED_RULES.CAP_PER_SOURCE}
                      </b>
                    </div>
                    <div className={`${styles.ruleItem} ${styles.ruleOk}`}>
                      <span className={styles.eyebrow}>Fuentes</span>
                      <b>{check.sources}</b>
                    </div>
                    <div className={`${styles.ruleItem} ${check.tracedOk ? styles.ruleOk : styles.ruleWarn}`}>
                      <span className={styles.eyebrow}>Sin trazar</span>
                      <b>{check.untraced}</b>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <span className={`${styles.stampmark} ${draft.state !== "draft" ? styles.stampOk : ""}`}>
                        {draft.state === "draft" ? "Sin aceptar" : draft.state === "accepted" ? "Aceptado" : "Publicado"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.strip}>
                    {draft.panels.map((p, i) => (
                      <button
                        key={p.id}
                        className={[
                          styles.panelCard,
                          i === 0 ? styles.panelOpen : "",
                          i === draft.panels.length - 1 ? styles.panelClose : "",
                          !p.itemId ? styles.panelUntraced : "",
                        ].join(" ")}
                        onClick={() => !draftLocked && setDrawer({ type: "panel", panel: p })}
                      >
                        <span className={styles.panelBar}>
                          <span>
                            {String(i + 1).padStart(2, "0")}
                            {p.role ? ` · ${p.role}` : ""}
                          </span>
                          {p.itemId ? <span className={styles.panelSrcdot} data-src={p.srcKey ?? "x"} /> : <span>!</span>}
                        </span>
                        <span className={styles.panelBody}>
                          <span className={styles.panelText}>{p.text}</span>
                          {p.note && <span className={styles.panelNote}>{p.note}</span>}
                        </span>
                        <span className={styles.panelSrc}>
                          {p.itemId
                            ? `Fuente ${(p.srcKey ?? "?").toUpperCase()} · ${p.ref ?? "sin referencia"}`
                            : "Sin trazar — bloquea la aceptación"}
                        </span>
                      </button>
                    ))}
                    {!draftLocked && (
                      <button
                        className={`${styles.panelCard} ${styles.panelAdd}`}
                        disabled={busy}
                        onClick={() => run(() => addPanel(draft.id, { text: "Panel nuevo", note: "", role: "", itemId: null, ref: null, claimId: null }))}
                      >
                        + Añadir panel
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {!draftLocked && (
                      <>
                        <button
                          className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`}
                          disabled={busy}
                          onClick={() => run(() => runExpand(draft.id), ["Paneles redactados", "La expansión respetó el mapa de fuentes. Revisa y ajusta."])}
                        >
                          Redactar paneles (IA)
                        </button>
                        <button className={`${styles.btn} ${styles.btnStamp} ${styles.btnSm}`} onClick={() => go("propuestas")}>
                          Devolver a propuestas
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                          disabled={busy || !check.canAccept}
                          onClick={() =>
                            run(() => acceptDraft(draft.id), [
                              `Capítulo ${cycle?.chapterNo ?? ""} aceptado`,
                              "Canon actualizado. El guion de vídeo ya está disponible.",
                            ]).then((ok) => ok && go("guion"))
                          }
                        >
                          Aceptar
                        </button>
                      </>
                    )}
                    {draft.state === "accepted" && (
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                        disabled={busy}
                        onClick={() => run(() => publishChapter(draft.id), ["Publicado", "El capítulo ya está en el muro de Kaffetal Regal, Cherry Picked y el Directorio."])}
                      >
                        Publicar en las plataformas
                      </button>
                    )}
                    {draft.state === "published" && (
                      <button
                        className={`${styles.btn} ${styles.btnStamp} ${styles.btnSm}`}
                        disabled={busy}
                        onClick={() => run(() => unpublishChapter(draft.id), ["Retirado", "El capítulo vuelve a aceptado y sale de los muros públicos."])}
                      >
                        Retirar de las plataformas
                      </button>
                    )}
                  </div>
                  {draft.state === "draft" &&
                    (check.canAccept ? (
                      <p className={styles.eyebrow} style={{ marginTop: 8 }}>
                        Listo para aceptar
                      </p>
                    ) : (
                      <p className={`${styles.eyebrow} ${styles.blockers}`}>
                        No se puede aceptar:{" "}
                        {[
                          !check.countOk && (check.count < COFFEED_RULES.MIN ? "faltan paneles" : "sobran paneles"),
                          !check.capOk && "una fuente supera los 3 paneles",
                          !check.tracedOk && `${check.untraced} panel${check.untraced > 1 ? "es" : ""} sin fuente`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ))}
                </>
              )}
            </section>
          )}

          {view === "guion" && (
            <section>
              <div className={styles.viewhead}>
                <span className={styles.eyebrow}>Etapa 07 · audiovisual</span>
                <h1>Guion de vídeo</h1>
                <p>Escenas, recursos y notas de dirección listas para el generador.</p>
              </div>
              {!draft || draft.state === "draft" ? (
                <div className={styles.empty}>
                  <h3>El guion llega después de la aceptación</h3>
                  <p>Se genera a partir de los paneles ya aprobados, para que el vídeo y el carrusel cuenten exactamente lo mismo.</p>
                  <button className={styles.btn} onClick={() => go("borrador")}>
                    Ir al borrador
                  </button>
                </div>
              ) : !bundle.scenes ? (
                <div className={styles.empty}>
                  <h3>Borrador aceptado</h3>
                  <p>Genera las escenas con sus recursos y sus notas de dirección.</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      disabled={busy}
                      onClick={() => run(() => runVideoScript(draft.id), ["Guion listo", "Mismo contenido, otro ritmo."])}
                    >
                      Generar guion de vídeo (IA)
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnQuiet}`}
                      disabled={busy}
                      onClick={() => run(() => buildScriptDeterministic(draft.id), ["Guion listo", "Versión determinista, sin IA."])}
                    >
                      Versión rápida sin IA
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.rules}>
                    <div className={`${styles.ruleItem} ${styles.ruleOk}`}>
                      <span className={styles.eyebrow}>Escenas</span>
                      <b>{bundle.scenes.length}</b>
                    </div>
                    <div className={`${styles.ruleItem} ${styles.ruleOk}`}>
                      <span className={styles.eyebrow}>Duración</span>
                      <b>{bundle.scenes.reduce((a, s) => a + s.duration, 0)} s</b>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                        disabled={busy}
                        onClick={() => run(() => runVideoScript(draft.id), ["Regenerado", "Guion nuevo a partir de los mismos paneles."])}
                      >
                        Regenerar
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                        onClick={() => {
                          const json = JSON.stringify({ chapter: cycle?.chapterNo, title: draft.title, scenes: bundle.scenes }, null, 2);
                          navigator.clipboard?.writeText(json);
                          showToast("Copiado", "El JSON del guion está en el portapapeles.");
                        }}
                      >
                        Copiar como JSON
                      </button>
                    </div>
                  </div>
                  <div className={styles.scenes}>
                    {bundle.scenes.map((s) => (
                      <div key={s.n} className={styles.scene}>
                        <div className={styles.sceneTime}>
                          <span className={styles.eyebrow}>Escena</span>
                          <b>{String(s.n).padStart(2, "0")}</b>
                          {s.duration} s
                        </div>
                        <div>
                          <p className={styles.sceneVo}>{s.voiceover}</p>
                          <p className={styles.sceneAv}>{s.av}</p>
                        </div>
                        <div className={styles.sceneDir}>
                          <b>Dirección</b>
                          {s.direction}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {view === "canon" && (
            <section>
              <div className={styles.viewhead}>
                <span className={styles.eyebrow}>Memoria narrativa</span>
                <h1>Canon</h1>
                <p>Lo que ya contamos y lo que quedó abierto. Sin esto, cada capítulo sería huérfano. Se actualiza solo al aceptar un borrador.</p>
              </div>
              {bundle.threads.length === 0 ? (
                <div className={styles.empty}>
                  <h3>El canon está por escribirse</h3>
                  <p>Los hilos nacen cuando una propuesta aceptada abre uno. El primer capítulo estrena la memoria.</p>
                </div>
              ) : (
                <div className={styles.threads}>
                  {bundle.threads.map((t) => (
                    <div key={t.id} className={styles.threadRow}>
                      <div>
                        <div className={styles.threadName}>{t.name}</div>
                        <div className={styles.eyebrow}>
                          {t.openedIn != null ? `Abierto en cap. ${t.openedIn}` : "Origen sin registrar"}
                          {t.lastSeenIn != null ? ` · última mención: cap. ${t.lastSeenIn}` : ""}
                        </div>
                        {t.summary && <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{t.summary}</div>}
                      </div>
                      <div />
                      <span
                        className={`${styles.stateChip} ${
                          t.state === "open" ? styles.stateOpen : t.state === "paused" ? styles.statePaused : styles.stateClosed
                        }`}
                      >
                        {t.state === "open" ? "Abierto" : t.state === "paused" ? "En pausa" : "Cerrado"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {view === "fuentes" && (
            <section>
              <div className={styles.viewhead}>
                <span className={styles.eyebrow}>Ajustes · etapa 01</span>
                <h1>Fuentes</h1>
                <p>
                  Qué se barrerá cada mañana y qué no entra nunca. El barrido automático llega con la fase 2 — hoy la ingesta es
                  manual, por URL, y se salta ambas listas.
                </p>
              </div>
              <div className={styles.lists}>
                {(["white", "black"] as const).map((list) => (
                  <div key={list} className={`${styles.list} ${list === "black" ? styles.listBlock : ""}`}>
                    <div className={styles.listHead}>
                      <span className={styles.eyebrow} style={list === "black" ? { color: "var(--stamp)" } : undefined}>
                        {list === "white" ? "Lista blanca" : "Lista negra"}
                      </span>
                      <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} disabled={busy} onClick={() => setDrawer({ type: "addSource", list })}>
                        Añadir
                      </button>
                    </div>
                    {bundle.sources.filter((s) => s.list === list).length === 0 && (
                      <div className={styles.sourceRow}>
                        <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Vacía.</span>
                      </div>
                    )}
                    {bundle.sources
                      .filter((s) => s.list === list)
                      .map((s) => (
                        <div key={s.id} className={styles.sourceRow}>
                          {s.name}
                          <span className={styles.sourceType}>{s.category ?? (s.kind === "youtube" ? "YouTube" : "Medio")}</span>
                          <button className={styles.iconbtn} title="Quitar" disabled={busy} onClick={() => run(() => removeSource(s.id))}>
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
              <div className={styles.urlbox}>
                <div style={{ flex: "1 1 240px" }}>
                  <span className={styles.eyebrow}>Ingesta manual</span>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
                    Un vídeo o artículo concreto entra al ciclo de hoy sin pasar por las listas, marcado como manual.
                  </p>
                </div>
                <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={busy} onClick={() => setDrawer({ type: "addItem" })}>
                  Añadir por URL
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {drawer && (
        <>
          <button className={styles.scrim} aria-label="Cerrar" onClick={() => setDrawer(null)} />
          <aside className={styles.drawer} role="dialog" aria-modal="true">
            <DrawerContent
              drawer={drawer}
              bundle={bundle}
              busy={busy}
              run={run}
              close={() => setDrawer(null)}
              showToast={showToast}
            />
          </aside>
        </>
      )}

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <b>{toast.kicker}</b>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ---------- Extracción: lista de documentos + cuerpo con claims ----------

function ExtractView({
  picked,
  activeDoc,
  setActiveDoc,
  extractionByItem,
  onEdit,
  onClaim,
}: {
  picked: CoffeedSample[];
  activeDoc: string | null;
  setActiveDoc: (id: string) => void;
  extractionByItem: Map<string, { format: string; body: string }>;
  onEdit: (itemId: string) => void;
  onClaim: (itemId: string, text: string, ref: string) => void;
}) {
  const current = picked.find((p) => p.itemId === activeDoc) ?? picked[0];
  const ext = current ? extractionByItem.get(current.itemId) : undefined;
  const paras = ext ? ext.body.split(/\n{2,}|\r?\n/).filter((p) => p.trim()) : [];

  return (
    <div className={styles.extract}>
      <div className={styles.doclist}>
        {picked.map((s) => (
          <button key={s.itemId} className={styles.docItem} aria-current={current?.itemId === s.itemId} onClick={() => setActiveDoc(s.itemId)}>
            <span className={styles.eyebrow}>
              Fuente {(s.srcKey ?? "?").toUpperCase()} ·{" "}
              {extractionByItem.has(s.itemId)
                ? extractionByItem.get(s.itemId)!.format === "transcript"
                  ? "Transcripción"
                  : "Artículo"
                : "Sin extraer"}
            </span>
            <div className={styles.docName}>{s.title}</div>
          </button>
        ))}
      </div>
      {current && (
        <div className={styles.doc}>
          <div className={styles.docHead}>
            <div>
              <span className={styles.eyebrow}>
                Fuente {(current.srcKey ?? "?").toUpperCase()} · {current.outlet}
              </span>
              <div style={{ fontWeight: 500, marginTop: 4 }}>{current.title}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`${styles.tag} ${current.kind === "video" ? styles.tagVideo : styles.tagArticulo}`}>
                {current.kind === "video" ? "Vídeo" : "Artículo"}
              </span>
              <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={() => onEdit(current.itemId)}>
                {ext ? "Editar cuerpo" : "Pegar el cuerpo"}
              </button>
            </div>
          </div>
          <div className={styles.docBody}>
            {!ext ? (
              <p style={{ color: "var(--ink-soft)" }}>
                Aún no hay extracción. Pega el transcript o el cuerpo del artículo y marca las afirmaciones trazables con
                ⟦afirmación|¶3⟧ o ⟦afirmación|08:41⟧.
              </p>
            ) : (
              paras.map((para, i) => (
                <p key={i}>
                  {chunksOf(para).map((c, j) =>
                    c.kind === "text" ? (
                      <span key={j}>{c.text}</span>
                    ) : (
                      <button key={j} className={styles.claim} onClick={() => onClaim(current.itemId, c.text, c.ref)}>
                        {c.text}
                        <span className={styles.claimRef}>{c.ref}</span>
                      </button>
                    )
                  )}
                </p>
              ))
            )}
          </div>
          <div className={styles.docHint}>Toca una afirmación en verde para crear un panel con la referencia ya puesta.</div>
        </div>
      )}
    </div>
  );
}

// ---------- Muro interno ----------

function MuroView({
  bundle,
  busy,
  run,
  onAnnounce,
}: {
  bundle: CoffeedStudioBundle;
  busy: boolean;
  run: (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]) => Promise<boolean>;
  onAnnounce: () => void;
}) {
  const posts: ({ kind: "ann"; ann: CoffeedStudioBundle["announcements"][number] } | { kind: "ch"; ch: CoffeedStudioBundle["chapters"][number] })[] = [
    ...bundle.announcements.filter((a) => a.pinned).map((a) => ({ kind: "ann" as const, ann: a })),
    ...bundle.chapters.map((c) => ({ kind: "ch" as const, ch: c })),
    ...bundle.announcements.filter((a) => !a.pinned).map((a) => ({ kind: "ann" as const, ann: a })),
  ];
  return (
    <section>
      <div className={styles.viewhead}>
        <span className={styles.eyebrow}>Destino</span>
        <h1>El muro</h1>
        <p>
          Lo aceptado, lo publicado y lo anunciado, en un solo sitio. Los capítulos <b>publicados</b> son los que ven Kaffetal
          Regal, Cherry Picked y el Directorio; los anuncios son internos y no salen de aquí.
        </p>
      </div>
      {posts.length === 0 ? (
        <div className={styles.empty}>
          <h3>El muro está en blanco</h3>
          <p>Acepta el primer capítulo o escribe un anuncio interno para estrenarlo.</p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAnnounce}>
            Escribir anuncio
          </button>
        </div>
      ) : (
        <div className={styles.wall}>
          {posts.map((p) =>
            p.kind === "ann" ? (
              <article key={`a-${p.ann.id}`} className={`${styles.post} ${p.ann.pinned ? styles.postPinned : ""}`}>
                <div className={styles.postHead}>
                  <span className={styles.eyebrow}>Anuncio interno{p.ann.pinned ? " · fijado" : ""}</span>
                </div>
                <div className={styles.postBody}>
                  <h2 className={styles.postTitle}>{p.ann.title}</h2>
                  {p.ann.body && <p className={styles.postExcerpt}>{p.ann.body}</p>}
                </div>
                <div className={styles.postFoot}>
                  <span>{p.ann.area ?? "CTC"}</span>
                  <span>{fmtDate(p.ann.publishedAt)}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                      disabled={busy}
                      onClick={() => run(() => toggleAnnouncementPinned(p.ann.id, !p.ann.pinned))}
                    >
                      {p.ann.pinned ? "Soltar" : "Fijar"}
                    </button>
                    <button className={`${styles.btn} ${styles.btnSm} ${styles.btnStamp}`} disabled={busy} onClick={() => run(() => deleteAnnouncement(p.ann.id))}>
                      Borrar
                    </button>
                  </span>
                </div>
              </article>
            ) : (
              <article key={`c-${p.ch.draftId}`} className={styles.post}>
                <div className={styles.postHead}>
                  <span className={styles.eyebrow}>Capítulo {p.ch.chapterNo}</span>
                  <span className={styles.eyebrow}>{p.ch.panels.length} paneles</span>
                </div>
                <div className={styles.postBody}>
                  <h2 className={styles.postTitle}>{p.ch.title}</h2>
                  <p className={styles.postExcerpt}>{p.ch.panels[0]?.text ?? ""}</p>
                </div>
                <div className={styles.postFoot}>
                  <span>{fmtDate(p.ch.publishedAt ?? p.ch.acceptedAt)}</span>
                  <span>{p.ch.state === "published" ? "En las plataformas" : "Aceptado · sin publicar"}</span>
                  <span style={{ marginLeft: "auto" }}>
                    {p.ch.state === "accepted" ? (
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                        disabled={busy}
                        onClick={() => run(() => publishChapter(p.ch.draftId), ["Publicado", "El capítulo ya está en los muros de KR, Cherry Picked y el Directorio."])}
                      >
                        Publicar
                      </button>
                    ) : (
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                        disabled={busy}
                        onClick={() => run(() => unpublishChapter(p.ch.draftId), ["Retirado", "El capítulo salió de los muros públicos."])}
                      >
                        Retirar
                      </button>
                    )}
                  </span>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </section>
  );
}

// ---------- Drawer: los editores ----------

function DrawerContent({
  drawer,
  bundle,
  busy,
  run,
  close,
  showToast,
}: {
  drawer: Drawer;
  bundle: CoffeedStudioBundle;
  busy: boolean;
  run: (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]) => Promise<boolean>;
  close: () => void;
  showToast: (k: string, m: string) => void;
}) {
  const head = (kicker: string, title: string) => (
    <div className={styles.drawerHead}>
      <div>
        <span className={styles.eyebrow}>{kicker}</span>
        <h2>{title}</h2>
      </div>
      <button className={styles.iconbtn} aria-label="Cerrar" onClick={close}>
        ✕
      </button>
    </div>
  );

  if (drawer.type === "panel") {
    return <PanelEditor head={head} panel={drawer.panel} picked={bundle.samples.filter((s) => s.decision === "picked")} busy={busy} run={run} close={close} />;
  }
  if (drawer.type === "addItem") return <AddItemEditor head={head} busy={busy} run={run} close={close} />;
  if (drawer.type === "announce") return <AnnounceEditor head={head} busy={busy} run={run} close={close} />;
  if (drawer.type === "proposal") return <ProposalEditor head={head} proposal={drawer.proposal} busy={busy} run={run} close={close} />;
  if (drawer.type === "manualProposal") return <ManualProposalEditor head={head} busy={busy} run={run} close={close} />;
  if (drawer.type === "triage") return <TriageEditor head={head} sample={drawer.sample} threads={bundle.threads} busy={busy} run={run} close={close} />;
  if (drawer.type === "addSource") return <AddSourceEditor head={head} list={drawer.list} busy={busy} run={run} close={close} />;
  return <ExtractionEditor head={head} itemId={drawer.itemId} initialFormat={drawer.format} initialBody={drawer.body} busy={busy} run={run} close={close} showToast={showToast} />;
}

type HeadFn = (kicker: string, title: string) => React.ReactNode;
type RunFn = (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]) => Promise<boolean>;

function PanelEditor({
  head,
  panel,
  picked,
  busy,
  run,
  close,
}: {
  head: HeadFn;
  panel: CoffeedPanel;
  picked: CoffeedSample[];
  busy: boolean;
  run: RunFn;
  close: () => void;
}) {
  const [text, setText] = useState(panel.text);
  const [note, setNote] = useState(panel.note ?? "");
  const [role, setRole] = useState(panel.role ?? "");
  const [itemId, setItemId] = useState<string | null>(panel.itemId);
  const [ref, setRef] = useState(panel.ref ?? "");

  const save = () =>
    run(() => patchPanel(panel.id, { text, note, role, itemId, ref: ref.trim() || "sin referencia" }), ["Panel", "Cambios guardados."]).then(
      (ok) => ok && close()
    );

  return (
    <>
      {head("Panel", "Editar panel")}
      <div className={styles.drawerBody}>
        <label>
          <span className={styles.eyebrow}>Texto del panel</span>
          <textarea className={styles.field} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label>
          <span className={styles.eyebrow}>Nota interna</span>
          <textarea className={styles.field} style={{ minHeight: 64 }} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div>
          <span className={styles.eyebrow}>Fuente</span>
          <div className={styles.pickers}>
            {picked.map((s) => (
              <button
                key={s.itemId}
                className={styles.picker}
                aria-pressed={itemId === s.itemId}
                title={s.title}
                onClick={() => setItemId(s.itemId)}
              >
                <span className={styles.pickerDot} data-src={s.srcKey ?? "x"} />
                Fuente {(s.srcKey ?? "?").toUpperCase()}
              </button>
            ))}
            <button className={`${styles.picker} ${styles.pickerNone}`} aria-pressed={itemId === null} onClick={() => setItemId(null)}>
              Sin trazar
            </button>
          </div>
        </div>
        <label>
          <span className={styles.eyebrow}>Referencia (párrafo o marca de tiempo)</span>
          <input className={`${styles.field} ${styles.fieldMono}`} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="¶3 · 08:41" />
        </label>
        <label>
          <span className={styles.eyebrow}>Rol en la secuencia</span>
          <input className={styles.field} value={role} onChange={(e) => setRole(e.target.value)} placeholder="dato, giro, cierre…" />
        </label>
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} disabled={busy} onClick={() => run(() => movePanel(panel.id, -1))}>
          ← Mover
        </button>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} disabled={busy} onClick={() => run(() => movePanel(panel.id, 1))}>
          Mover →
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnStamp}`}
          disabled={busy}
          onClick={() => run(() => removePanel(panel.id), ["Panel", "Panel eliminado."]).then((ok) => ok && close())}
        >
          Eliminar
        </button>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} style={{ marginLeft: "auto" }} disabled={busy} onClick={save}>
          Guardar
        </button>
      </div>
    </>
  );
}

function AddItemEditor({ head, busy, run, close }: { head: HeadFn; busy: boolean; run: RunFn; close: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [outlet, setOutlet] = useState("");
  const [kind, setKind] = useState<CoffeedItemKind>("articulo");
  const [summary, setSummary] = useState("");
  return (
    <>
      {head("Ingesta manual", "Añadir por URL")}
      <div className={styles.drawerBody}>
        <label>
          <span className={styles.eyebrow}>URL del vídeo o artículo</span>
          <input className={`${styles.field} ${styles.fieldMono}`} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </label>
        <label>
          <span className={styles.eyebrow}>Titular</span>
          <input className={styles.field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tal cual lo publica el medio" />
        </label>
        <label>
          <span className={styles.eyebrow}>Medio o canal</span>
          <input className={styles.field} value={outlet} onChange={(e) => setOutlet(e.target.value)} placeholder="Reuters Commodities · Canal de cata…" />
        </label>
        <div>
          <span className={styles.eyebrow}>Tipo</span>
          <div className={styles.pickers}>
            <button className={styles.picker} aria-pressed={kind === "articulo"} onClick={() => setKind("articulo")}>
              Artículo
            </button>
            <button className={styles.picker} aria-pressed={kind === "video"} onClick={() => setKind("video")}>
              Vídeo
            </button>
          </div>
        </div>
        <label>
          <span className={styles.eyebrow}>Sumario (para el triaje)</span>
          <textarea className={styles.field} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Dos líneas: qué dice y por qué importa" />
        </label>
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={close}>
          Cancelar
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          style={{ marginLeft: "auto" }}
          disabled={busy}
          onClick={() =>
            run(() => addManualItem({ url, title, outlet, kind, summary }), ["Añadido", "Entra en la mesa de cata sin pasar por las listas."]).then(
              (ok) => ok && close()
            )
          }
        >
          Entra en el ciclo de hoy
        </button>
      </div>
    </>
  );
}

function AnnounceEditor({ head, busy, run, close }: { head: HeadFn; busy: boolean; run: RunFn; close: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [area, setArea] = useState("Operaciones");
  const [pinned, setPinned] = useState(false);
  return (
    <>
      {head("Muro", "Escribir anuncio")}
      <div className={styles.drawerBody}>
        <label>
          <span className={styles.eyebrow}>Título</span>
          <input className={styles.field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qué pasa" />
        </label>
        <label>
          <span className={styles.eyebrow}>Cuerpo</span>
          <textarea className={styles.field} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Qué necesita saber el equipo y para cuándo" />
        </label>
        <label>
          <span className={styles.eyebrow}>Área</span>
          <input className={styles.field} value={area} onChange={(e) => setArea(e.target.value)} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Fijar arriba del muro
        </label>
        <p className={styles.eyebrow} style={{ margin: 0 }}>
          Los anuncios son internos: no viajan a los muros de KR, Cherry Picked ni el Directorio.
        </p>
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={close}>
          Cancelar
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          style={{ marginLeft: "auto" }}
          disabled={busy}
          onClick={() => run(() => addAnnouncement({ title, body, area, pinned }), ["Publicado", "El anuncio ya está en el muro."]).then((ok) => ok && close())}
        >
          Publicar
        </button>
      </div>
    </>
  );
}

function ProposalEditor({ head, proposal, busy, run, close }: { head: HeadFn; proposal: CoffeedProposal; busy: boolean; run: RunFn; close: () => void }) {
  const [title, setTitle] = useState(proposal.title);
  const [hook, setHook] = useState(proposal.hook ?? "");
  const [notes, setNotes] = useState(proposal.editorNotes ?? "");
  return (
    <>
      {head("Propuesta", "Corregir antes de expandir")}
      <div className={styles.drawerBody}>
        <label>
          <span className={styles.eyebrow}>Titular</span>
          <input className={styles.field} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span className={styles.eyebrow}>Gancho</span>
          <textarea className={styles.field} value={hook} onChange={(e) => setHook(e.target.value)} />
        </label>
        <label>
          <span className={styles.eyebrow}>Notas para la expansión</span>
          <textarea className={styles.field} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qué quieres que cambie al convertirlo en paneles" />
        </label>
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={close}>
          Cancelar
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          style={{ marginLeft: "auto" }}
          disabled={busy}
          onClick={() =>
            run(() => updateProposal(proposal.id, { title, hook, editorNotes: notes }), ["Guardado", "Las notas viajan con la propuesta a la expansión."]).then(
              (ok) => ok && close()
            )
          }
        >
          Guardar correcciones
        </button>
      </div>
    </>
  );
}

function ManualProposalEditor({ head, busy, run, close }: { head: HeadFn; busy: boolean; run: RunFn; close: () => void }) {
  const [angle, setAngle] = useState("");
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  return (
    <>
      {head("Propuesta", "Propuesta manual")}
      <div className={styles.drawerBody}>
        <label>
          <span className={styles.eyebrow}>Ángulo</span>
          <input className={styles.field} value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="Ángulo D · lo que la IA no vio" />
        </label>
        <label>
          <span className={styles.eyebrow}>Titular</span>
          <input className={styles.field} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span className={styles.eyebrow}>Gancho</span>
          <textarea className={styles.field} value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Por dónde abre y qué hilo continúa" />
        </label>
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={close}>
          Cancelar
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          style={{ marginLeft: "auto" }}
          disabled={busy}
          onClick={() => run(() => createManualProposal({ angle, title, hook }), ["Propuesta creada", title]).then((ok) => ok && close())}
        >
          Crear propuesta
        </button>
      </div>
    </>
  );
}

function TriageEditor({
  head,
  sample,
  threads,
  busy,
  run,
  close,
}: {
  head: HeadFn;
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
      {head("Triaje", "Clasificar la muestra")}
      <div className={styles.drawerBody}>
        <p style={{ margin: 0, fontWeight: 500 }}>{sample.title}</p>
        {sample.reason && (
          <p className={styles.eyebrow} style={{ margin: 0 }}>
            Haiku dijo: {sample.reason}
          </p>
        )}
        <label>
          <span className={styles.eyebrow}>Eje</span>
          <input className={styles.field} value={axis} onChange={(e) => setAxis(e.target.value)} placeholder="mercados, regulación, calidad, logística…" list="coffeed-axes" />
          <datalist id="coffeed-axes">
            {["Mercados", "Industria", "Regulación", "Calidad", "Logística", "Clima", "Consumo"].map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>
        <label>
          <span className={styles.eyebrow}>Relevancia CTC (0–100)</span>
          <input className={`${styles.field} ${styles.fieldMono}`} type="number" min={0} max={100} value={relevance} onChange={(e) => setRelevance(e.target.value)} />
        </label>
        <label>
          <span className={styles.eyebrow}>Hilo del canon que continúa</span>
          <select className={styles.field} value={threadId} onChange={(e) => setThreadId(e.target.value)}>
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
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={close}>
          Cancelar
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
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
    </>
  );
}

function ExtractionEditor({
  head,
  itemId,
  initialFormat,
  initialBody,
  busy,
  run,
  close,
  showToast,
}: {
  head: HeadFn;
  itemId: string;
  initialFormat: "transcript" | "markdown";
  initialBody: string;
  busy: boolean;
  run: RunFn;
  close: () => void;
  showToast: (k: string, m: string) => void;
}) {
  const [format, setFormat] = useState<"transcript" | "markdown">(initialFormat);
  const [body, setBody] = useState(initialBody);
  return (
    <>
      {head("Extracción", "Cuerpo de la fuente")}
      <div className={styles.drawerBody}>
        <div>
          <span className={styles.eyebrow}>Formato</span>
          <div className={styles.pickers}>
            <button className={styles.picker} aria-pressed={format === "markdown"} onClick={() => setFormat("markdown")}>
              Artículo / markdown
            </button>
            <button className={styles.picker} aria-pressed={format === "transcript"} onClick={() => setFormat("transcript")}>
              Transcripción
            </button>
          </div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span className={styles.eyebrow}>Texto limpio, un párrafo por línea</span>
          <textarea
            className={styles.field}
            style={{ minHeight: 280, flex: 1 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"El mercado abrió la semana con ⟦el diferencial en máximos de tres meses|¶2⟧ según los operadores…"}
          />
        </label>
        <p className={styles.eyebrow} style={{ margin: 0 }}>
          Marca cada afirmación trazable con ⟦texto|referencia⟧ — la referencia es el párrafo (¶2) o la marca de tiempo (08:41).
          Toda cifra que llegue a un panel debe poder verificarse en un clic.
        </p>
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={close}>
          Cancelar
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          style={{ marginLeft: "auto" }}
          disabled={busy}
          onClick={() => {
            if (!body.trim()) {
              showToast("Vacío", "Pega el cuerpo antes de guardar.");
              return;
            }
            run(() => saveExtraction(itemId, format, body), ["Extracción guardada", "Las afirmaciones marcadas ya son claims trazables."]).then(
              (ok) => ok && close()
            );
          }}
        >
          Guardar extracción
        </button>
      </div>
    </>
  );
}

function AddSourceEditor({ head, list, busy, run, close }: { head: HeadFn; list: "white" | "black"; busy: boolean; run: RunFn; close: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"youtube" | "outlet">("outlet");
  const [category, setCategory] = useState("");
  return (
    <>
      {head("Fuentes", list === "white" ? "Añadir a la lista blanca" : "Añadir a la lista negra")}
      <div className={styles.drawerBody}>
        <label>
          <span className={styles.eyebrow}>{list === "white" ? "Medio o canal" : "Dominio, canal o patrón de titular"}</span>
          <input className={styles.field} value={name} onChange={(e) => setName(e.target.value)} placeholder={list === "white" ? "Reuters Commodities" : "Titulares con «trucos»"} />
        </label>
        <div>
          <span className={styles.eyebrow}>Tipo</span>
          <div className={styles.pickers}>
            <button className={styles.picker} aria-pressed={kind === "outlet"} onClick={() => setKind("outlet")}>
              Medio
            </button>
            <button className={styles.picker} aria-pressed={kind === "youtube"} onClick={() => setKind("youtube")}>
              YouTube
            </button>
          </div>
        </div>
        <label>
          <span className={styles.eyebrow}>Categoría</span>
          <input className={styles.field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Mercados · Industria · Nicho · Patrón…" />
        </label>
        <p className={styles.eyebrow} style={{ margin: 0 }}>
          Las listas gobiernan el barrido automático de la fase 2. Hoy documentan el criterio.
        </p>
      </div>
      <div className={styles.drawerFoot}>
        <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={close}>
          Cancelar
        </button>
        <button
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          style={{ marginLeft: "auto" }}
          disabled={busy}
          onClick={() => run(() => addSource({ name, kind, category, list }), ["Fuente añadida", name]).then((ok) => ok && close())}
        >
          Añadir
        </button>
      </div>
    </>
  );
}
