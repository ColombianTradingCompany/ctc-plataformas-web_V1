"use client";

// ── Escena + Toma · la mesa ──────────────────────────────────────────────────
// Una escena, muchas tomas. Una toma es UN intento del plano: su propio
// reparto, su ajuste de cámara, su dirección y su duración. Se marca BUENA la
// que funciona, y esa es la que suma metraje y la que llega al guion.
//
// Tres novedades de la V1 viven aquí:
//   · el mando de DURACIÓN de la toma (nota 1) y la duración derivada de la
//     escena en la cabecera, con su aviso de provisional;
//   · el panel de VOZ EN OFF de la escena (nota 2), que es de la escena aunque
//     se edite desde la mesa;
//   · el botón «Acción», que ya no simula: revela FOTOGRAMAS de verdad
//     (nota 6) y los deja en una tira debajo del previo.

import { useState } from "react";
import { Info, Portrait, PreviewArt, ShotArt, GreaseRing } from "./parts";
import { NewScene } from "./StoryTab";
import { VoiceOverEditor } from "./VoiceOver";
import { renderTake } from "@/lib/coffeed/rtScriptorActions";
import {
  checkTake,
  sceneLength,
  shotPreset,
  takeParams,
  takesOfScene,
  tc,
  uid,
  FRAMES_PER_TAKE,
  LENSES,
  SHOT_PRESETS,
  STATUSES,
  type Project,
  type RenderJob,
  type Take,
} from "./model";

type Patch = (fn: (p: Project) => Project) => void;

export function StageTab({
  project,
  patch,
  assets,
  renders,
  onRender,
  sceneId,
  setSceneId,
}: {
  project: Project;
  patch: Patch;
  assets: Record<string, string>;
  renders: RenderJob[];
  onRender: (job: RenderJob) => void;
  sceneId: string;
  setSceneId: (id: string) => void;
}) {
  const scenes = project.scenes;
  const scene = scenes.find((s) => s.id === sceneId) || scenes[0];
  const takes = takesOfScene(project, scene.id);
  const [takeId, setTakeId] = useState<string | undefined>(takes[0]?.id);
  const take = takes.find((t) => t.id === takeId) || takes[0];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [frames, setFrames] = useState<number>(FRAMES_PER_TAKE.def);
  const [addScene, setAddScene] = useState(false);
  const [shownFrame, setShownFrame] = useState<string | null>(null);

  const chOf = (id: string) => project.characters.find((c) => c.id === id);

  // Sin efecto de sincronización a propósito: `take` ya cae en la primera toma
  // cuando el id guardado no existe en esta escena, así que no hay ningún
  // estado que "arreglar" después de renderizar. El prototipo lo hacía con un
  // useEffect que llamaba a setState y eso es una cascada de renders sin
  // ninguna ganancia.
  const L = sceneLength(takes);
  const preset = shotPreset(take?.shot ?? "two");
  const params = take ? takeParams(take) : [];
  const patchTake = (id: string, u: Partial<Take>) => patch((p) => ({ ...p, takes: p.takes.map((t) => (t.id === id ? { ...t, ...u } : t)) }));
  const flags = checkTake(project, take);
  const job = take ? renders.find((r) => r.takeId === take.id && r.state === "complete" && r.frames.length) : undefined;
  const shown = job?.frames.find((f) => f.path === shownFrame) ?? job?.frames[0];

  const runRender = async () => {
    if (!take) return;
    setBusy(true);
    setErr(null);
    const r = await renderTake({ projectId: project.id, takeId: take.id, frames });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    onRender(r.data);
    setShownFrame(r.data.frames[0]?.path ?? null);
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
            onClick={() =>
              patch((p) => ({
                ...p,
                takes: [
                  ...p.takes,
                  { id: uid("tk"), sceneId: scene.id, no: 1, status: "open", cast: scene.cast.slice(0, 2), shot: "two", lens: "Tercera", direction: "", dur: 45, params: null },
                ],
              }))
            }
          >
            + Primera toma
          </button>
        </div>
      </div>
    );
  }

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
          <h2>
            {scene.int}. {scene.location} — {scene.tod}
          </h2>
          <Info
            title="Escena + Toma"
            text="Una escena, muchas tomas. Una toma es un intento del plano: su reparto, su ajuste de cámara, su dirección, su duración. Marca BUENA la que funciona — las buenas son las que suman metraje y las que llegan al guion."
          />
          <span className="rt-chip" style={{ borderColor: L.provisional ? "var(--amber)" : "var(--edge)", color: L.provisional ? "var(--amber)" : "var(--mute)" }}>
            {tc(L.seconds)}
            {L.provisional ? " provisional" : ` · ${L.printed} buena(s)`}
          </span>
          {project.storylines
            .filter((sl) => sl.sceneIds.includes(scene.id))
            .map((sl) => (
              <span key={sl.id} className="rt-chip" style={{ borderColor: sl.color, color: sl.color }}>
                {sl.name}
              </span>
            ))}
          <div className="rt-sp" />
          <div className="rt-row" style={{ gap: 5 }}>
            {STATUSES.map((s) => (
              <button
                type="button"
                key={s.key}
                className="rt-btn"
                data-on={take.status === s.key ? "1" : "0"}
                style={take.status === s.key ? { background: s.color, borderColor: s.color, color: "#12100F" } : undefined}
                onClick={() => patchTake(take.id, { status: s.key })}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" className="rt-btn" data-tone="go" disabled={flags.some((f) => f.kind === "block") || busy} onClick={runRender}>
            {busy ? "Revelando…" : "Acción"}
          </button>
          <Info
            title="Acción"
            side="right"
            text="Revela los fotogramas de esta toma con el ajuste, el reparto y la dirección de ahora mismo. Se bloquea mientras haya una bandera de continuidad sin resolver: revelar es la parte cara, así que la comprobación va antes, no después."
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
            <button type="button" key={t.id} className="rt-frame" data-on={t.id === take.id ? "1" : "0"} onClick={() => setTakeId(t.id)}>
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
              {t.id === take.id && <GreaseRing key={take.id} />}
            </button>
          ))}
          <button
            type="button"
            className="rt-newtake"
            title="Toma nueva"
            onClick={() => {
              const id = uid("tk");
              patch((p) => ({
                ...p,
                takes: [
                  ...p.takes,
                  { id, sceneId: scene.id, no: takes.length + 1, status: "open", cast: take.cast, shot: take.shot, lens: take.lens, direction: "", dur: take.dur, params: take.params },
                ],
              }));
              setTakeId(id);
            }}
          >
            +
          </button>
        </div>
        <div className="rt-perf" />
      </div>

      <div className="rt-cols">
        <section>
          <p className="rt-label">
            Reparto de la toma
            <Info
              title="Reparto de la toma"
              text="Quién está en cuadro en este intento, que no siempre es todo el reparto de la escena. Cubrir una misma escena suele significar gente distinta en cada toma."
            />
            <span>{take.cast.length} en cuadro</span>
          </p>
          <div className="rt-row" style={{ gap: 8, marginBottom: 12 }}>
            {take.cast.map((cid) => (
              <button
                type="button"
                key={cid}
                style={{ width: 54, border: `1px solid ${chOf(cid)?.color}`, background: "#171D1E", padding: 0, cursor: "pointer", overflow: "hidden" }}
                onClick={() => patchTake(take.id, { cast: take.cast.filter((c) => c !== cid) })}
                title={`${chOf(cid)?.name} — quitar de la toma`}
              >
                <Portrait ch={chOf(cid)} assets={assets} h={54} />
                <u className="rt-mono" style={{ display: "block", textDecoration: "none", textAlign: "center", fontSize: 9, color: chOf(cid)?.color, padding: "2px 0 3px" }}>
                  {cid}
                </u>
              </button>
            ))}
          </div>

          <div className="rt-preview">
            {shown?.path && assets[shown.path] ? (
              <img src={assets[shown.path]} alt={`Fotograma ${shown.n}`} />
            ) : (
              <PreviewArt label={`PREVIS · SC/T${String(take.no).padStart(2, "0")} · ${preset.label.toUpperCase()}`} />
            )}
          </div>

          {/* nota 6 · la tira de fotogramas revelados */}
          <div className="rt-row" style={{ marginTop: 10, marginBottom: 6 }}>
            <span className="rt-phase">Fase 1 · fotogramas</span>
            <Info
              title="Qué produce «Acción» hoy"
              text="Fotogramas, no movimiento. Se revelan varias imágenes repartidas por la toma —el principio, el final y lo de en medio— compuestas con el ajuste real de la toma y la baraja de estilo del vídeo. Cada fotograma guarda además su prompt escrito, para que el día que haya un proveedor de imagen no haya que rehacer nada. El movimiento es la fase 2."
            />
            <div className="rt-sp" />
            <label className="rt-mono" style={{ fontSize: 10, color: "var(--mute)", display: "flex", gap: 6, alignItems: "center" }}>
              fotogramas
              <input
                type="range"
                min={FRAMES_PER_TAKE.min}
                max={FRAMES_PER_TAKE.max}
                value={frames}
                onChange={(e) => setFrames(Number(e.target.value))}
                style={{ width: 90, accentColor: "var(--signal)" }}
              />
              <b style={{ color: "var(--bone)" }}>{frames}</b>
            </label>
          </div>
          {job ? (
            <div className="rt-photos">
              {job.frames.map((f) => (
                <button
                  type="button"
                  key={f.n}
                  className="rt-photo"
                  data-on={shown?.n === f.n ? "1" : "0"}
                  onClick={() => setShownFrame(f.path)}
                  title={f.prompt.slice(0, 220)}
                >
                  {f.path && assets[f.path] ? <img src={assets[f.path]} alt={`Fotograma ${f.n}`} /> : <div style={{ aspectRatio: "16/9", background: "#0E1213" }} />}
                  <u>
                    {String(f.n).padStart(2, "0")} · {tc(f.at)}
                  </u>
                </button>
              ))}
            </div>
          ) : (
            <p className="rt-note">Sin revelar. Pulsa «Acción» y esta toma deja de ser solo una configuración.</p>
          )}

          <p className="rt-label" style={{ marginTop: 14 }}>
            Dirección de la toma
            <Info
              title="Dirección de la toma"
              text="En qué se diferencia este intento del anterior. Es lo que lee el revelado, y lo que acaba como línea de acción en el guion técnico. Se puede reescribir también desde la pestaña Guion, y desde allí empujarlo de vuelta a los mandos."
            />
          </p>
          <textarea
            className="rt-in"
            key={take.id}
            defaultValue={take.direction}
            style={{ minHeight: 100 }}
            placeholder="En qué se diferencia esta toma de la anterior."
            onBlur={(e) => patchTake(take.id, { direction: e.target.value })}
          />
        </section>

        <section>
          <p className="rt-label">
            Duración de la toma
            <Info
              title="Duración de la toma"
              text="Aquí es donde se decide cuánto dura la escena: la escena suma sus tomas BUENAS. Cambia esto y se re-proporciona la línea de tiempo entera."
            />
            <span>{tc(take.dur)}</span>
          </p>
          <div className="rt-slider">
            <input type="range" min="5" max="300" step="5" value={take.dur} onChange={(e) => patchTake(take.id, { dur: Number(e.target.value) })} />
          </div>

          <p className="rt-label" style={{ marginTop: 14 }}>
            Ajuste de cámara
            <Info
              title="Ajuste de cámara"
              text="La gramática de esta toma: primero el punto de vista, luego el tipo de plano, luego los números que lo afinan. Los valores se guardan por plano dentro de la toma, así que cambiar de mosaico nunca pierde un ajuste."
            />
          </p>
          <div className="rt-pick" style={{ marginBottom: 12 }}>
            {LENSES.map((l) => (
              <button type="button" key={l} className="rt-btn" data-on={take.lens === l ? "1" : "0"} onClick={() => patchTake(take.id, { lens: l })}>
                {l}
              </button>
            ))}
          </div>
          <div className="rt-tiles">
            {SHOT_PRESETS.map((s) => (
              <button type="button" key={s.key} className="rt-tile" data-on={take.shot === s.key ? "1" : "0"} onClick={() => patchTake(take.id, { shot: s.key })} aria-label={s.label}>
                <div style={{ padding: "10px 6px 20px" }}>
                  <ShotArt id={s.key} c={take.shot === s.key ? "#4DD0C4" : "#8E9793"} />
                </div>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <p className="rt-label" style={{ marginTop: 16 }}>
            Con este plano <span>{preset.label}</span>
          </p>
          {preset.params.map((prm, i) => (
            <div className="rt-slider" key={prm.key}>
              <label htmlFor={`p${take.id}${i}`}>
                {prm.label}
                <b>
                  {params[i]}
                  {prm.unit}
                </b>
              </label>
              <input
                id={`p${take.id}${i}`}
                type="range"
                min="0"
                max={prm.max}
                value={params[i]}
                onChange={(e) =>
                  patchTake(take.id, { params: { ...(take.params || {}), [take.shot]: params.map((x, j) => (j === i ? Number(e.target.value) : x)) } })
                }
              />
            </div>
          ))}

          {/* nota 2 · la voz en off, en la mesa */}
          <p className="rt-label" style={{ marginTop: 16 }}>
            Voz en off de la escena
            <Info
              title="Voz en off"
              text="Es de la ESCENA, no de la toma: por eso sigue ahí cuando cambias de toma. Puede anclarse a una toma para decir por dónde entra, o dejarse suelta y correr por encima de toda la escena."
            />
            <span>{(project.voiceovers[scene.id] ?? []).length}</span>
          </p>
          <VoiceOverEditor
            items={project.voiceovers[scene.id] ?? []}
            characters={project.characters}
            takes={takes}
            onChange={(v) => patch((p) => ({ ...p, voiceovers: { ...p.voiceovers, [scene.id]: v } }))}
          />

          <p className="rt-label" style={{ marginTop: 16 }}>
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
          <p className="rt-label">En la escena</p>
          <div className="rt-scenecast">
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
                  onClick={() => patchTake(take.id, { cast: on ? take.cast.filter((x) => x !== cid) : [...take.cast, cid] })}
                >
                  <div style={{ opacity: on ? 1 : 0.45 }}>
                    <Portrait ch={c} assets={assets} h={54} />
                  </div>
                  <u>{cid}</u>
                </button>
              );
            })}
          </div>
          <p className="rt-note" style={{ marginTop: 10 }}>Los encendidos están en esta toma.</p>
        </section>
      </div>

      {addScene && <NewScene project={project} patch={patch} onClose={() => setAddScene(false)} onDone={(id) => setSceneId(id)} />}
    </div>
  );
}
