"use client";

// ── Escena + Toma · la mesa ──────────────────────────────────────────────────
// Una escena, muchas tomas. Una toma es UN intento del plano.
//
// V3.2 — lo que cambió y por qué. El «Ajuste de cámara» de la V3.1 no ajustaba
// nada: escribía números en la toma y el previo era un dibujo fijo. Ahora el
// previo ES la toma: una cámara de verdad sobre un espacio de verdad (ver
// `stage.ts`), y cada mando la mueve mientras lo arrastras. Los presets pasaron
// de ser seis dibujos distintos a catorce POSICIONES DE CÁMARA, que es lo que
// permite además inventarse las que no están.

import { useMemo, useState } from "react";
import { Info, Portrait, Sheet, Spinner, Field } from "./parts";
import { NewScene } from "./StoryTab";
import { StageView } from "./StageView";
import { VoiceOverEditor } from "./VoiceOver";
import { renderTake } from "@/lib/coffeed/rtScriptorActions";
import { stageRefs } from "./raster";
import {
  camLabel,
  camLabelOf,
  checkTake,
  marksOf,
  newTake,
  sceneHeading,
  sceneLength,
  sceneProps,
  takesOfScene,
  tc,
  uid,
  applyShot,
  matchShot,
  CAMERA_DEFAULT,
  DIALS,
  FRAMES_PER_TAKE,
  LETTERS,
  MARK_DEFAULT,
  PALETTE,
  SHOTS,
  STATUSES,
  TREATMENTS,
  type Camera,
  type Deck,
  type Project,
  type RenderJob,
  type RenderProvider,
  type Take,
  type Treatment,
} from "./model";

type Patch = (fn: (p: Project) => Project) => void;

export function StageTab({
  project,
  patch,
  assets,
  renders,
  deck,
  onRender,
  sceneId,
  setSceneId,
}: {
  project: Project;
  patch: Patch;
  assets: Record<string, string>;
  renders: RenderJob[];
  deck: Deck | null;
  onRender: (job: RenderJob) => void;
  sceneId: string;
  setSceneId: (id: string) => void;
}) {
  const scenes = project.scenes;
  const scene = scenes.find((s) => s.id === sceneId) || scenes[0];
  const takes = takesOfScene(project, scene.id);
  const [takeId, setTakeId] = useState<string | undefined>(takes[0]?.id);
  const take = takes.find((t) => t.id === takeId) || takes[0];
  const [busy, setBusy] = useState<RenderProvider | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [frames, setFrames] = useState<number>(FRAMES_PER_TAKE.def);
  const [addScene, setAddScene] = useState(false);
  const [addChar, setAddChar] = useState(false);
  const [shownFrame, setShownFrame] = useState<string | null>(null);
  const [shotId, setShotId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [guides, setGuides] = useState(true);

  const chOf = (id: string) => project.characters.find((c) => c.id === id);
  const L = sceneLength(takes);
  const patchTake = (id: string, u: Partial<Take>) => patch((p) => ({ ...p, takes: p.takes.map((t) => (t.id === id ? { ...t, ...u } : t)) }));
  const flags = checkTake(project, take);
  // Todos los revelados de esta toma, del más nuevo al más viejo. Cada uno es
  // un encuadre que se probó y que se puede recuperar entero.
  const shots = take ? renders.filter((r) => r.takeId === take.id && r.state === "complete" && r.frames.length) : [];
  const job = shots.find((r) => r.id === shotId) ?? shots[0];
  const shown = job?.frames.find((f) => f.path === shownFrame) ?? job?.frames[0];
  const sameAsNow =
    !!job?.config && !!take && JSON.stringify({ c: job.config.cam, t: job.config.treatment, d: job.config.dur }) === JSON.stringify({ c: take.cam, t: take.treatment, d: take.dur });

  const escenario = scene.escenarioId ? project.escenarios.find((e) => e.id === scene.escenarioId) : null;
  const heading = sceneHeading(project, scene);

  const palette = useMemo(() => {
    // La paleta manda del ESCENARIO si la tiene; si no, de la baraja del vídeo.
    const pal = escenario?.palette?.length && escenario.palette.length >= 3 ? escenario.palette : deck?.palette?.length ? deck.palette : ["#141A1B", "#1B2A33", "#C9C6BD"];
    return { ground: pal[0] ?? "#141A1B", sky: pal[1] ?? "#1B2A33", ink: pal[2] ?? "#C9C6BD" };
  }, [deck, escenario]);

  const stageInput = useMemo(() => {
    if (!take) return null;
    const marks = marksOf(take);
    return {
      cam: take.cam,
      treatment: take.treatment,
      actors: take.cast
        .map((cid) => {
          const c = chOf(cid);
          return c ? { id: c.id, color: c.color, mark: marks[cid], height: 172 } : null;
        })
        .filter(Boolean) as { id: string; color: string; mark: { x: number; z: number }; height: number }[],
      props: sceneProps(project, scene, take.cast).map(({ prop, x, z }) => {
        const owner = prop.ownerId && take.cast.includes(prop.ownerId) ? marks[prop.ownerId] : null;
        return { id: prop.id, label: prop.name, x: owner ? owner.x + 25 : x, z: owner ? owner.z + 25 : z, w: prop.w, h: prop.h, d: prop.d, color: prop.color };
      }),
      palette,
      aspect: project.aspect,
      phase: 0.5,
      width: 960,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, scene, project.characters, project.props, project.escenarios, palette, project.aspect]);

  const runRender = async (provider: RenderProvider) => {
    if (!take || !stageInput) return;
    setBusy(provider);
    setErr(null);
    // Para pedir fotografía hay que mandar el encuadre: se rasteriza aquí el
    // mismo cuadro que está en pantalla y viaja como referencia.
    const refs = provider === "imagen" ? await stageRefs(stageInput, frames) : undefined;
    const r = await renderTake({ projectId: project.id, takeId: take.id, frames, provider, refs });
    setBusy(null);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    onRender(r.data);
    setShotId(r.data.id);
    setShownFrame(r.data.frames[0]?.path ?? null);
  };

  const addCharacter = (name: string, role: string) => {
    const used = project.characters.map((c) => c.id);
    const code = LETTERS.split("").find((l) => !used.includes(l)) || uid("c");
    patch((p) => ({
      ...p,
      characters: [
        ...p.characters,
        { id: code, name: name.trim() || `Personaje ${code}`, role, bio: "", color: PALETTE[p.characters.length % PALETTE.length], traits: [], pics: { profile: null, body: null, detail: null } },
      ],
      scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, cast: [...s.cast, code] } : s)),
      // También entra en la toma abierta: si lo añades desde aquí, es porque lo
      // quieres en el cuadro que estás mirando.
      takes: p.takes.map((t) => (t.id === take?.id ? { ...t, cast: [...t.cast, code] } : t)),
    }));
    setPicked(code);
  };

  if (!take) {
    return (
      <div className="rt-card">
        <div className="rt-body">
          <p className="rt-note">Esta escena no tiene ninguna toma todavía, así que no ocupa metraje.</p>
          <button
            type="button"
            className="rt-btn"
            style={{ marginTop: 10 }}
            onClick={() => patch((p) => ({ ...p, takes: [...p.takes, newTake({ id: uid("tk"), sceneId: scene.id, no: 1, cast: scene.cast.slice(0, 2), dur: 30 })] }))}
          >
            + Primera toma
          </button>
        </div>
      </div>
    );
  }

  const cam = take.cam;
  const setCam = (u: Partial<Camera>) => patchTake(take.id, { cam: { ...cam, ...u } });
  const activeShot = matchShot(cam);
  const marks = marksOf(take);
  const pickedMark = picked ? marks[picked] : null;

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <div className="rt-ribbon" style={{ overflowX: "auto" }}>
        {scenes.map((s, i) => (
          <button type="button" key={s.id} className="rt-rb" data-on={s.id === scene.id ? "1" : "0"} style={{ flex: "0 0 118px" }} onClick={() => setSceneId(s.id)}>
            <b>SC{String(i + 1).padStart(2, "0")}</b>
            <u>{s.title}</u>
          </button>
        ))}
        <button type="button" className="rt-rb" style={{ flex: "0 0 60px", borderStyle: "dashed", color: "var(--mute)" }} onClick={() => setAddScene(true)}>
          +
        </button>
      </div>

      <div className="rt-card">
        <div className="rt-head">
          <h2>{heading.slug}</h2>
          {escenario && (
            <span className="rt-chip" style={{ borderColor: "var(--signal)", color: "var(--signal)" }} title={escenario.note || undefined}>
              {escenario.name}
            </span>
          )}
          <span className="rt-chip" style={{ borderColor: L.provisional ? "var(--amber)" : "var(--edge)", color: L.provisional ? "var(--amber)" : "var(--mute)" }}>
            {tc(L.seconds)}
            {L.provisional ? " provisional" : ` · ${L.printed} buena(s)`}
          </span>
          <div className="rt-sp" />

          {/* El estado de la toma, con lo que significa cada palabra: son las
              cuatro de una claqueta y no se explican solas. */}
          <span className="rt-statusrow">
            <em>Estado de la toma</em>
            {STATUSES.map((s) => (
              <button
                type="button"
                key={s.key}
                className="rt-btn"
                title={s.hint}
                data-on={take.status === s.key ? "1" : "0"}
                style={take.status === s.key ? { background: s.color, borderColor: s.color, color: "#12100F" } : undefined}
                onClick={() => patchTake(take.id, { status: s.key })}
              >
                {s.label}
              </button>
            ))}
            <Info
              title="Los cuatro estados"
              side="right"
              text="Una toma es un intento del plano y va marcada como en un rodaje. ABIERTA: aún se está montando. ESPERA: puede que sirva, se decide luego. BUENA: ésta va al montaje — y es la única que cuenta, porque la duración de la escena SUMA sus tomas buenas y el guion lee la buena. NG (no good): no sirve; se guarda para saber qué se probó."
            />
          </span>

          <button type="button" className="rt-btn" data-tone="go" disabled={flags.some((f) => f.kind === "block") || !!busy} onClick={() => runRender("previs")}>
            {busy === "previs" ? <Spinner label="Revelando" /> : "Acción"}
          </button>
          <button
            type="button"
            className="rt-btn"
            data-on="1"
            disabled={flags.some((f) => f.kind === "block") || !!busy}
            onClick={() => runRender("imagen")}
            title="Genera una FOTOGRAFÍA por fotograma con Gemini, usando este encuadre como referencia. Tarda y consume cuota."
          >
            {busy === "imagen" ? <Spinner label="Fotografiando" /> : "Acción · imagen"}
          </button>
          <Info
            title="Los dos botones"
            side="right"
            text="«Acción» dibuja: congela en archivos el cuadro que estás viendo, al instante y sin coste. «Acción · imagen» hace lo mismo y ADEMÁS le pide a Gemini una fotografía de cada fotograma, mandándole el dibujo como referencia para que respete el encuadre — tarda, gasta cuota, y si falla te quedas con el dibujo y el motivo escrito. Los dos se bloquean mientras haya una bandera de continuidad sin resolver: revelar es la parte cara, así que la comprobación va antes."
          />
        </div>
      </div>

      {flags.map((f, i) => (
        <div className="rt-flag" data-kind={f.kind} key={i}>
          <b>{f.code}</b>
          <span>{f.text}</span>
          {f.id && f.code === "fuera de la escena" && (
            <button type="button" className="rt-btn rt-sp" onClick={() => patchTake(take.id, { cast: take.cast.filter((c) => c !== f.id) })}>
              Sacar de la toma
            </button>
          )}
        </div>
      ))}
      {err && (
        <div className="rt-flag" data-kind="block">
          <b>no se reveló</b>
          <span>{err}</span>
        </div>
      )}

      <div className="rt-strip">
        <div className="rt-perf" />
        <div className="rt-frames">
          {takes.map((t) => (
            <button type="button" key={t.id} className="rt-frame" data-on={t.id === take.id ? "1" : "0"} onClick={() => setTakeId(t.id)} title={camLabel(t)}>
              <small>T{String(t.no).padStart(2, "0")}</small>
              <svg viewBox="0 0 96 60" width="100%" style={{ display: "block", opacity: t.id === take.id ? 1 : 0.5 }}>
                <rect width="96" height="60" fill="#121819" />
                <path d="M0 43 L32 29 L96 47" fill="none" stroke="#495453" strokeWidth="1" />
                {t.cast.slice(0, 4).map((cid, k) => (
                  <g key={cid} transform={`translate(${22 + k * 18},20)`}>
                    <circle r="4.2" fill="none" stroke={chOf(cid)?.color} strokeWidth="1.3" />
                    <path d="M0 5v12M-5 11l5-4M5 11l-5-4" fill="none" stroke={chOf(cid)?.color} strokeWidth="1.3" strokeLinecap="round" />
                  </g>
                ))}
                <text x="5" y="56" fontSize="7" fontFamily="ui-monospace, monospace" fill="#5C6766">
                  {tc(t.dur)}
                </text>
                <text x="91" y="56" textAnchor="end" fontSize="7" fontFamily="ui-monospace, monospace" fill={STATUSES.find((s) => s.key === t.status)?.color}>
                  {STATUSES.find((s) => s.key === t.status)?.label.toUpperCase()}
                </text>
              </svg>
            </button>
          ))}
          <button
            type="button"
            className="rt-newtake"
            title="Toma nueva — hereda la cámara de ésta"
            onClick={() => {
              const id = uid("tk");
              patch((p) => ({ ...p, takes: [...p.takes, newTake({ id, sceneId: scene.id, no: takes.length + 1, cast: take.cast, dur: take.dur, from: take })] }));
              setTakeId(id);
            }}
          >
            +
          </button>
        </div>
        <div className="rt-perf" />
      </div>

      {/* ── el cuadro, y a su lado los mandos que lo mueven ── */}
      <div className="rt-stagewrap">
        <section>
          <p className="rt-label">
            El cuadro
            <Info
              title="El cuadro"
              text="Esto no es una ilustración: es la toma. La rejilla es el suelo, las figuras están plantadas sobre él en centímetros, y la cámara los mira desde donde la pongas. Pulsa a alguien para elegirlo y moverlo por el espacio. Al pulsar «Acción» se congela exactamente este cuadro."
            />
            <span>{camLabel(take)}</span>
          </p>

          {stageInput && <StageView input={stageInput} selected={picked} onSelect={(id) => setPicked(id === picked ? null : id)} showGuides={guides} />}

          <div className="rt-row" style={{ marginTop: 8 }}>
            <button type="button" className="rt-btn" data-on={guides ? "1" : "0"} onClick={() => setGuides((g) => !g)}>
              Guías
            </button>
            <button type="button" className="rt-btn" onClick={() => setCam({ ...CAMERA_DEFAULT, hold: cam.hold })} title="Devuelve la cámara al sitio de partida">
              Reencuadrar
            </button>
            <div className="rt-sp" />
            <span className="rt-phase">Fase 1 · fotogramas</span>
            <Info
              title="Qué produce «Acción» hoy"
              side="right"
              text="Fotogramas, no movimiento: varias imágenes repartidas por la toma, compuestas con esta cámara y la baraja de estilo del vídeo. Cada una guarda además su prompt escrito, que es el trabajo caro — la fase 2 lo manda a un modelo de imagen y devuelve la fotografía. El movimiento viene después."
            />
            <label className="rt-mono" style={{ fontSize: 10, color: "var(--mute)", display: "flex", gap: 6, alignItems: "center" }}>
              fotogramas
              <input type="range" min={FRAMES_PER_TAKE.min} max={FRAMES_PER_TAKE.max} value={frames} onChange={(e) => setFrames(Number(e.target.value))} style={{ width: 80, accentColor: "var(--signal)" }} />
              <b style={{ color: "var(--bone)" }}>{frames}</b>
            </label>
          </div>

          {/* Cada revelado es una TIRA con su propia configuración guardada.
              Sin eso, tocar un mando convertía la tira en una mentira: seguía
              enseñando imágenes de una cámara que ya no existía. */}
          {shots.length > 1 && (
            <div className="rt-row" style={{ marginTop: 8, gap: 4 }}>
              <span className="rt-mono" style={{ fontSize: 9.5, color: "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                Revelados
              </span>
              {shots.map((r, i) => (
                <button type="button" key={r.id} className="rt-shot" data-on={r.id === job?.id ? "1" : "0"} onClick={() => setShotId(r.id)} title={r.config ? camLabelOf(r.config) : "sin configuración guardada"}>
                  {shots.length - i}
                </button>
              ))}
            </div>
          )}

          {job ? (
            <div className="rt-photos" style={{ marginTop: 8 }}>
              {job.frames.map((f) => (
                <button
                  type="button"
                  key={f.n}
                  className="rt-photo"
                  data-on={shown?.n === f.n ? "1" : "0"}
                  onClick={() => setShownFrame(f.path)}
                  title={f.error ? `Se quedó en dibujo: ${f.error}` : f.prompt.slice(0, 240)}
                >
                  {f.path && assets[f.path] ? <img src={assets[f.path]} alt={`Fotograma ${f.n}`} /> : <div style={{ aspectRatio: "16/9", background: "#0E1213" }} />}
                  <u>
                    {String(f.n).padStart(2, "0")} · {tc(f.at)}
                    {/* Qué estás mirando: una fotografía o el dibujo. Si se
                        pidió imagen y no salió, se dice — no se disimula. */}
                    {f.real ? <b style={{ color: "var(--ok)" }}> · foto</b> : f.error ? <b style={{ color: "var(--grease)" }}> · dibujo</b> : null}
                  </u>
                </button>
              ))}
            </div>
          ) : (
            <p className="rt-note" style={{ marginTop: 8 }}>Sin revelar. «Acción» congela este cuadro en archivos.</p>
          )}

          {/* Si se pidió fotografía y NINGUNA salió, el motivo no puede vivir
              escondido en el title de una miniatura: es lo único que explica
              por qué estás mirando dibujos. */}
          {job && job.frames.some((f) => f.error) && !job.frames.some((f) => f.real) && (
            <div className="rt-flag" data-kind="block" style={{ marginTop: 8 }}>
              <b>se quedó en dibujo</b>
              <span>{job.frames.find((f) => f.error)?.error}</span>
            </div>
          )}

          {job?.config && (
            <div className="rt-shotcfg">
              <span>
                Revelado con <b>{camLabelOf(job.config)}</b> · {Math.round(job.config.cam.dist)}cm · {job.config.cam.lens}mm · {job.config.cast.join(" ") || "sin reparto"}
                {job.config.escenarioName ? ` · ${job.config.escenarioName}` : ""} · {tc(job.config.dur)}
              </span>
              {!sameAsNow && (
                <button
                  type="button"
                  className="rt-btn"
                  onClick={() => patchTake(take.id, { cam: { ...job.config!.cam }, treatment: job.config!.treatment, marks: { ...job.config!.marks }, dur: job.config!.dur })}
                  title="Devuelve la toma exactamente a la cámara con la que se reveló esta tira"
                >
                  Volver a este encuadre
                </button>
              )}
              {sameAsNow && <span className="rt-mono" style={{ color: "var(--ok)", fontSize: 9.5 }}>= lo que ves ahora</span>}
            </div>
          )}

          {shown && (
            <details className="rt-prompt">
              <summary>Ver el prompt del fotograma {shown.n}</summary>
              <pre>{shown.prompt}</pre>
            </details>
          )}
        </section>

        {/* ── los mandos ── */}
        <section className="rt-rig">
          {/* Antes de decidir DÓNDE se pone la cámara hay que decidir QUÉ está
              mirando: en qué sitio pasa y qué hay dentro. */}
          <p className="rt-label">
            Composición de la escena
            <Info
              title="Composición"
              text="Primero el sitio, luego el encuadre. El escenario trae su decorado —los objetos con sus medidas, puestos donde se pusieron— y su paleta, y todo eso aparece dentro del cuadro. Los objetos de un personaje viajan con él sin colocarlos aquí. Se crean y se visten en las pestañas Escenarios y Props."
            />
          </p>
          <select
            className="rt-in"
            value={scene.escenarioId ?? ""}
            onChange={(e) => patch((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, escenarioId: e.target.value || null } : s)) }))}
          >
            <option value="">Sin escenario — «{scene.location}» a secas</option>
            {project.escenarios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.int}. {e.name}
              </option>
            ))}
          </select>
          {!project.escenarios.length && (
            <p className="rt-note" style={{ marginTop: 6 }}>
              Todavía no hay escenarios. Sin uno, el cuadro no tiene nada alrededor: solo suelo.
            </p>
          )}
          {escenario && (
            <div className="rt-row" style={{ marginTop: 6, gap: 5 }}>
              <span className="rt-note">
                {escenario.props.length} objeto(s) en el decorado
                {project.props.filter((x) => x.ownerId && take.cast.includes(x.ownerId)).length > 0 &&
                  ` · ${project.props.filter((x) => x.ownerId && take.cast.includes(x.ownerId)).length} que trae el reparto`}
              </span>
            </div>
          )}
          <div className="rt-dial" style={{ marginTop: 8 }}>
            <label title="El momento del día es de la ESCENA aunque el escenario proponga uno: la misma bodega es otra cosa de noche.">
              Momento del día<b>{heading.tod || "—"}</b>
            </label>
            <input
              className="rt-in"
              style={{ padding: "4px 8px", fontSize: 12 }}
              value={scene.tod}
              placeholder={escenario?.tod || "NOCHE"}
              onChange={(e) => patch((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, tod: e.target.value.toUpperCase() } : s)) }))}
            />
          </div>

          <p className="rt-label" style={{ marginTop: 14 }}>
            Encuadres
            <Info
              title="Encuadres"
              text="Cada uno es una POSICIÓN DE CÁMARA guardada, no un dibujo distinto: al pulsarlo la cámara se planta ahí y los mandos de abajo saltan a esos valores. A partir de ese punto muévelos y busca el tuyo — el chip se apaga en cuanto te separas, que es la señal de que ya es tu encuadre y no el del preset."
            />
          </p>
          <div className="rt-shots">
            {SHOTS.map((s) => (
              <button type="button" key={s.key} className="rt-shot" data-on={activeShot === s.key ? "1" : "0"} onClick={() => setCam(applyShot(cam, s.key))}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Qué ES el plano, que no es lo mismo que dónde está la cámara. La
              explicación va A LA VISTA y no detrás de un icono: escondida no
              la leyó nadie, y las etiquetas solas no significan nada. */}
          <p className="rt-label" style={{ marginTop: 14 }}>
            ¿Qué es este plano?
            <Info
              title="¿Qué es este plano?"
              text="Los mandos de arriba dicen DÓNDE se planta la cámara. Esto dice qué estamos viendo: si hay una cámara filmando la escena (normal), si el cuadro son los ojos de un personaje (subjetivo) o si la cámara va sujeta a mano y por tanto no está quieta. Son tres cosas distintas, no tres posiciones."
            />
          </p>
          <div className="rt-seg" style={{ width: "100%" }}>
            {TREATMENTS.map((t) => (
              <button type="button" key={t.key} title={t.hint} data-on={take.treatment === t.key ? "1" : "0"} onClick={() => patchTake(take.id, { treatment: t.key as Treatment })} style={{ flex: 1 }}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="rt-note" style={{ marginTop: 5 }}>
            {TREATMENTS.find((t) => t.key === take.treatment)?.sub} — {TREATMENTS.find((t) => t.key === take.treatment)?.hint}
          </p>

          <p className="rt-label" style={{ marginTop: 14 }}>
            Cámara <span>{Math.round(cam.dist)}cm · {cam.lens}mm</span>
          </p>
          <div className="rt-dials">
            {DIALS.map((d) => (
              <div className="rt-dial" key={d.key}>
                <label htmlFor={`d-${take.id}-${d.key}`} title={d.hint}>
                  {d.label}
                  <b>
                    {Math.round(cam[d.key])}
                    {d.unit}
                  </b>
                </label>
                <input
                  id={`d-${take.id}-${d.key}`}
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={cam[d.key]}
                  onChange={(e) => setCam({ [d.key]: Number(e.target.value) } as Partial<Camera>)}
                />
              </div>
            ))}
          </div>

          <p className="rt-label" style={{ marginTop: 14 }}>
            Duración de la toma <span>{tc(take.dur)}</span>
          </p>
          <div className="rt-dial">
            <label htmlFor={`dur-${take.id}`} title="La escena suma sus tomas BUENAS. Cambia esto y se re-proporciona la línea de tiempo entera.">
              Segundos<b>{take.dur}s</b>
            </label>
            <input id={`dur-${take.id}`} type="range" min="1" max="300" step="1" value={take.dur} onChange={(e) => patchTake(take.id, { dur: Number(e.target.value) })} />
          </div>

          {/* ── mover a la gente por el espacio ── */}
          <p className="rt-label" style={{ marginTop: 14 }}>
            En la escena
            <Info
              title="En la escena"
              text="Los encendidos están en esta toma; púlsalos para meterlos o sacarlos. Elige uno —aquí o en el propio cuadro— y aparecen sus mandos de posición: dónde se planta en el suelo. La marca es de la TOMA, así que volver a marcar para el siguiente intento no toca los anteriores."
            />
            <span>{take.cast.length} en cuadro</span>
          </p>
          <div className="rt-mini-row">
            {scene.cast.map((cid) => {
              const c = chOf(cid);
              const on = take.cast.includes(cid);
              return (
                <button
                  type="button"
                  key={cid}
                  className="rt-mini"
                  data-on={on ? "1" : "0"}
                  title={`${c?.name} — ${on ? "quitar de" : "añadir a"} la toma`}
                  onClick={() => {
                    patchTake(take.id, { cast: on ? take.cast.filter((x) => x !== cid) : [...take.cast, cid] });
                    setPicked(cid);
                  }}
                >
                  <div style={{ opacity: on ? 1 : 0.4 }}>
                    <Portrait ch={c} assets={assets} h={44} />
                  </div>
                  <u>{cid}</u>
                </button>
              );
            })}
            <button type="button" className="rt-mini rt-mini-add" onClick={() => setAddChar(true)} title="Crear un personaje y meterlo en esta escena y en esta toma">
              <span>+</span>
              <u>nuevo</u>
            </button>
          </div>

          {picked && pickedMark && take.cast.includes(picked) && (
            <div className="rt-markbox">
              <p className="rt-label" style={{ marginTop: 0 }}>
                Marca de {chOf(picked)?.name ?? picked}
                <span>
                  x {Math.round(pickedMark.x)} · z {Math.round(pickedMark.z)}
                </span>
              </p>
              {(
                [
                  { k: "x" as const, label: "Lateral", hint: "Izquierda o derecha del eje de la cámara, en cm." },
                  { k: "z" as const, label: "Profundidad", hint: "Más cerca o más lejos de la cámara. Es lo que separa a dos personas en el cuadro sin moverlas de lado." },
                ]
              ).map((m) => (
                <div className="rt-dial" key={m.k}>
                  <label title={m.hint}>
                    {m.label}
                    <b>{Math.round(pickedMark[m.k])}cm</b>
                  </label>
                  <input
                    type="range"
                    min={-400}
                    max={400}
                    step={5}
                    value={pickedMark[m.k]}
                    onChange={(e) => patchTake(take.id, { marks: { ...marks, [picked]: { ...pickedMark, [m.k]: Number(e.target.value) } } })}
                  />
                </div>
              ))}
              <button
                type="button"
                className="rt-btn"
                onClick={() => {
                  const i = take.cast.indexOf(picked);
                  patchTake(take.id, { marks: { ...marks, [picked]: MARK_DEFAULT(i, take.cast.length) } });
                }}
              >
                Volver a la fila
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── dirección, voz en off y diálogo ── */}
      <div className="rt-split">
        <section>
          <p className="rt-label">
            Dirección de la toma
            <Info title="Dirección de la toma" text="En qué se diferencia este intento del anterior. Es lo que lee el revelado y lo que acaba como línea de acción en el guion técnico. También se puede escribir desde la pestaña Guion y empujarlo de vuelta a estos mandos." />
          </p>
          <textarea
            className="rt-in"
            key={take.id}
            defaultValue={take.direction}
            style={{ minHeight: 110 }}
            placeholder="En qué se diferencia esta toma de la anterior."
            onBlur={(e) => patchTake(take.id, { direction: e.target.value })}
          />

          <p className="rt-label" style={{ marginTop: 14 }}>
            Diálogo <span>{(project.dialogue[take.id] || []).length} líneas</span>
          </p>
          {(project.dialogue[take.id] || []).length === 0 && <p className="rt-note">Toma muda. Los insertos y los recursos suelen serlo. Se escribe en la pestaña Guion.</p>}
          {(project.dialogue[take.id] || []).map((d, i) => (
            <div className="rt-line" key={i}>
              <span className="rt-cue" style={{ color: chOf(d.c)?.color }}>
                {chOf(d.c)?.name.split(" ")[0]}
              </span>
              <p>{d.line || <em style={{ color: "var(--mute)" }}>{d.dir}</em>}</p>
            </div>
          ))}
        </section>

        <section>
          <p className="rt-label">
            Voz en off de la escena
            <Info title="Voz en off" text="Es de la ESCENA, no de la toma: por eso sigue ahí cuando cambias de toma. Puede anclarse a una toma para decir por dónde entra, o dejarse suelta y correr por encima de toda la escena." />
            <span>{(project.voiceovers[scene.id] ?? []).length}</span>
          </p>
          <VoiceOverEditor
            items={project.voiceovers[scene.id] ?? []}
            characters={project.characters}
            takes={takes}
            onChange={(v) => patch((p) => ({ ...p, voiceovers: { ...p.voiceovers, [scene.id]: v } }))}
          />
        </section>
      </div>

      {addScene && <NewScene project={project} patch={patch} onClose={() => setAddScene(false)} onDone={(id) => setSceneId(id)} />}
      {addChar && <QuickCharacter onClose={() => setAddChar(false)} onCreate={addCharacter} sceneTitle={scene.title} />}
    </div>
  );
}

/** Crear un personaje SIN salir de la mesa. Lo mínimo para no perder el hilo:
 *  nombre y rol. Todo lo demás —foto, rasgos, color— se afina en Personajes. */
function QuickCharacter({ onClose, onCreate, sceneTitle }: { onClose: () => void; onCreate: (name: string, role: string) => void; sceneTitle: string }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  return (
    <Sheet
      title="Personaje nuevo"
      onClose={onClose}
      info="Se crea a nivel del VÍDEO —los personajes son de todo el vídeo, no de una escena— y entra de una vez en esta escena y en la toma abierta. Las fotos, los rasgos y el color se afinan luego en la pestaña Personajes."
      footer={
        <>
          <button
            type="button"
            className="rt-btn"
            data-tone="go"
            disabled={!name.trim()}
            onClick={() => {
              onCreate(name, role);
              onClose();
            }}
          >
            Crear y meter en la escena
          </button>
          <button type="button" className="rt-btn" onClick={onClose}>
            Cancelar
          </button>
          <span className="rt-note rt-sp">Entra en «{sceneTitle}» y en esta toma</span>
        </>
      }
    >
      <Field label="Nombre">
        <input className="rt-in" autoFocus value={name} placeholder="Miriam Rueda" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Rol">
        <input className="rt-in" value={role} placeholder="Protagonista · productora" onChange={(e) => setRole(e.target.value)} />
      </Field>
    </Sheet>
  );
}
