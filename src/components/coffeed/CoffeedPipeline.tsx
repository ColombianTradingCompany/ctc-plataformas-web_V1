"use client";

// ── Coffeed · Propuestas y Posts en Fila ─────────────────────────────────────
// Los dos kanban del pipeline. Las columnas NO son un estado del cliente: son
// el `status` del ciclo en la base. Por eso una acción larga que se quede a
// medias (el navegador se fue, la API devolvió 529) deja la tarjeta en su
// columna con su botón de reintento, en vez de perderse.

import { useState } from "react";
import { chooseProposal, getCycleDetail, getPostHtml, publishPost, updateProposal } from "@/lib/coffeed/actions";
import { createPost, runExtraction, runProposals } from "@/lib/coffeed/aiActions";
import type { CoffeedCycle, CoffeedExtraction, CoffeedProposal, CoffeedResult } from "@/lib/coffeed/types";
import styles from "./coffeedConsole.module.css";
import { Ring } from "./Ring";

type RunFn = (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]) => Promise<boolean>;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function Column({ title, count, hint, children }: { title: string; count: number; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.col}>
      <div className={styles.colHead}>
        <span className={styles.eyebrow}>{title}</span>
        <span className={styles.eyebrow}>{count}</span>
      </div>
      {count === 0 ? <div className={styles.colEmpty}>{hint ?? "Nada por aquí."}</div> : <div className={styles.colBody}>{children}</div>}
    </div>
  );
}

// ============================================================
// PROPUESTAS · extracción → material listo → 3 ángulos
// ============================================================

export function PropuestasView({
  cycles,
  busy,
  run,
  showToast,
}: {
  cycles: CoffeedCycle[];
  busy: boolean;
  run: RunFn;
  showToast: (k: string, m: string) => void;
}) {
  const [detail, setDetail] = useState<{ cycle: CoffeedCycle; extractions: CoffeedExtraction[]; proposals: CoffeedProposal[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [editing, setEditing] = useState<CoffeedProposal | null>(null);

  const extracting = cycles.filter((c) => c.status === "extrayendo");
  const extracted = cycles.filter((c) => c.status === "extraido");
  const proposed = cycles.filter((c) => c.status === "propuestas");

  const openDetail = async (cycle: CoffeedCycle) => {
    setLoadingDetail(cycle.id);
    const d = await getCycleDetail(cycle.id);
    setLoadingDetail(null);
    if (!d) {
      showToast("No se pudo", "No se pudo leer el material de la sesión.");
      return;
    }
    setDetail({ cycle, ...d });
  };

  return (
    <section>
      <div className={styles.viewhead}>
        <span className={styles.eyebrow}>Etapa 03 · redacción</span>
        <h1>Propuestas</h1>
        <p>
          La extracción corre sola en el fondo. Cuando el material está listo, el sistema propone tres ángulos genuinamente
          distintos y tú eliges uno: es el único punto donde el ciclo se detiene a esperar a una persona.
        </p>
      </div>

      <div className={styles.kanban}>
        <Column title="En extracción" count={extracting.length} hint="Nada extrayéndose ahora mismo.">
          {extracting.map((c) => (
            <div className={styles.cardItem} key={c.id}>
              <p className={styles.cardTitle}>Capítulo {c.chapterNo}</p>
              <div className={styles.cardMeta}>
                <span>{fmtDate(c.date)}</span>
                <span>
                  {c.extractionCount}/{c.pickedCount} fuentes
                </span>
              </div>
              {c.error ? (
                <p className={styles.cardError}>{c.error}</p>
              ) : (
                <span className={styles.ringRow}>
                  <Ring /> Leyendo las fuentes…
                </span>
              )}
              <div className={styles.cardActions}>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                  disabled={busy}
                  onClick={() => run(() => runExtraction(c.id), ["Extracción lista", "El material ya se puede convertir en propuestas."])}
                >
                  {c.error ? "Reintentar extracción" : "Continuar extracción"}
                </button>
              </div>
            </div>
          ))}
        </Column>

        <Column title="Extraídas" count={extracted.length} hint="Ninguna sesión con material listo.">
          {extracted.map((c) => (
            <div className={styles.cardItem} key={c.id}>
              <p className={styles.cardTitle}>Capítulo {c.chapterNo}</p>
              <div className={styles.cardMeta}>
                <span>{fmtDate(c.date)}</span>
                <span>{c.extractionCount} extraídas</span>
              </div>
              {c.error && <p className={styles.cardError}>{c.error}</p>}
              <div className={styles.cardActions}>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} disabled={busy || loadingDetail === c.id} onClick={() => openDetail(c)}>
                  {loadingDetail === c.id ? "Abriendo…" : "Ver material"}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                  disabled={busy}
                  onClick={() => run(() => runProposals(c.id), ["Tres ángulos listos", "El sistema propone; tú decides."])}
                >
                  Generar 3 propuestas (IA)
                </button>
              </div>
            </div>
          ))}
        </Column>

        <Column title="Propuestas" count={proposed.length} hint="Ningún ángulo esperando decisión.">
          {proposed.map((c) => (
            <div className={styles.cardItem} key={c.id}>
              <p className={styles.cardTitle}>{c.title ?? `Capítulo ${c.chapterNo}`}</p>
              <div className={styles.cardMeta}>
                <span>Cap. {c.chapterNo}</span>
                <span>{c.proposalCount} ángulos</span>
              </div>
              {c.error && <p className={styles.cardError}>{c.error}</p>}
              <div className={styles.cardActions}>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} disabled={busy || loadingDetail === c.id} onClick={() => openDetail(c)}>
                  {loadingDetail === c.id ? "Abriendo…" : "Elegir ángulo"}
                </button>
              </div>
            </div>
          ))}
        </Column>
      </div>

      {detail && (
        <>
          <button className={styles.scrim} aria-label="Cerrar" onClick={() => setDetail(null)} />
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <span className={styles.eyebrow}>Capítulo {detail.cycle.chapterNo}</span>
                <h2>{detail.proposals.length ? "Elige el ángulo" : "Material extraído"}</h2>
              </div>
              <button className={styles.iconbtn} aria-label="Cerrar" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>

            {detail.proposals.length > 0 ? (
              <div className={styles.proposals}>
                {detail.proposals.map((p) => (
                  <article key={p.id} className={`${styles.proposal} ${p.chosen ? styles.proposalChosen : ""}`}>
                    <div className={styles.proposalHead}>
                      <span className={`${styles.eyebrow} ${styles.proposalAngle}`}>{p.angle}</span>
                      <h3 className={styles.proposalTitle}>{p.title}</h3>
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
                      <dl className={styles.facts}>
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
                      <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={() => setEditing(p)}>
                        Corregir
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${p.chosen ? styles.btnGo : styles.btnPrimary}`}
                        disabled={busy}
                        onClick={async () => {
                          const ok = await run(() => chooseProposal(p.id));
                          if (!ok) return;
                          setDetail(null);
                          run(() => createPost(detail.cycle.id), ["Post creado", "Ya está en «Posts en Fila», listo para revisar y publicar."]);
                        }}
                      >
                        Crear Post
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            <div>
              <span className={styles.eyebrow}>Material extraído · {detail.extractions.length} fuentes</span>
              {detail.extractions.map((e) => (
                <div key={e.itemId} style={{ marginTop: 10 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 500 }}>
                    <span className={styles.mono}>[{(e.srcKey ?? "?").toUpperCase()}]</span> {e.title}
                  </p>
                  <p className={styles.hint} style={{ marginBottom: 6 }}>
                    {e.claims.length} afirmaciones trazables
                  </p>
                  <div className={styles.docBody}>
                    {e.body.split(/\n{2,}|\r?\n/).filter(Boolean).map((para, i) => (
                      <p key={i}>{para.replace(/⟦([^⟧|]*)\|([^⟧|]*)⟧/g, "$1")}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {editing && (
        <ProposalEditor
          proposal={editing}
          busy={busy}
          run={run}
          close={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setDetail(null);
          }}
        />
      )}
    </section>
  );
}

function ProposalEditor({
  proposal,
  busy,
  run,
  close,
  onSaved,
}: {
  proposal: CoffeedProposal;
  busy: boolean;
  run: RunFn;
  close: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(proposal.title);
  const [hook, setHook] = useState(proposal.hook ?? "");
  const [notes, setNotes] = useState(proposal.editorNotes ?? "");
  return (
    <>
      <button className={styles.scrim} aria-label="Cerrar" onClick={close} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHead}>
          <div>
            <span className={styles.eyebrow}>Propuesta</span>
            <h2>Corregir antes de crear el post</h2>
          </div>
          <button className={styles.iconbtn} aria-label="Cerrar" onClick={close}>
            ✕
          </button>
        </div>
        <label className={styles.field}>
          <span className={styles.eyebrow}>Titular</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.eyebrow}>Gancho</span>
          <textarea className={styles.input} value={hook} onChange={(e) => setHook(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.eyebrow}>Notas para la redacción</span>
          <textarea className={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qué quieres que cambie al convertirlo en paneles" />
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
              run(() => updateProposal(proposal.id, { title, hook, editorNotes: notes }), ["Guardado", "Las notas viajan con la propuesta a la redacción."]).then(
                (ok) => ok && onSaved()
              )
            }
          >
            Guardar
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// POSTS EN FILA · creación → ficha → publicar
// ============================================================

export function PostsView({
  cycles,
  busy,
  run,
  showToast,
}: {
  cycles: CoffeedCycle[];
  busy: boolean;
  run: RunFn;
  showToast: (k: string, m: string) => void;
}) {
  const [reediting, setReediting] = useState<CoffeedCycle | null>(null);
  const [prompt, setPrompt] = useState("");

  const creating = cycles.filter((c) => c.status === "post" || c.post?.postStatus === "generando" || c.post?.postStatus === "error");
  const ready = cycles.filter((c) => c.status === "listo" && c.post?.postStatus === "listo");

  const openHtml = async (draftId: string, mode: "download" | "print") => {
    const res = await getPostHtml(draftId);
    if (!res.ok) {
      showToast("No se pudo", res.error);
      return;
    }
    if (mode === "download") {
      const blob = new Blob([res.html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `coffeed-${res.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    // PDF = "Imprimir" del navegador sobre el mismo HTML (patrón GVG).
    const w = window.open("", "_blank");
    if (!w) {
      showToast("Bloqueado", "El navegador bloqueó la ventana. Permite las ventanas emergentes para imprimir a PDF.");
      return;
    }
    w.document.write(res.html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <section>
      <div className={styles.viewhead}>
        <span className={styles.eyebrow}>Etapa 04 · publicación</span>
        <h1>Posts en Fila</h1>
        <p>
          El post se arma solo a partir del ángulo elegido: paneles trazados a sus fuentes y una maqueta que no decide un
          modelo, sino la identidad de marca. Revisa, re-edita si hace falta, y publica.
        </p>
      </div>

      <div className={styles.kanban}>
        <Column title="Creando" count={creating.length} hint="Ningún post en construcción.">
          {creating.map((c) => (
            <div className={styles.cardItem} key={c.id}>
              <p className={styles.cardTitle}>{c.title ?? `Capítulo ${c.chapterNo}`}</p>
              <div className={styles.cardMeta}>
                <span>Cap. {c.chapterNo}</span>
                <span>{fmtDate(c.date)}</span>
              </div>
              {c.post?.postError ? (
                <p className={styles.cardError}>{c.post.postError}</p>
              ) : (
                <span className={styles.ringRow}>
                  <Ring /> Redactando y maquetando…
                </span>
              )}
              <div className={styles.cardActions}>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`}
                  disabled={busy}
                  onClick={() => run(() => createPost(c.id), ["Post creado", "Listo para revisar y publicar."])}
                >
                  {c.post?.postError ? "Reintentar" : "Continuar"}
                </button>
              </div>
            </div>
          ))}
        </Column>

        <Column title="Listos para publicar" count={ready.length} hint="Ningún post terminado.">
          {ready.map((c) => (
            <div className={styles.cardItem} key={c.id}>
              <p className={styles.cardTitle}>{c.post?.title ?? c.title}</p>
              <div className={styles.cardMeta}>
                <span>Cap. {c.chapterNo}</span>
                <span>{c.post?.panels.length ?? 0} paneles</span>
                <span>{fmtDate(c.date)}</span>
              </div>
              {c.post?.excerpt && <p className={styles.postExcerpt}>{c.post.excerpt}</p>}
              <div className={styles.cardActions}>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={() => openHtml(c.post!.draftId, "print")}>
                  Ver / PDF
                </button>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnQuiet}`} onClick={() => openHtml(c.post!.draftId, "download")}>
                  HTML
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnStamp}`}
                  disabled={busy}
                  onClick={() => {
                    setPrompt(c.post?.reeditPrompt ?? "");
                    setReediting(c);
                  }}
                >
                  Re-editar
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnGo}`}
                  disabled={busy}
                  onClick={() => run(() => publishPost(c.post!.draftId), ["Publicado", "El capítulo ya está en el muro de la red."])}
                >
                  Publicar
                </button>
              </div>
            </div>
          ))}
        </Column>
      </div>

      {reediting && (
        <>
          <button className={styles.scrim} aria-label="Cerrar" onClick={() => setReediting(null)} />
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <span className={styles.eyebrow}>Capítulo {reediting.chapterNo}</span>
                <h2>Re-editar el post</h2>
              </div>
              <button className={styles.iconbtn} aria-label="Cerrar" onClick={() => setReediting(null)}>
                ✕
              </button>
            </div>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Qué quieres que cambie</span>
              <textarea
                className={styles.input}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="«Abre por el dato del diferencial», «menos técnico», «cierra con una pregunta al tostador»…"
              />
              <p className={styles.hint}>
                La instrucción manda sobre el ángulo y sobre las notas de la propuesta. Se rehacen los paneles y la maqueta con
                las mismas fuentes.
              </p>
            </label>
            <div className={styles.modalFoot}>
              <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} onClick={() => setReediting(null)}>
                Cancelar
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                style={{ marginLeft: "auto" }}
                disabled={busy || !prompt.trim()}
                onClick={() => {
                  const cycle = reediting;
                  setReediting(null);
                  run(() => createPost(cycle.id, prompt), ["Post rehecho", "Se aplicó tu instrucción sobre las mismas fuentes."]);
                }}
              >
                Rehacer post
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
