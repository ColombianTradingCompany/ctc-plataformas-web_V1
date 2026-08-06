"use client";

// ── RT-Scriptor · el armazón ─────────────────────────────────────────────────
// «Build one take at the time». Puerto del prototipo del owner
// (`reference_coffeed/RT-Scriptor/rt-scriptor.jsx`) a la plataforma.
//
// DESVIACIÓN de la guía de integración que venía en el paquete: aquel documento
// pedía un `ScriptorAdapter` inyectado por prop, para que el componente no
// importara nunca una ruta de datos. Aquí se importan las Server Actions
// directamente — que es el patrón de Datawave y del resto del Estudio. La razón
// es de mantenimiento: una sesión futura que abra este archivo tiene que
// encontrar lo mismo que hay en `DatawaveStudio.tsx`, no una segunda
// arquitectura que solo existe en un módulo. La frontera que el adaptador
// protegía —que la UI no toque Supabase— la protegen igual las actions.
//
// Lo que sí se conserva del espíritu: escritura optimista con la base como
// árbitro. La pantalla cambia al instante, el guardado va detrás y el
// indicador de estado dice la verdad si Postgres rechaza algo.

import { useCallback, useEffect, useRef, useState } from "react";
import { RTScriptorStyles } from "./RTScriptorStyles";
import { Field, Info, ProjectArt, Sheet, Spinner, Toggles } from "./parts";
import { StoryTab } from "./StoryTab";
import { CastTab } from "./CastTab";
import { StageTab } from "./StageTab";
import { ScriptTab } from "./ScriptTab";
import { SeriesTab } from "./SeriesTab";
import {
  createProject,
  deleteProject,
  deleteSeries,
  loadProject,
  saveDeck,
  saveProject,
  saveSeries,
  submitGuion,
  uploadRtsImage,
  type Workshop,
} from "@/lib/coffeed/rtScriptorActions";
import {
  projectDuration,
  sceneLength,
  takesOfScene,
  tc,
  uid,
  GRADIENTS,
  PALETTE,
  type Deck,
  type Project,
  type ProjectCard,
  type RenderJob,
  type Series,
} from "./model";

type Save = "idle" | "saving" | "saved" | "error";
type Tab = "story" | "cast" | "stage" | "script" | "series";

export function RTScriptor({ initial }: { initial: Workshop }) {
  const [cards, setCards] = useState<ProjectCard[]>(initial.projects);
  const [decks, setDecks] = useState<Deck[]>(initial.decks);
  const [series, setSeries] = useState<Series[]>(initial.series);
  const [assets, setAssets] = useState<Record<string, string>>(initial.assets);

  const [project, setProject] = useState<Project | null>(null);
  const [renders, setRenders] = useState<RenderJob[]>([]);
  const [tab, setTab] = useState<Tab>("story");
  const [selection, setSelection] = useState<{ type: "storyline" | "scene"; id: string } | null>(null);
  const [sceneId, setSceneId] = useState<string>("");
  const [settings, setSettings] = useState<"art" | "series" | null>(null);
  const [deliver, setDeliver] = useState(false);
  const [save, setSave] = useState<Save>("idle");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string>("all"); // nota 5
  const [loading, setLoading] = useState(false);

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addAssets = useCallback((extra: Record<string, string>) => setAssets((a) => ({ ...a, ...extra })), []);

  const patch = useCallback((fn: (p: Project) => Project) => {
    dirty.current = true;
    setProject((p) => (p ? fn(p) : p));
  }, []);

  // ── el guardado: optimista, con retardo, y honesto cuando falla ──
  useEffect(() => {
    if (!project || !dirty.current) return;
    setSave("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const p = project;
      const r = await saveProject({
        id: p.id,
        title: p.title,
        code: p.code,
        aspect: p.aspect,
        seriesId: p.seriesId,
        deckId: p.deckId,
        doc: {
          characters: p.characters,
          scenes: p.scenes,
          storylines: p.storylines,
          takes: p.takes,
          dialogue: p.dialogue,
          voiceovers: p.voiceovers,
        },
      });
      if (!r.ok) {
        setSave("error");
        setSaveErr(r.error);
        return;
      }
      dirty.current = false;
      setSave("saved");
      setSaveErr(null);
      setCards((cs) =>
        cs.map((c) =>
          c.id === p.id
            ? {
                ...c,
                title: p.title,
                code: p.code,
                seriesId: p.seriesId,
                deckId: p.deckId,
                updatedAt: r.data,
                scenes: p.scenes.length,
                storylines: p.storylines.length,
                characters: p.characters.length,
                duration: projectDuration(p),
                spark: sparkOf(p),
                threads: p.storylines.map((sl) => ({ id: sl.id, color: sl.color, sceneIds: sl.sceneIds })),
              }
            : c
        )
      );
    }, 1400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [project]);

  const open = async (id: string) => {
    setLoading(true);
    const data = await loadProject(id);
    setLoading(false);
    if (!data) {
      setSaveErr("No se pudo abrir el vídeo. Recarga la página.");
      return;
    }
    dirty.current = false;
    setProject(data.project);
    setRenders(data.renders);
    addAssets(data.assets);
    setSceneId(data.project.scenes[0]?.id ?? "");
    setSelection(null);
    setTab("story");
    setSave("idle");
  };

  const backToHub = () => {
    setProject(null);
    setRenders([]);
    setSelection(null);
  };

  const newProject = async () => {
    const r = await createProject("Vídeo sin título");
    if (!r.ok) {
      setSaveErr(r.error);
      return;
    }
    setCards((cs) => [
      {
        id: r.data,
        slug: "",
        title: "Vídeo sin título",
        code: "VI",
        seriesId: null,
        deckId: null,
        updatedAt: new Date().toISOString(),
        scenes: 0,
        storylines: 0,
        characters: 0,
        duration: 0,
        spark: [],
        threads: [],
      },
      ...cs,
    ]);
    await open(r.data);
  };

  const total = project ? projectDuration(project) : 0;
  const TABS: [Tab, string, string][] = project
    ? [
        ["story", "Hilos narrativos", String(project.storylines.length).padStart(2, "0")],
        ["cast", "Personajes", String(project.characters.length).padStart(2, "0")],
        ["stage", "Escena + Toma", String(project.scenes.length).padStart(2, "0")],
        ["script", "Guion y dirección", ""],
        ["series", "Serie", series.find((s) => s.id === project.seriesId) ? "SET" : "—"],
      ]
    : [];

  return (
    <div className="rt-root">
      <RTScriptorStyles />

      <header className="rt-slate">
        <div className="rt-slate-in">
          <div>
            <button type="button" className="rt-mark" onClick={backToHub}>
              RT<span>—</span>Scriptor
            </button>
            <div className="rt-tag">{project ? "una toma cada vez" : "sala de vídeos"}</div>
          </div>
          {project && (
            <>
              <button type="button" className="rt-btn" onClick={backToHub}>
                ← Sala
              </button>
              <div className="rt-readout">
                <div>
                  <i>vídeo</i>
                  <b>{project.title}</b>
                </div>
                <div>
                  <i>escenas</i>
                  <b>{String(project.scenes.length).padStart(2, "0")}</b>
                </div>
                <div>
                  <i>metraje</i>
                  <b>{tc(total)}</b>
                </div>
              </div>
              <span className="rt-save" data-s={save} title={saveErr ?? undefined}>
                {save === "saving" ? "guardando…" : save === "saved" ? "guardado" : save === "error" ? "sin guardar" : "al día"}
              </span>
            </>
          )}
          <div className="rt-sp" />
          {project && (
            <button type="button" className="rt-btn" data-tone="go" onClick={() => setDeliver(true)}>
              Entregar al ECP
            </button>
          )}
          <button type="button" className="rt-btn" onClick={() => setSettings("art")}>
            Ajustes
          </button>
        </div>
      </header>

      {saveErr && (
        <div className="rt-wrap" style={{ paddingTop: 12 }}>
          <div className="rt-flag" data-kind="block">
            <b>la base rechazó el cambio</b>
            <span>{saveErr}</span>
          </div>
        </div>
      )}

      {!project && (
        <Hub
          cards={cards}
          series={series}
          decks={decks}
          filter={seriesFilter}
          setFilter={setSeriesFilter}
          loading={loading}
          onOpen={open}
          onNew={newProject}
          onSettings={(t) => setSettings(t)}
          onDelete={async (id) => {
            const r = await deleteProject(id);
            if (r.ok) setCards((cs) => cs.filter((c) => c.id !== id));
            else setSaveErr(r.error);
          }}
        />
      )}

      {project && (
        <div className="rt-wrap">
          <nav className="rt-tabs">
            {TABS.map(([id, label, badge]) => (
              <button type="button" key={id} className="rt-tab" data-on={tab === id ? "1" : "0"} onClick={() => setTab(id)}>
                {label}
                {badge && <em>{badge}</em>}
              </button>
            ))}
          </nav>

          {tab === "story" && (
            <StoryTab
              project={project}
              patch={patch}
              selection={selection}
              setSelection={setSelection}
              onOpenScene={(id) => {
                setSceneId(id);
                setTab("stage");
              }}
            />
          )}
          {tab === "cast" && (
            <CastTab
              project={project}
              patch={patch}
              assets={assets}
              onAsset={(p, u) => addAssets({ [p]: u })}
              inSeries={Boolean(project.seriesId && (series.find((s) => s.id === project.seriesId)?.videoIds.length ?? 0) > 1)}
            />
          )}
          {tab === "stage" &&
            (project.scenes.length ? (
              <StageTab
                project={project}
                patch={patch}
                assets={assets}
                renders={renders}
                deck={decks.find((d) => d.id === project.deckId) ?? null}
                onRender={(job) => {
                  setRenders((rs) => [job, ...rs.filter((r) => r.id !== job.id)]);
                  // Los fotogramas recién revelados vienen con ruta, no con url:
                  // se firman al vuelo para poder mirarlos sin recargar.
                  void refreshAssets(job, addAssets);
                }}
                sceneId={sceneId && project.scenes.find((s) => s.id === sceneId) ? sceneId : project.scenes[0].id}
                setSceneId={setSceneId}
              />
            ) : (
              <p className="rt-note">Todavía no hay escenas — añade una en la pestaña de hilos narrativos.</p>
            ))}
          {tab === "script" && <ScriptTab project={project} patch={patch} />}
          {tab === "series" && (
            <SeriesTab
              project={project}
              cards={cards}
              series={series}
              decks={decks}
              assets={assets}
              patch={patch}
              openSettings={() => setSettings("series")}
              openProject={open}
            />
          )}
        </div>
      )}

      {settings && (
        <Settings
          decks={decks}
          setDecks={setDecks}
          series={series}
          setSeries={setSeries}
          cards={cards}
          assets={assets}
          onAsset={(p, u) => addAssets({ [p]: u })}
          tab={settings}
          onClose={() => setSettings(null)}
          onError={setSaveErr}
        />
      )}

      {deliver && project && <DeliverSheet project={project} onClose={() => setDeliver(false)} />}
    </div>
  );
}

/* ── helpers del armazón ─────────────────────────────────────────────────── */

function sparkOf(p: Project) {
  const total = projectDuration(p) || 1;
  let acc = 0;
  return p.scenes.map((s) => {
    const dur = sceneLength(takesOfScene(p, s.id)).seconds;
    const x = acc / total;
    acc += dur;
    return { id: s.id, x, w: dur / total };
  });
}

/** Un revelado recién hecho trae rutas; para pintarlas hacen falta urls
 *  firmadas. Se recarga el proyecto solo para quedarse con su mapa de firmas. */
async function refreshAssets(job: RenderJob, addAssets: (a: Record<string, string>) => void) {
  const data = await loadProject(job.projectId);
  if (data) addAssets(data.assets);
}

/* ── la sala de vídeos ───────────────────────────────────────────────────── */

function Hub({
  cards,
  series,
  decks,
  filter,
  setFilter,
  loading,
  onOpen,
  onNew,
  onSettings,
  onDelete,
}: {
  cards: ProjectCard[];
  series: Series[];
  decks: Deck[];
  filter: string;
  setFilter: (v: string) => void;
  loading: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onSettings: (t: "art" | "series") => void;
  onDelete: (id: string) => void;
}) {
  // nota 5 · el filtro por serie
  const shown = cards.filter((c) => (filter === "all" ? true : filter === "solo" ? !c.seriesId : c.seriesId === filter));

  return (
    <div className="rt-wrap" style={{ paddingTop: 20 }}>
      <div className="rt-row" style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--cond)", fontWeight: 500, fontSize: 15, letterSpacing: ".2em", textTransform: "uppercase" }}>
          Sala de vídeos
        </h2>
        <Info
          title="Sala de vídeos"
          text="Todos los vídeos del Estudio y donde empieza uno nuevo. Cada vídeo se guarda por su cuenta; los Ajustes guardan lo que comparten — las barajas de estilo y las series."
        />
        <p className="rt-note" style={{ marginLeft: 6 }}>
          {cards.length} vídeos · {series.length} series · {decks.length} barajas
        </p>
        <div className="rt-sp" />
        <button type="button" className="rt-btn" onClick={() => onSettings("art")}>
          Estilo y tono
        </button>
        <button type="button" className="rt-btn" onClick={() => onSettings("series")}>
          Series
        </button>
      </div>

      <div className="rt-filter">
        <button type="button" className="rt-btn" data-on={filter === "all" ? "1" : "0"} onClick={() => setFilter("all")}>
          Todos
        </button>
        {series.map((s) => (
          <button type="button" key={s.id} className="rt-btn" data-on={filter === s.id ? "1" : "0"} onClick={() => setFilter(s.id)}>
            {s.name}
          </button>
        ))}
        <button type="button" className="rt-btn" data-on={filter === "solo" ? "1" : "0"} onClick={() => setFilter("solo")}>
          Sueltos
        </button>
      </div>

      {loading && (
        <p className="rt-note" style={{ marginBottom: 10 }}>
          <Spinner label="Abriendo el vídeo" />
        </p>
      )}

      <div className="rt-hubgrid">
        {shown.map((p) => {
          const set = series.find((s) => s.id === p.seriesId);
          return (
            <div key={p.id} className="rt-proj">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen(p.id)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(p.id)}
                style={{ cursor: "pointer" }}
              >
                <div className="rt-proj-art">
                  <ProjectArt card={p} />
                </div>
                <div className="rt-proj-b">
                  <h3>{p.title}</h3>
                  <p className="rt-proj-m">
                    {p.scenes} escenas · {p.storylines} hilos · {tc(p.duration)}
                  </p>
                  <div className="rt-chips" style={{ marginTop: 8 }}>
                    {set && (
                      <span className="rt-chip" style={{ borderColor: "var(--signal)", color: "var(--signal)" }}>
                        {set.name}
                      </span>
                    )}
                    <span className="rt-chip">{decks.find((d) => d.id === p.deckId)?.name || "sin baraja"}</span>
                  </div>
                </div>
              </div>
              <div className="rt-row" style={{ padding: "0 12px 11px" }}>
                <span className="rt-mono" style={{ fontSize: 9.5, color: "var(--faint)" }}>
                  {new Date(p.updatedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  type="button"
                  className="rt-btn rt-sp"
                  style={{ padding: "3px 8px" }}
                  onClick={() => {
                    if (confirm(`¿Borrar «${p.title}»? No se puede deshacer.`)) onDelete(p.id);
                  }}
                >
                  Borrar
                </button>
              </div>
            </div>
          );
        })}
        <button type="button" className="rt-new" onClick={onNew}>
          + Vídeo nuevo
        </button>
      </div>

      <p className="rt-note" style={{ marginTop: 16, maxWidth: 640 }}>
        Cada tarjeta dibuja sus propios hilos como una chispa — los puntos son escenas, colocadas sobre el metraje de ese vídeo. Es la
        lectura más rápida de si un proyecto tiene ya estructura.
      </p>
    </div>
  );
}

/* ── ajustes: barajas de estilo y series ─────────────────────────────────── */

function Settings({
  decks,
  setDecks,
  series,
  setSeries,
  cards,
  assets,
  onAsset,
  tab: initTab,
  onClose,
  onError,
}: {
  decks: Deck[];
  setDecks: (fn: (d: Deck[]) => Deck[]) => void;
  series: Series[];
  setSeries: (fn: (s: Series[]) => Series[]) => void;
  cards: ProjectCard[];
  assets: Record<string, string>;
  onAsset: (path: string, url: string) => void;
  tab: "art" | "series";
  onClose: () => void;
  onError: (e: string) => void;
}) {
  const [tab, setTab] = useState(initTab);
  const [deckId, setDeckId] = useState<string | null>(decks[0]?.id ?? null);
  const [setId, setSetId] = useState<string | null>(series[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const deck = decks.find((d) => d.id === deckId);
  const set = series.find((s) => s.id === setId);

  const persistDeck = async (d: Deck) => {
    setBusy(true);
    const r = await saveDeck(d);
    setBusy(false);
    if (!r.ok) onError(r.error);
  };
  const persistSet = async (s: Series) => {
    setBusy(true);
    const r = await saveSeries(s);
    setBusy(false);
    if (!r.ok) onError(r.error);
  };

  const upDeck = (u: Partial<Deck>) => {
    if (!deck) return;
    const next = { ...deck, ...u };
    setDecks((ds) => ds.map((d) => (d.id === deck.id ? next : d)));
    void persistDeck(next);
  };
  const upSet = (u: Partial<Series>) => {
    if (!set) return;
    const next = { ...set, ...u };
    setSeries((ss) => ss.map((s) => (s.id === set.id ? next : s)));
    void persistSet(next);
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !deck) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    form.set("scope", "deck");
    form.set("owner", deck.id);
    const r = await uploadRtsImage(form);
    setBusy(false);
    if (!r.ok) {
      onError(r.error);
      return;
    }
    onAsset(r.data.path, r.data.url);
    upDeck({ images: [...deck.images, { id: uid("i"), label: file.name.slice(0, 18), path: r.data.path }].slice(0, 10) });
  };

  return (
    <Sheet
      wide
      title="Ajustes"
      onClose={onClose}
      info="Todo lo que se comparte entre vídeos vive aquí: los estilos visuales contra los que se revelan y las series que los agrupan."
    >
      <div className="rt-seg" style={{ marginBottom: 15 }}>
        <button type="button" data-on={tab === "art" ? "1" : "0"} onClick={() => setTab("art")}>
          Estilo y tono
        </button>
        <button type="button" data-on={tab === "series" ? "1" : "0"} onClick={() => setTab("series")}>
          Series
        </button>
      </div>

      {tab === "art" && (
        <div>
          <div className="rt-row" style={{ marginBottom: 12 }}>
            {decks.map((d) => (
              <button type="button" key={d.id} className="rt-btn" data-on={d.id === deckId ? "1" : "0"} onClick={() => setDeckId(d.id)}>
                {d.name}
              </button>
            ))}
            <button
              type="button"
              className="rt-btn"
              onClick={async () => {
                const r = await saveDeck({ name: "Baraja nueva", descriptors: [], palette: [], images: [] });
                if (!r.ok) return onError(r.error);
                setDecks((ds) => [...ds, { id: r.data, name: "Baraja nueva", descriptors: [], palette: [], images: [] }]);
                setDeckId(r.data);
              }}
            >
              + Baraja
            </button>
            <Info
              title="Baraja de estilo"
              side="right"
              text="Hasta diez imágenes de referencia más las palabras con que las describes. La baraja es lo que lee el revelado para el aspecto — luz, grano, paleta — así que todo vídeo enganchado a ella sale del mismo mundo. Diez es el techo a propósito: una baraja que lo dice todo no dice nada."
            />
            {busy && <span className="rt-note">guardando…</span>}
          </div>

          {deck && (
            <div>
              <Field label="Nombre de la baraja">
                <input className="rt-in" value={deck.name} onChange={(e) => upDeck({ name: e.target.value })} />
              </Field>
              <Field label={`Imágenes de referencia · ${deck.images.length} de 10`}>
                <div className="rt-slots">
                  {deck.images.map((im) => (
                    <button
                      type="button"
                      key={im.id}
                      className="rt-slot"
                      style={{ background: im.grad || "#141A1B" }}
                      title="Quitar"
                      onClick={() => upDeck({ images: deck.images.filter((x) => x.id !== im.id) })}
                    >
                      {im.path && assets[im.path] && <img src={assets[im.path]} alt={im.label} />}
                      <u>{im.label}</u>
                    </button>
                  ))}
                  {deck.images.length < 10 && (
                    <button type="button" className="rt-slot rt-slot-add" onClick={() => fileRef.current?.click()}>
                      +
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" style={{ display: "none" }} onChange={onFiles} />
                <div className="rt-row" style={{ marginTop: 9 }}>
                  <span className="rt-note">o añade un degradado de muestra:</span>
                  {GRADIENTS.map((g, i) => (
                    <button
                      type="button"
                      key={i}
                      className="rt-sw"
                      style={{ background: g, width: 26, height: 20 }}
                      aria-label={`muestra ${i + 1}`}
                      disabled={deck.images.length >= 10}
                      onClick={() => upDeck({ images: [...deck.images, { id: uid("i"), label: `muestra ${i + 1}`, path: null, grad: g }] })}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Palabras de tono" info="Separadas por comas. Van al revelado junto a las imágenes: las imágenes dan el aspecto, las palabras dan la intención.">
                <input
                  className="rt-in"
                  value={deck.descriptors.join(", ")}
                  onChange={(e) => upDeck({ descriptors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>
              <Field label="Paleta" info="Los tres primeros colores mandan de verdad: son el cielo, el suelo y la tinta de cada fotograma revelado.">
                <div className="rt-row">
                  {deck.palette.map((c, i) => (
                    <button
                      type="button"
                      key={`${c}${i}`}
                      className="rt-sw"
                      style={{ background: c, width: 30, height: 24 }}
                      title={`${c} — quitar`}
                      onClick={() => upDeck({ palette: deck.palette.filter((_, k) => k !== i) })}
                    />
                  ))}
                  {PALETTE.filter((c) => !deck.palette.includes(c))
                    .slice(0, 5)
                    .map((c) => (
                      <button
                        type="button"
                        key={c}
                        className="rt-sw"
                        style={{ background: c, width: 30, height: 24, opacity: 0.45 }}
                        title={`añadir ${c}`}
                        onClick={() => upDeck({ palette: [...deck.palette, c] })}
                      />
                    ))}
                </div>
              </Field>
              <p className="rt-note">La usan {cards.filter((c) => c.deckId === deck.id).length} vídeo(s).</p>
            </div>
          )}
        </div>
      )}

      {tab === "series" && (
        <div>
          <div className="rt-row" style={{ marginBottom: 12 }}>
            {series.map((s) => (
              <button type="button" key={s.id} className="rt-btn" data-on={s.id === setId ? "1" : "0"} onClick={() => setSetId(s.id)}>
                {s.name}
              </button>
            ))}
            <button
              type="button"
              className="rt-btn"
              onClick={async () => {
                const r = await saveSeries({ name: "Serie nueva", glue: "", cadence: "", deckId: decks[0]?.id ?? null, videoIds: [] });
                if (!r.ok) return onError(r.error);
                setSeries((ss) => [...ss, { id: r.data, name: "Serie nueva", glue: "", cadence: "", deckId: decks[0]?.id ?? null, videoIds: [] }]);
                setSetId(r.data);
              }}
            >
              + Serie
            </button>
            {busy && <span className="rt-note">guardando…</span>}
          </div>
          {set && (
            <div>
              <Field label="Nombre">
                <input className="rt-in" value={set.name} onChange={(e) => upSet({ name: e.target.value })} />
              </Field>
              <Field label="Pegamento narrativo" info="La restricción que obedece todo vídeo del conjunto. Escríbelo como una regla, no como un resumen de trama.">
                <textarea className="rt-in" value={set.glue} onChange={(e) => upSet({ glue: e.target.value })} />
              </Field>
              <div className="rt-row" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: "1 1 200px" }}>
                  <Field label="Baraja de estilo">
                    <select className="rt-in" value={set.deckId || ""} onChange={(e) => upSet({ deckId: e.target.value || null })}>
                      <option value="">Sin baraja</option>
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <Field label="Cadencia">
                    <input className="rt-in" value={set.cadence} placeholder="Uno al mes" onChange={(e) => upSet({ cadence: e.target.value })} />
                  </Field>
                </div>
              </div>
              <Field label="Vídeos del conjunto" info="El orden del conjunto es el orden en que los marcas — la línea de tiempo por encima de las líneas de tiempo.">
                <Toggles
                  items={cards.map((c) => ({ id: c.id, label: c.title, color: "#4DD0C4" }))}
                  value={set.videoIds}
                  onChange={(v) => upSet({ videoIds: v })}
                  colorKey
                />
              </Field>
              <button
                type="button"
                className="rt-btn"
                onClick={async () => {
                  if (!confirm(`¿Borrar la serie «${set.name}»? Los vídeos no se borran, quedan sueltos.`)) return;
                  const r = await deleteSeries(set.id);
                  if (!r.ok) return onError(r.error);
                  setSeries((ss) => ss.filter((s) => s.id !== set.id));
                  setSetId(null);
                }}
              >
                Borrar serie
              </button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ── la entrega ──────────────────────────────────────────────────────────── */

function DeliverSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const [picked, setPicked] = useState<string[]>(project.scenes.map((s) => s.id));
  const [title, setTitle] = useState(project.title);
  const [excerpt, setExcerpt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const go = async () => {
    setBusy(true);
    setErr(null);
    const r = await submitGuion({ projectId: project.id, sceneIds: picked, title, excerpt });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setDone(true);
  };

  return (
    <Sheet
      title="Entregar al ECP"
      onClose={onClose}
      info="Va a la MISMA cola que el Source Wrapper y Datawave: el ECP la revisa, le da luz verde y la publica en Coffeed. Aquí se produce; allá se publica."
      footer={
        done ? (
          <>
            <span className="rt-note">Entregado. Aparece en ECP · Coffeed → Entregas.</span>
            <button type="button" className="rt-btn rt-sp" onClick={onClose}>
              Cerrar
            </button>
          </>
        ) : (
          <>
            <button type="button" className="rt-btn" data-tone="go" disabled={busy || !picked.length} onClick={go}>
              {busy ? "Entregando…" : "Entregar"}
            </button>
            <button type="button" className="rt-btn" onClick={onClose}>
              Cancelar
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="rt-note">
          El sobre viajó con {picked.length} escena(s) y sus fotogramas. Mientras el ECP no lo publique, no se ve en ninguna superficie
          pública.
        </p>
      ) : (
        <>
          <Field label="Título de la entrega">
            <input className="rt-in" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Entradilla" info="Dos líneas sobre qué está mirando quien lo abra.">
            <textarea className="rt-in" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </Field>
          <Field label={`Escenas · ${picked.length} de ${project.scenes.length}`} info="Solo entran las escenas cuyos fotogramas ya estén revelados. Si falta alguna, la entrega lo dice y no sale.">
            <Toggles
              items={project.scenes.map((s, i) => ({ id: s.id, label: `SC${String(i + 1).padStart(2, "0")} ${s.title}`, color: "#4DD0C4" }))}
              value={picked}
              onChange={setPicked}
              colorKey
            />
          </Field>
          {err && (
            <div className="rt-flag" data-kind="block">
              <b>no se entregó</b>
              <span>{err}</span>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
