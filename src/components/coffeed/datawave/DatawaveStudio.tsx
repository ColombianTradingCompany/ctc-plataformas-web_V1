"use client";

// ── Datawave · app #2 del Estudio de Contenido ───────────────────────────────
// Puerto del prototipo `reference_coffeed/Datawave/datawave.jsx`. Un episodio es
// UN objeto spec; el motor produce siempre lo mismo: curvas, tablero ordenado,
// vistazo a la lista, consulta en vivo del "por qué" y un escenario 9:16 que se
// graba con la pantalla.
//
// Lo que cambia respecto al artifact:
//   · la biblioteca vive en Postgres, no en window.storage
//   · las llamadas a Claude son Server Actions (la clave nunca baja al cliente)
//   · el episodio terminado se ENTREGA a la cola del ECP, que es quien publica
//
// El video en sí se graba fuera: aquí se prepara el escenario, se graba la
// pantalla, y se entrega el archivo o el enlace ya publicado.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildEpisode,
  deleteEpisode,
  listEpisodes,
  lookupList,
  lookupWhy,
  saveEpisode,
  writeScript,
  type DatawaveEpisodeRow,
} from "@/lib/coffeed/datawaveActions";
import { submitVideoDeliverable } from "@/lib/coffeed/deliverableActions";
import { Board, Curves, Picker } from "./DatawaveChart";
import { b64ToBytes, download, makePdf, renderCard, type CardColumn } from "./datawaveCard";
import { DatawaveStyles } from "./DatawaveStyles";
import {
  clamp,
  findBeats,
  fmtVal,
  MAX_PICKS,
  normalize,
  rankedAt,
  rankOf,
  safeNormalize,
  type Beat,
  type RawSpec,
  type Spec,
} from "./model";

type Source = { url: string; title: string };
type Findings = { id: string; tick: number; intro: string; now: string[]; before: string[]; caveat: string; sources: Source[] };
type Official = { tick: number; rows: { label: string; value: string }[]; note: string; sources: Source[] };
type Script = { hook: string; lines: { cue: string; say: string }[]; payoff: string; title: string; description: string; tags: string[] };

type View = "library" | "episode" | "new" | "spec" | "stage";

export function DatawaveStudio() {
  const [library, setLibrary] = useState<DatawaveEpisodeRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("library");

  const refresh = useCallback(async () => {
    setLibrary(await listEpisodes());
  }, []);

  // Solo .then() en el cuerpo del efecto — gotcha #3 (set-state-in-effect).
  useEffect(() => {
    listEpisodes().then((list) => {
      setLibrary(list);
      setLoaded(true);
    });
  }, []);

  const rowActive = library.find((s) => s.id === activeId) ?? null;
  const spec = useMemo(() => safeNormalize((rowActive?.spec as RawSpec) ?? null), [rowActive]);

  const addSpec = async (raw: RawSpec) => {
    const res = await saveEpisode({ spec: raw as Record<string, unknown> });
    if (!res.ok) return;
    await refresh();
    setActiveId(res.data);
    setView("episode");
  };
  const replaceSpec = async (raw: RawSpec) => {
    if (!activeId) return;
    await saveEpisode({ id: activeId, spec: raw as Record<string, unknown> });
    await refresh();
    setView("episode");
  };
  const remove = async (id: string) => {
    await deleteEpisode(id);
    if (activeId === id) setActiveId(null);
    await refresh();
  };
  const duplicate = async (row: DatawaveEpisodeRow) => {
    const raw = { ...(row.spec as RawSpec) };
    raw.title = `${raw.title ?? row.title} (copia)`;
    delete raw.id;
    await addSpec(raw);
  };

  if (view === "stage" && spec) {
    return (
      <>
        <DatawaveStyles />
        <Stage spec={spec} onExit={() => setView("episode")} />
      </>
    );
  }

  return (
    <div className="dw">
      <DatawaveStyles />
      <header className="dw-head">
        <button className="dw-brand" onClick={() => setView("library")}>
          <span className="dw-wave" aria-hidden>
            ▁▃▅▇▅▃▁
          </span>{" "}
          DATAWAVE
        </button>
        <span className="dw-headnote">
          {library.length} episodios{loaded ? "" : " · cargando"}
        </span>
      </header>

      {view === "library" && (
        <div className="dw-lib">
          <div className="dw-eyebrow">El molde</div>
          <h1 className="dw-title">Dos dimensiones, una cabeza lectora, y la razón del movimiento</h1>
          <p className="dw-sub">
            Cada episodio es la misma máquina apuntada a datos distintos: curvas de todo el tramo, un tablero ordenado en un
            tick, un vistazo a la lista entera, y una consulta en vivo de qué causó el movimiento.
          </p>
          <div className="dw-libgrid">
            <button className="dw-newcard" onClick={() => setView("new")}>
              <b>+</b>
              <span>Episodio nuevo</span>
              <small>Nombra un tema y vuelve con cifras documentadas</small>
            </button>
            {library.map((row) => {
              const n = safeNormalize(row.spec as RawSpec);
              if (!n)
                return (
                  <div className="dw-libcard" key={row.id}>
                    <button
                      className="dw-libopen"
                      onClick={() => {
                        setActiveId(row.id);
                        setView("spec");
                      }}
                    >
                      <div className="dw-eyebrow">Spec roto</div>
                      <div className="dw-libtitle">{row.title}</div>
                      <div className="dw-libmeta">Ábrelo para arreglarlo</div>
                    </button>
                    <div className="dw-libact">
                      <button onClick={() => remove(row.id)}>Borrar</button>
                    </div>
                  </div>
                );
              return (
                <div className="dw-libcard" key={row.id}>
                  <button
                    className="dw-libopen"
                    onClick={() => {
                      setActiveId(row.id);
                      setView("episode");
                    }}
                  >
                    <div className="dw-eyebrow">{n.eyebrow}</div>
                    <div className="dw-libtitle">{n.title}</div>
                    <Curves spec={n} picked={n.items.slice(0, 3).map((i) => i.id)} idx={n.ticks.length - 1} log={false} height={72} bare />
                    <div className="dw-libmeta">
                      {n.items.length} {n.itemNoun} · {n.axis.start}–{n.axis.end}
                      {n.provisional ? " · borrador" : ""}
                    </div>
                  </button>
                  <div className="dw-libact">
                    <button onClick={() => duplicate(row)}>Duplicar</button>
                    <button
                      onClick={() => {
                        setActiveId(row.id);
                        setView("spec");
                      }}
                    >
                      Spec
                    </button>
                    <button onClick={() => remove(row.id)}>Borrar</button>
                  </div>
                </div>
              );
            })}
          </div>
          <details className="dw-foot">
            <summary>Qué tiene que contener un spec</summary>
            <p>
              Un eje (inicio, fin, paso), una lista de entradas, y valores para cada una — dados como <code>data</code> denso,
              como <code>points</code> dispersos que se interpolan, o como ondas <code>keys</code> de meseta y caída. Todo lo
              demás —facetas, emblemas, unidad, el sustantivo de una fila— solo cambia palabras y disposición.
            </p>
          </details>
        </div>
      )}

      {view === "new" && (
        <div className="dw-lib">
          <NewEpisode onDone={addSpec} onCancel={() => setView("library")} />
        </div>
      )}

      {view === "spec" && rowActive && (
        <div className="dw-lib">
          <SpecEditor raw={rowActive.spec as RawSpec} onSave={replaceSpec} onCancel={() => setView(activeId ? "episode" : "library")} />
        </div>
      )}

      {view === "episode" && !spec && (
        <div className="dw-lib">
          <div className="dw-warn">Este spec no se puede dibujar. Ábrelo y revisa el eje y la lista de entradas.</div>
          <button className="dw-save" style={{ marginTop: 14 }} onClick={() => setView("spec")}>
            Abrir el spec
          </button>
        </div>
      )}
      {view === "episode" && spec && (
        <Episode
          key={spec.id}
          spec={spec}
          onBack={() => setView("library")}
          onStage={() => setView("stage")}
          onEditSpec={() => setView("spec")}
        />
      )}
    </div>
  );
}

/* =============================== episodio =========================== */

function Episode({ spec, onBack, onStage, onEditSpec }: { spec: Spec; onBack: () => void; onStage: () => void; onEditSpec: () => void }) {
  const last = spec.ticks.length - 1;
  const [idx, setIdx] = useState(Math.round(last * 0.6));
  const [picked, setPicked] = useState<string[]>(() => spec.items.slice(0, 2).map((i) => i.id));
  const [log, setLog] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [findings, setFindings] = useState<Findings | null>(null);
  const [official, setOfficial] = useState<Official | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [preview, setPreview] = useState<{ url: string; jpeg: string; w: number; h: number } | null>(null);
  const [peek, setPeek] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const tick = spec.ticks[idx];

  // El prototipo reseteaba idx/picked en un efecto al cambiar de episodio; aquí
  // el <Episode> va con key={spec.id}, así que cambiar de episodio REMONTA y los
  // inicializadores de useState hacen el trabajo. Un setState síncrono dentro de
  // un efecto es el gotcha #3 del repo (cascada de renders).

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIdx((i) => {
        if (i >= last) {
          setPlaying(false);
          return last;
        }
        return i + 1;
      });
    }, spec.fps / speed);
    return () => clearInterval(id);
  }, [playing, speed, last, spec.fps]);

  const pick = useCallback((id: string | null) => {
    if (id === null) return setPicked([]);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PICKS ? p : [...p, id]));
  }, []);

  const lead = picked[picked.length - 1];
  const leadItem = lead ? spec.byId[lead] : null;
  const beats: Beat[] = useMemo(() => findBeats(spec), [spec]);
  const f = findings && findings.tick === tick ? findings : null;
  const listNow = official && official.tick === tick ? official : null;

  const run = async (kind: "why" | "list" | "script") => {
    setBusy(kind);
    setErr(null);
    setPreview(null);
    if (kind === "why") {
      if (!leadItem) {
        setErr(`Sigue una entrada primero — búscala, o toca una barra.`);
        setBusy(null);
        return;
      }
      const res = await lookupWhy({ subject: spec.subject, label: leadItem.label, axisKey: spec.axis.key, tick });
      if (!res.ok) setErr(res.error);
      else setFindings({ id: lead, tick, ...res.data });
    } else if (kind === "list") {
      const res = await lookupList({ subject: spec.subject, axisKey: spec.axis.key, tick });
      if (!res.ok) setErr(res.error);
      else setOfficial({ tick, ...res.data });
    } else {
      const res = await writeScript({
        title: spec.title,
        subject: spec.subject,
        axisKey: spec.axis.key,
        start: spec.axis.start,
        end: spec.axis.end,
        unit: spec.unit,
        beats: beats.map((b) => ({ t: b.t, text: b.text })),
      });
      if (!res.ok) setErr(res.error);
      else setScript(res.data);
    }
    setBusy(null);
  };

  const columns = (): CardColumn[] => {
    if (listNow) return [{ label: spec.listLabel, rows: listNow.rows.slice(0, 10).map((r) => ({ label: r.label, value: r.value })) }];
    const groups: { id: string | null; label: string }[] = spec.facets.length ? spec.facets : [{ id: null, label: "Ranking" }];
    return groups.slice(0, 2).map((g) => ({
      label: g.label,
      rows: rankedAt(spec, idx, g.id).slice(0, 10).map((r) => ({ label: r.label, value: fmtVal(r.v) })),
    }));
  };

  const buildCard = () => {
    setErr(null);
    try {
      const cv = renderCard({
        spec,
        idx,
        tick,
        picked,
        title: f
          ? `${spec.byId[f.id]?.label || f.id} en ${tick}`
          : picked.length
            ? `${picked.map((p) => spec.byId[p].label).join(", ")} · ${tick}`
            : `${spec.title} · ${tick}`,
        intro: f?.intro || spec.blurb,
        now: f?.now || [],
        before: f?.before || [],
        listLabel: listNow ? `${spec.listLabel} · ${tick}` : `Ranking seguido · ${tick}`,
        columns: columns(),
        footer:
          (listNow ? "Ranking recuperado por búsqueda web en vivo. " : "Ordenado dentro del conjunto que sigue este episodio. ") +
          (spec.sourceNote || ""),
        sources: [...(f?.sources || []), ...(listNow?.sources || [])].slice(0, 4),
      });
      setPreview({ url: cv.toDataURL("image/png"), jpeg: cv.toDataURL("image/jpeg", 0.92), w: cv.width, h: cv.height });
    } catch {
      setErr("No se pudo dibujar la página. Inténtalo cuando haya terminado alguna consulta.");
    }
  };

  const boards: { id: string | null; label: string }[] = spec.facets.length ? spec.facets : [{ id: null, label: "" }];

  return (
    <div className="dw-episode">
      <div className="dw-epbar">
        <button className="dw-back" onClick={onBack}>
          ← Todos los episodios
        </button>
        <div className="dw-epbar-r">
          <button className="dw-ghostbtn" onClick={onEditSpec}>
            Spec
          </button>
          <button className="dw-ghostbtn" onClick={() => setDelivering(true)}>
            Entregar al ECP
          </button>
          <button className="dw-recbtn" onClick={onStage}>
            <i /> Grabar
          </button>
        </div>
      </div>

      <div className="dw-eyebrow">{spec.eyebrow}</div>
      <h1 className="dw-title">{spec.title}</h1>
      {spec.blurb && <p className="dw-sub">{spec.blurb}</p>}
      {spec.provisional && (
        <div className="dw-warn">Cifras sin verificar. Las formas sirven, los números no — refréscalos antes de publicar.</div>
      )}

      <div className="dw-card">
        <div className="dw-chartbar">
          <span className="dw-unit">{spec.unit || spec.axis.key}</span>
          <button className="dw-toggle" aria-pressed={log} onClick={() => setLog((v) => !v)}>
            {log ? "Escala log" : "Escala lineal"}
          </button>
        </div>
        <Curves spec={spec} picked={picked} idx={idx} log={log} onPick={pick} />
        <Picker spec={spec} picked={picked} onPick={pick} />
        {picked.length > 0 && (
          <p className="dw-hint dw-readout">
            En {tick}: {picked.map((id) => `${spec.byId[id].label} ${fmtVal(spec.byId[id].v[idx])} (#${rankOf(spec, id, idx)})`).join(" · ")}
          </p>
        )}
        {leadItem?.why && (
          <p className="dw-why">
            <b>{leadItem.label}:</b> {leadItem.why}. Es lo que se repite — contrástalo con la consulta de abajo.
          </p>
        )}
      </div>

      <div className="dw-card">
        <div className="dw-scrub">
          <button className="dw-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pausar" : "Reproducir"}>
            {playing ? "❚❚" : "▶"}
          </button>
          <div className="dw-ticknum">{tick}</div>
          <input
            className="dw-slider"
            type="range"
            min={0}
            max={last}
            value={idx}
            aria-label={spec.axis.key}
            onChange={(e) => {
              setPlaying(false);
              setIdx(+e.target.value);
            }}
          />
          <button className="dw-speed" onClick={() => setSpeed((s) => (s >= 4 ? 0.5 : s * 2))}>
            {speed}×
          </button>
        </div>
        <div className="dw-boards" style={{ gridTemplateColumns: `repeat(${Math.min(boards.length, 2)}, minmax(0,1fr))` }}>
          {boards.map((b) => (
            <Board key={b.id || "all"} spec={spec} facet={b.id} label={b.label} idx={idx} picked={picked} onPick={pick} />
          ))}
        </div>
        <button className="dw-peektoggle" onClick={() => setPeek((v) => !v)}>
          {peek ? "Ocultar la lista completa" : `Ver las ${spec.items.length} entradas`}
        </button>
        {peek && (
          <div className="dw-peek">
            {boards.map((b) => (
              <div key={b.id || "all"}>
                {b.label && <div className="dw-grouplabel">{b.label}</div>}
                <ol className="dw-peeklist">
                  {rankedAt(spec, idx, b.id).map((r) => (
                    <li key={r.id} className={picked.includes(r.id) ? "is-picked" : ""} onClick={() => pick(r.id)}>
                      <span>
                        {r.emblem} {r.label}
                      </span>
                      <b>{fmtVal(r.v)}</b>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dw-card">
        <div className="dw-actions">
          <button className="dw-btn" disabled={!!busy} onClick={() => run("why")}>
            Investigar {leadItem?.label || "esta entrada"} en {tick}
            <small>Dónde está, y qué llevó hasta ahí</small>
          </button>
          <button className="dw-btn alt" disabled={!!busy} onClick={() => run("list")}>
            Traer el ranking real
            <small>
              {spec.listLabel} de {tick}
            </small>
          </button>
        </div>
        {busy && (
          <div className="dw-loading">
            <span className="dw-pulse" />
            {busy === "script" ? "Escribiendo el guion…" : `Buscando para ${tick}…`}
          </div>
        )}
        {err && <div className="dw-err">{err}</div>}

        {f && (
          <div>
            <p className="dw-intro">{f.intro}</p>
            <div className="dw-sec">
              <div className="dw-seclabel">Dónde está en {tick}</div>
              <ul className="dw-list">
                {f.now.map((b, i) => (
                  <li key={i}>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="dw-sec">
              <div className="dw-seclabel">Qué llevó hasta aquí</div>
              <ul className="dw-list">
                {f.before.map((b, i) => (
                  <li key={i}>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            {f.caveat && <p className="dw-caveat">{f.caveat}</p>}
            {f.sources.length > 0 && (
              <div className="dw-srcs">
                <div className="dw-seclabel">Fuentes</div>
                {f.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {findings && findings.tick !== tick && (
          <p className="dw-hint">
            Los hallazgos de {spec.byId[findings.id]?.label} en {findings.tick} quedan apartados — vuelve ahí para leerlos.
          </p>
        )}
        {listNow && (
          <div className="dw-sec">
            <div className="dw-seclabel">
              {spec.listLabel} · {tick}
            </div>
            {listNow.note && <p className="dw-hint">{listNow.note}</p>}
            <ol className="dw-official">
              {listNow.rows.slice(0, 10).map((r, i) => (
                <li key={i}>
                  <span>{r.label}</span>
                  <b>{r.value}</b>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="dw-card">
        <div className="dw-seclabel">Los giros que hay en los datos</div>
        <ul className="dw-beats">
          {beats.map((b, i) => (
            <li
              key={i}
              onClick={() => {
                setPlaying(false);
                setIdx(clamp(spec.ticks.indexOf(b.t), 0, last));
              }}
            >
              <b>{b.t}</b>
              <span>{b.text}</span>
            </li>
          ))}
          {!beats.length && (
            <li>
              <span>No hay cambios de liderazgo en este tramo — considera un rango más ancho o más entradas.</span>
            </li>
          )}
        </ul>
        <button className="dw-btn alt" disabled={!!busy} onClick={() => run("script")}>
          Escribir el guion
          <small>Gancho, líneas con pie, título y descripción</small>
        </button>
        {script && (
          <div className="dw-script">
            <p className="dw-intro">{script.hook}</p>
            <ol className="dw-cues">
              {script.lines.map((l, i) => (
                <li key={i}>
                  <b>{l.cue}</b>
                  <span>{l.say}</span>
                </li>
              ))}
            </ol>
            <p className="dw-caveat">{script.payoff}</p>
            <div className="dw-sec">
              <div className="dw-seclabel">Publicar como</div>
              <p className="dw-intro" style={{ marginTop: 6 }}>
                {script.title}
              </p>
              <p className="dw-hint">{script.description}</p>
              <p className="dw-hint">{script.tags.map((t) => "#" + t).join(" ")}</p>
            </div>
          </div>
        )}
      </div>

      <div className="dw-card">
        <div className="dw-seclabel">Para llevar</div>
        <p className="dw-hint">Una página: los hallazgos, tus curvas y el ranking en {tick}.</p>
        <div className="dw-saverow">
          <button className="dw-save" onClick={buildCard}>
            Armar la página
          </button>
          {preview && (
            <button
              className="dw-save"
              onClick={() =>
                fetch(preview.url)
                  .then((r) => r.blob())
                  .then((b) => download(b, `${spec.id}-${tick}.png`))
              }
            >
              Guardar PNG
            </button>
          )}
          {preview && (
            <button className="dw-save" onClick={() => download(makePdf(b64ToBytes(preview.jpeg.split(",")[1]), preview.w, preview.h), `${spec.id}-${tick}.pdf`)}>
              Guardar PDF
            </button>
          )}
        </div>
        {preview && (
          <div className="dw-preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL de canvas, no un asset */}
            <img src={preview.url} alt={`${spec.title} en ${tick}`} />
          </div>
        )}
      </div>

      {spec.sourceNote && (
        <details className="dw-foot">
          <summary>Sobre estos datos</summary>
          <p>{spec.sourceNote}</p>
          <p>
            Todo lo que se presenta como hecho —rankings oficiales, las razones detrás de un movimiento— viene de la consulta en
            vivo, que busca en la web y lista sus fuentes. Trata las notas incorporadas como hipótesis por comprobar.
          </p>
        </details>
      )}

      {delivering && <DeliverModal spec={spec} script={script} onClose={() => setDelivering(false)} />}
    </div>
  );
}

/* ============================== la entrega ========================== */

/** El video se graba fuera de la app; aquí se entrega el resultado. */
function DeliverModal({ spec, script, onClose }: { spec: Spec; script: Script | null; onClose: () => void }) {
  const [title, setTitle] = useState(script?.title || spec.title);
  const [excerpt, setExcerpt] = useState(script?.description || spec.blurb);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const go = async () => {
    setBusy(true);
    setErr(null);
    const res = await submitVideoDeliverable({ title, excerpt, url, episodeId: spec.id, aspect: "9:16" });
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else setDone(true);
  };

  return (
    <div className="dw-newep" style={{ marginTop: 18 }}>
      <div className="dw-seclabel">Entregar al ECP</div>
      {done ? (
        <>
          <p className="dw-hint">
            Entregado. Está en la cola de Coffeed esperando luz verde — publicar es cosa del ECP, no del taller.
          </p>
          <div className="dw-saverow">
            <button className="dw-save" onClick={onClose}>
              Listo
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="dw-hint">
            Graba el escenario con la pantalla, súbelo a YouTube o Instagram, y pega aquí el enlace. La entrega entra en la cola
            del ECP; allí se le da luz verde y se publica en el muro.
          </p>
          <label className="dw-field">
            <span>Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="dw-field">
            <span>Descripción</span>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
          </label>
          <label className="dw-field">
            <span>Enlace del video</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/… · https://www.instagram.com/reel/…" />
          </label>
          {err && <div className="dw-err">{err}</div>}
          <div className="dw-saverow">
            <button className="dw-save" disabled={busy} onClick={go}>
              {busy ? "Entregando…" : "Entregar"}
            </button>
            <button className="dw-ghostbtn" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================ escenario ========================= */

function Stage({ spec, onExit }: { spec: Spec; onExit: () => void }) {
  const last = spec.ticks.length - 1;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(3);
  const [chrome, setChrome] = useState(true);

  useEffect(() => {
    const t = setInterval(
      () =>
        setCount((c) => {
          if (c <= 1) {
            clearInterval(t);
            setPlaying(true);
            setChrome(false);
            return 0;
          }
          return c - 1;
        }),
      900
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setIdx((i) => {
          if (i >= last) {
            setPlaying(false);
            return last;
          }
          return i + 1;
        }),
      spec.fps
    );
    return () => clearInterval(id);
  }, [playing, last, spec.fps]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onExit]);

  const boards: { id: string | null; label: string }[] = spec.facets.length ? spec.facets : [{ id: null, label: "" }];

  return (
    <div className="dw-stagewrap" onMouseMove={() => setChrome(true)} onMouseLeave={() => setChrome(false)}>
      <div className="dw-stage">
        <div className="dw-stage-head">
          <div className="dw-stage-eyebrow">{spec.eyebrow}</div>
          <div className="dw-stage-title">{spec.title}</div>
        </div>
        <div className="dw-stage-tick">{spec.ticks[idx]}</div>
        <div className="dw-stage-body" style={{ gridTemplateRows: `repeat(${boards.length}, minmax(0,1fr))` }}>
          {boards.map((b) => (
            <div key={b.id || "all"}>
              {b.label && <div className="dw-stage-board">{b.label}</div>}
              <Board spec={spec} facet={b.id} label="" idx={idx} picked={[]} rowH={52} big />
            </div>
          ))}
        </div>
        <div className="dw-stage-foot">
          <div className="dw-stage-unit">{spec.unit}</div>
          <div className="dw-stage-progress">
            <span style={{ width: `${(idx / last) * 100}%` }} />
          </div>
        </div>
        {count > 0 && <div className="dw-count">{count}</div>}
      </div>
      <div className={"dw-stagectl" + (chrome ? "" : " is-hidden")}>
        <button
          onClick={() => {
            setIdx(0);
            setPlaying(true);
          }}
        >
          Reiniciar
        </button>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pausar" : "Reproducir"}</button>
        <button onClick={onExit}>Salir</button>
        <span>Graba esta pantalla. Espacio reproduce, Esc sale.</span>
      </div>
    </div>
  );
}

/* ============================ episodio nuevo ======================== */

function NewEpisode({ onDone, onCancel }: { onDone: (raw: RawSpec) => void; onCancel: () => void }) {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState(1990);
  const [end, setEnd] = useState(2025);
  const [step, setStep] = useState(1);
  const [count, setCount] = useState(12);
  const [axisKey, setAxisKey] = useState("Año");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    if (!topic.trim()) return setErr("Nombra el tema primero — con una línea basta.");
    setBusy(true);
    setErr(null);
    const res = await buildEpisode({
      topic: topic.trim(),
      notes: notes.trim(),
      start: +start,
      end: +end,
      step: +step || 1,
      count,
      axisKey,
      topN: 8,
    });
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else onDone(res.data as RawSpec);
  };

  return (
    <div className="dw-newep">
      <div className="dw-seclabel">Episodio nuevo</div>
      <label className="dw-field">
        <span>Tema</span>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Países exportadores de café arábica" />
      </label>
      <label className="dw-field">
        <span>
          Dirección <i>opcional</i>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Usa sacos de 60 kg. Incluye un origen que se hunda a mitad del tramo."
        />
      </label>
      <div className="dw-fieldrow">
        <label className="dw-field">
          <span>Eje</span>
          <input value={axisKey} onChange={(e) => setAxisKey(e.target.value)} />
        </label>
        <label className="dw-field">
          <span>Desde</span>
          <input type="number" value={start} onChange={(e) => setStart(+e.target.value)} />
        </label>
        <label className="dw-field">
          <span>Hasta</span>
          <input type="number" value={end} onChange={(e) => setEnd(+e.target.value)} />
        </label>
        <label className="dw-field">
          <span>Paso</span>
          <input type="number" min="1" value={step} onChange={(e) => setStep(+e.target.value)} />
        </label>
        <label className="dw-field">
          <span>Entradas</span>
          <input type="number" min="4" max="20" value={count} onChange={(e) => setCount(+e.target.value)} />
        </label>
      </div>
      {err && <div className="dw-err">{err}</div>}
      <div className="dw-saverow">
        <button className="dw-save" disabled={busy} onClick={go}>
          {busy ? "Documentando cifras…" : "Constrúyelo"}
        </button>
        <button className="dw-ghostbtn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      <p className="dw-hint">
        La construcción busca cifras reales en la web y devuelve un spec. Es un asistente de documentación, no una fuente:
        contrástalo con lo que cita antes de grabar nada.
      </p>
    </div>
  );
}

/* ============================== editor de spec ====================== */

function SpecEditor({ raw, onSave, onCancel }: { raw: RawSpec; onSave: (raw: RawSpec) => void; onCancel: () => void }) {
  const [text, setText] = useState(() => JSON.stringify(raw, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="dw-newep">
      <div className="dw-seclabel">Spec</div>
      <p className="dw-hint">
        El episodio entero es este objeto. Edítalo, pega uno, o cópialo para tenerlo bajo control de versiones.
      </p>
      <textarea className="dw-json" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      {err && <div className="dw-err">{err}</div>}
      <div className="dw-saverow">
        <button
          className="dw-save"
          onClick={() => {
            try {
              const parsed = JSON.parse(text) as RawSpec;
              normalize(parsed); // si no se puede dibujar, no se guarda
              onSave(parsed);
            } catch (e) {
              setErr("Ese JSON no se puede leer: " + (e as Error).message);
            }
          }}
        >
          Guardar spec
        </button>
        <button className="dw-ghostbtn" onClick={() => navigator.clipboard?.writeText(text)}>
          Copiar
        </button>
        <button className="dw-ghostbtn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
