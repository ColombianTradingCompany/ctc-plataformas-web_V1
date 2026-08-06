"use client";

// ── Hilos narrativos ─────────────────────────────────────────────────────────
// El eje X es EL VÍDEO, no una lista de escenas. Dos lecturas del mismo
// metraje: «Compases» da a cada escena el mismo ancho (se lee la estructura) y
// «Tiempo real» la escala por su duración (se lee el ritmo).
//
// Lo que cambia respecto al prototipo: la duración ya no se teclea en la ficha
// de escena — sale de las tomas (nota 1). La ficha de escena la MUESTRA, dice
// de dónde sale y manda a la mesa de tomas, que es donde se cambia.

import { useEffect, useMemo, useState } from "react";
import { Field, Info, Sheet, Toggles } from "./parts";
import { VoiceOverEditor } from "./VoiceOver";
import {
  checkProject,
  geometry,
  sceneLength,
  takesOfScene,
  tc,
  uid,
  withDur,
  PALETTE,
  type Flag,
  type Project,
  type Scene,
  type Storyline,
} from "./model";

type Selection = { type: "storyline" | "scene"; id: string } | null;
type Patch = (fn: (p: Project) => Project) => void;

export function StoryTab({
  project,
  patch,
  selection,
  setSelection,
  onOpenScene,
}: {
  project: Project;
  patch: Patch;
  selection: Selection;
  setSelection: (s: Selection) => void;
  onOpenScene: (id: string) => void;
}) {
  const [mode, setMode] = useState<"beat" | "time">("beat");
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<{ line: string; scene: string } | null>(null);
  const [sheet, setSheet] = useState<"scene" | "storyline" | null>(null);

  const scenes = useMemo(() => withDur(project), [project]);
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const GUT = 132;
  const PAD = 22;
  const W = 1000;
  const chartW = W - GUT - PAD;
  const geo = useMemo(() => geometry(scenes, mode, chartW, GUT), [scenes, mode, chartW]);
  const rowH = 46;
  const top = 34;
  const H = top + project.storylines.length * rowH + 46;
  const flags = useMemo(() => checkProject(project), [project]);

  useEffect(() => {
    if (!playing || total <= 0) return;
    const iv = setInterval(() => setT((x) => (x + 0.4 >= total ? 0 : x + 0.4)), 100);
    return () => clearInterval(iv);
  }, [playing, total]);

  if (!project.scenes.length) {
    return (
      <div className="rt-card">
        <div className="rt-head">
          <h2>Hilos narrativos</h2>
          <Info
            title="Hilos narrativos"
            text="Un hilo es una línea de la película — no un personaje. Tiene nombre, reparto y al menos dos escenas. El eje horizontal es el vídeo mismo."
          />
          <div className="rt-sp" />
          <button type="button" className="rt-btn" onClick={() => setSheet("scene")}>
            + Escena
          </button>
        </div>
        <div className="rt-body">
          <p className="rt-note" style={{ maxWidth: 520 }}>
            Vídeo vacío. Se construye en este orden: unas escenas, luego los personajes que están en ellas, luego un hilo trazado por
            al menos dos escenas. La línea de tiempo aparece en cuanto haya algo que tender sobre ella.
          </p>
        </div>
        {sheet === "scene" && <NewScene project={project} patch={patch} onClose={() => setSheet(null)} />}
      </div>
    );
  }

  const atX =
    mode === "time"
      ? GUT + (total ? t / total : 0) * chartW
      : (() => {
          const g = geo.find((s) => t >= s.start && t < s.end) || geo[geo.length - 1];
          return g.x + (g.dur ? (t - g.start) / g.dur : 0) * g.w;
        })();
  const nowScene = geo.find((s) => t >= s.start && t < s.end) || geo[0];

  const sl = selection?.type === "storyline" ? project.storylines.find((s) => s.id === selection.id) : null;
  const sc = selection?.type === "scene" ? project.scenes.find((s) => s.id === selection.id) : null;
  const laneY = (i: number) => top + i * rowH + rowH / 2;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rt-card">
        <div className="rt-head">
          <h2>Hilos narrativos</h2>
          <Info
            title="Hilos narrativos"
            text="Un hilo es una línea de la película — no un personaje. Tiene nombre, reparto y al menos dos escenas. El eje horizontal es el vídeo: cada marca es la escena donde ese hilo está activo en ese punto del metraje."
          />
          <p style={{ marginLeft: 8 }}>
            {project.storylines.length} hilos · {project.scenes.length} escenas · {tc(total)}
          </p>
          <div className="rt-sp" />
          <div className="rt-seg">
            <button type="button" data-on={mode === "beat" ? "1" : "0"} onClick={() => setMode("beat")}>
              Compases
            </button>
            <button type="button" data-on={mode === "time" ? "1" : "0"} onClick={() => setMode("time")}>
              Tiempo real
            </button>
          </div>
          <Info
            title="Dos lecturas"
            side="right"
            text="Compases da a cada escena el mismo ancho, así se lee la estructura — cómo se trenzan los hilos. Tiempo real escala cada escena a su duración y la marca se vuelve una barra, así se lee el ritmo: dónde gasta el minutaje la película."
          />
          <button type="button" className="rt-btn" onClick={() => setSheet("storyline")}>
            + Hilo
          </button>
          <button type="button" className="rt-btn" onClick={() => setSheet("scene")}>
            + Escena
          </button>
        </div>

        <div className="rt-body">
          <div className="rt-ribbon" style={{ marginBottom: 10 }}>
            {geo.map((g) => (
              <button
                type="button"
                key={g.id}
                className="rt-rb"
                data-on={selection?.id === g.id ? "1" : "0"}
                onClick={() => setSelection({ type: "scene", id: g.id })}
                style={{
                  flex: mode === "time" ? `${Math.max(g.dur, 1)} 0 0` : "1 0 0",
                  borderBottomColor: nowScene?.id === g.id ? "var(--grease)" : "var(--edge)",
                }}
              >
                <b>SC{String(g.index + 1).padStart(2, "0")}</b>
                <u>{g.title}</u>
                <u className="rt-mono" style={{ color: g.provisional ? "var(--amber)" : "var(--mute)" }}>
                  {tc(g.dur)}
                  {g.provisional ? "*" : ""}
                </u>
              </button>
            ))}
          </div>

          <div className="rt-chartwrap">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
              {geo.map((g) => (
                <g key={g.id}>
                  <rect x={g.x} y={14} width={g.w} height={H - 52} fill={selection?.id === g.id ? "#232C2D" : "transparent"} />
                  <line x1={g.x} y1={14} x2={g.x} y2={H - 38} stroke="#252D2E" strokeWidth="1" />
                </g>
              ))}
              <line x1={GUT} y1={H - 38} x2={W - PAD} y2={H - 38} stroke="#2C3435" />

              {mode === "time"
                ? Array.from({ length: Math.floor(total / 60) + 1 }, (_, i) => i * 60).map((sec) => (
                    <g key={sec}>
                      <line x1={GUT + (sec / (total || 1)) * chartW} y1={H - 38} x2={GUT + (sec / (total || 1)) * chartW} y2={H - 32} stroke="#4A5556" />
                      <text
                        x={GUT + (sec / (total || 1)) * chartW}
                        y={H - 20}
                        textAnchor="middle"
                        fill="#5C6766"
                        fontSize="9"
                        fontFamily="ui-monospace, monospace"
                      >
                        {tc(sec)}
                      </text>
                    </g>
                  ))
                : geo.map((g) => (
                    <text key={g.id} x={g.cx} y={H - 20} textAnchor="middle" fill="#5C6766" fontSize="9" fontFamily="ui-monospace, monospace">
                      SC{String(g.index + 1).padStart(2, "0")}
                    </text>
                  ))}

              {project.storylines.map((line, i) => {
                const y = laneY(i);
                const nodes = line.sceneIds
                  .map((id) => geo.find((g) => g.id === id))
                  .filter(Boolean)
                  .sort((a, b) => a!.index - b!.index) as typeof geo;
                const dim = selection?.type === "storyline" && selection.id !== line.id;
                return (
                  <g key={line.id} opacity={dim ? 0.22 : 1}>
                    <g className="rt-lane-lbl" onClick={() => setSelection({ type: "storyline", id: line.id })}>
                      <rect x="0" y={y - 17} width={GUT - 12} height="34" fill={selection?.id === line.id ? "#232C2D" : "transparent"} />
                      <rect x="0" y={y - 9} width="4" height="18" fill={line.color} />
                      <text x="12" y={y - 1} fill="#EDE9DF" fontSize="12" fontFamily="ui-sans-serif, system-ui" letterSpacing=".5">
                        {line.name.length > 16 ? line.name.slice(0, 15) + "…" : line.name}
                      </text>
                      <text x="12" y={y + 12} fill="#5C6766" fontSize="9" fontFamily="ui-monospace, monospace">
                        {line.cast.join("·")} · {line.sceneIds.length} esc
                      </text>
                    </g>

                    {nodes.map((g, k) => {
                      const prev = nodes[k - 1];
                      if (!prev) return null;
                      const gap = g.index - prev.index > 1;
                      const x1 = mode === "time" ? prev.x + prev.w : prev.cx;
                      const x2 = mode === "time" ? g.x : g.cx;
                      return (
                        <line
                          key={`c${k}`}
                          x1={x1}
                          y1={y}
                          x2={x2}
                          y2={y}
                          stroke={line.color}
                          strokeWidth={gap ? 1 : 2}
                          strokeDasharray={gap ? "3 5" : undefined}
                          opacity={gap ? 0.5 : 0.85}
                        />
                      );
                    })}

                    {nodes.map((g) => {
                      const present = line.cast.filter((cid) => g.cast.includes(cid));
                      const key = line.keys?.[g.id];
                      const active = nowScene?.id === g.id;
                      return (
                        <g
                          key={g.id}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={() => setHover({ line: line.id, scene: g.id })}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => setSelection({ type: "scene", id: g.id })}
                        >
                          {mode === "time" ? (
                            <rect
                              x={g.x + 1.5}
                              y={y - 8}
                              width={Math.max(g.w - 3, 4)}
                              height="16"
                              rx="2"
                              fill={line.color}
                              opacity={active ? 1 : 0.85}
                              stroke={active ? "#EDE9DF" : "none"}
                              strokeWidth="1"
                            />
                          ) : (
                            <circle cx={g.cx} cy={y} r={active ? 9.5 : 8} fill={line.color} stroke={active ? "#EDE9DF" : "none"} strokeWidth="1.4" />
                          )}
                          {present.map((cid, n) => {
                            const ch = project.characters.find((c) => c.id === cid);
                            const px = mode === "time" ? g.x + 7 + n * 9 : g.cx - (present.length - 1) * 4.5 + n * 9;
                            if (mode === "time" && g.w < present.length * 9 + 8) return null;
                            return <circle key={cid} cx={px} cy={y} r="2.6" fill="#14191A" opacity=".85" stroke={ch?.color} strokeWidth="1" />;
                          })}
                          {key && (
                            <path
                              transform={`translate(${g.cx},${y - 18}) scale(.62)`}
                              d="M0 -11 L3 -3.6 L11 -3.4 L4.6 1.6 L7 9.6 L0 4.8 L-7 9.6 L-4.6 1.6 L-11 -3.4 L-3 -3.6 Z"
                              fill="#14191A"
                              stroke="#E0A73C"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              <line x1={atX} y1={14} x2={atX} y2={H - 38} stroke="#E4472C" strokeWidth="1.2" opacity=".9" />
              <path d={`M${atX - 4} 14 L${atX + 4} 14 L${atX} 20 Z`} fill="#E4472C" />

              {hover &&
                (() => {
                  const g = geo.find((x) => x.id === hover.scene);
                  const line = project.storylines.find((x) => x.id === hover.line);
                  if (!g || !line) return null;
                  const present = line.cast.filter((c) => g.cast.includes(c));
                  const label = `${g.title} · ${tc(g.start)}–${tc(g.end)} · ${present.length ? present.join(" ") : "nadie de este hilo"}`;
                  const wBox = Math.min(label.length * 5.6 + 16, 340);
                  const bx = Math.min(Math.max(g.cx - wBox / 2, GUT), W - PAD - wBox);
                  const by = laneY(project.storylines.indexOf(line)) - 42;
                  return (
                    <g className="rt-tt">
                      <rect x={bx} y={by} width={wBox} height="24" fill="#0E1213" stroke={line.color} />
                      <text x={bx + 8} y={by + 16} fill="#C9C6BD" fontSize="10" fontFamily="ui-monospace, monospace">
                        {label}
                      </text>
                    </g>
                  );
                })()}
            </svg>
          </div>

          <div className="rt-row" style={{ marginTop: 10 }}>
            <button type="button" className="rt-btn" onClick={() => setPlaying((p) => !p)} style={{ width: 86 }}>
              {playing ? "❚❚ Pausa" : "▶ Reproducir"}
            </button>
            <input
              className="rt-scrub"
              type="range"
              min="0"
              max={Math.max(total - 1, 1)}
              step="0.5"
              value={t}
              onChange={(e) => setT(Number(e.target.value))}
              style={{ flex: 1, minWidth: 160 }}
              aria-label="Cabezal"
            />
            <span className="rt-mono" style={{ fontSize: 11, color: "var(--mute)" }}>
              {tc(t)} / {tc(total)} · {nowScene?.title}
            </span>
            <Info
              title="Cabezal"
              side="right"
              text="Recorre el metraje entero. La escena que quede bajo el cabezal se resalta en todas las líneas a la vez, que es como se caza un hilo que lleva cuatro minutos callado."
            />
          </div>
          {scenes.some((s) => s.provisional) && (
            <p className="rt-note" style={{ marginTop: 6 }}>
              <b style={{ color: "var(--amber)" }}>*</b> duración provisional: esa escena todavía no tiene ninguna toma buena, así que mide
              lo que mide su toma más larga.
            </p>
          )}
        </div>
      </div>

      {flags.length > 0 && (
        <div>
          {flags.slice(0, 4).map((f: Flag, i) => (
            <div className="rt-flag" data-kind={f.kind} key={i}>
              <b>{f.code}</b>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {sl && <StorylineEditor project={project} line={sl} patch={patch} onClose={() => setSelection(null)} />}
      {sc && <SceneEditor project={project} scene={sc} patch={patch} onClose={() => setSelection(null)} onOpenScene={onOpenScene} />}
      {!sl && !sc && (
        <p className="rt-note">
          Pulsa la etiqueta de una línea para editar el hilo, o una marca o un bloque de la cinta para editar la escena. Los puntitos
          dentro de una marca son los miembros de ese hilo que de verdad están en esa escena — un hilo puede atravesar una escena en la
          que sus protagonistas no entran.
        </p>
      )}

      {sheet === "storyline" && <NewStoryline project={project} patch={patch} onClose={() => setSheet(null)} />}
      {sheet === "scene" && <NewScene project={project} patch={patch} onClose={() => setSheet(null)} />}
    </div>
  );
}

/* ───────────────────────────── editores ───────────────────────────── */

function StorylineEditor({ project, line, patch, onClose }: { project: Project; line: Storyline; patch: Patch; onClose: () => void }) {
  const up = (u: Partial<Storyline>) => patch((p) => ({ ...p, storylines: p.storylines.map((s) => (s.id === line.id ? { ...s, ...u } : s)) }));
  return (
    <section className="rt-card">
      <div className="rt-head">
        <span style={{ width: 10, height: 10, background: line.color, display: "inline-block" }} />
        <h2>Hilo</h2>
        <Info
          title="Hilo"
          text="Nómbralo por lo que trata, no por quién sale. El reparto es de quién es el hilo; las escenas son dónde está activo. Mínimo dos — si no, es un compás dentro de otro hilo."
        />
        <div className="rt-sp" />
        <button
          type="button"
          className="rt-btn"
          onClick={() => {
            patch((p) => ({ ...p, storylines: p.storylines.filter((s) => s.id !== line.id) }));
            onClose();
          }}
        >
          Borrar
        </button>
        <button type="button" className="rt-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className="rt-body">
        <Field label="Nombre">
          <input className="rt-in" value={line.name} onChange={(e) => up({ name: e.target.value })} />
        </Field>
        <Field label="De qué va este hilo">
          <textarea className="rt-in" value={line.note} onChange={(e) => up({ note: e.target.value })} />
        </Field>
        <Field label="Color">
          <div className="rt-pick">
            {PALETTE.map((c) => (
              <button type="button" key={c} className="rt-sw" style={{ background: c }} data-on={line.color === c ? "1" : "0"} onClick={() => up({ color: c })} aria-label={c} />
            ))}
          </div>
        </Field>
        <Field label="Reparto del hilo" info="De quién es este hilo. No tienen que salir en todas sus escenas — un hilo puede seguir corriendo en su ausencia.">
          <Toggles
            items={project.characters.map((c) => ({ id: c.id, label: `${c.id} · ${c.name}`, color: c.color }))}
            value={line.cast}
            onChange={(v) => up({ cast: v })}
            colorKey
          />
        </Field>
        <Field label={`Escenas · ${line.sceneIds.length}`} info="Dónde está activo. Los huecos se dibujan con línea de puntos, que es exactamente como debe verse una subtrama que se calla.">
          <Toggles
            items={project.scenes.map((s, i) => ({ id: s.id, label: `SC${String(i + 1).padStart(2, "0")} ${s.title}`, color: line.color }))}
            value={line.sceneIds}
            onChange={(v) => up({ sceneIds: v })}
            colorKey
          />
          {line.sceneIds.length < 2 && <p className="rt-note" style={{ color: "var(--grease)", marginTop: 7 }}>Necesita al menos dos escenas.</p>}
        </Field>
        <Field label="Momento clave" info="Un giro por hilo, marcado con una estrella en la línea de tiempo. Elige la escena donde el hilo cambia de dirección.">
          <div className="rt-pick">
            {line.sceneIds.map((id) => {
              const s = project.scenes.find((x) => x.id === id);
              if (!s) return null;
              const on = !!line.keys?.[id];
              return (
                <button
                  type="button"
                  key={id}
                  className="rt-pk"
                  data-on={on ? "1" : "0"}
                  style={on ? { background: "var(--amber)", borderColor: "var(--amber)" } : undefined}
                  onClick={() => {
                    const keys = { ...(line.keys || {}) };
                    if (on) delete keys[id];
                    else keys[id] = `Giro en ${s.title}`;
                    up({ keys });
                  }}
                >
                  ★ {s.title}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </section>
  );
}

function SceneEditor({
  project,
  scene,
  patch,
  onClose,
  onOpenScene,
}: {
  project: Project;
  scene: Scene;
  patch: Patch;
  onClose: () => void;
  onOpenScene: (id: string) => void;
}) {
  const idx = project.scenes.findIndex((s) => s.id === scene.id);
  const takes = takesOfScene(project, scene.id);
  const L = sceneLength(takes);
  const up = (u: Partial<Scene>) => patch((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, ...u } : s)) }));
  const move = (d: number) =>
    patch((p) => {
      const arr = [...p.scenes];
      const j = idx + d;
      if (j < 0 || j >= arr.length) return p;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...p, scenes: arr };
    });
  const inLines = project.storylines.filter((sl) => sl.sceneIds.includes(scene.id)).map((s) => s.id);

  return (
    <section className="rt-card">
      <div className="rt-head">
        <h2>Escena {String(idx + 1).padStart(2, "0")}</h2>
        <Info
          title="Escena"
          text="Una escena ocupa un tramo del vídeo. Su duración YA NO se teclea: la suman sus tomas buenas. El reparto de aquí es quién está físicamente en ella; pertenecer a un hilo es otra cosa."
        />
        <div className="rt-sp" />
        <button type="button" className="rt-btn" onClick={() => move(-1)} disabled={idx === 0}>
          ← Antes
        </button>
        <button type="button" className="rt-btn" onClick={() => move(1)} disabled={idx === project.scenes.length - 1}>
          Después →
        </button>
        <button
          type="button"
          className="rt-btn"
          onClick={() => {
            patch((p) => ({
              ...p,
              scenes: p.scenes.filter((s) => s.id !== scene.id),
              storylines: p.storylines.map((sl) => ({ ...sl, sceneIds: sl.sceneIds.filter((i) => i !== scene.id) })),
              takes: p.takes.filter((t) => t.sceneId !== scene.id),
            }));
            onClose();
          }}
        >
          Borrar
        </button>
        <button type="button" className="rt-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className="rt-body">
        <div className="rt-row" style={{ alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: "1 1 190px" }}>
            <Field label="Título">
              <input className="rt-in" value={scene.title} onChange={(e) => up({ title: e.target.value })} />
            </Field>
          </div>
          <div style={{ flex: "0 0 92px" }}>
            <Field label="Int / Ext">
              <div className="rt-seg">
                {(["INT", "EXT"] as const).map((v) => (
                  <button type="button" key={v} data-on={scene.int === v ? "1" : "0"} onClick={() => up({ int: v })}>
                    {v}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <Field label="Localización">
              <input className="rt-in" value={scene.location} onChange={(e) => up({ location: e.target.value.toUpperCase() })} />
            </Field>
          </div>
          <div style={{ flex: "0 0 120px" }}>
            <Field label="Momento del día">
              <input className="rt-in" value={scene.tod} onChange={(e) => up({ tod: e.target.value.toUpperCase() })} />
            </Field>
          </div>
        </div>

        {/* nota 1: la duración se lee, no se teclea */}
        <Field
          label={`Duración · ${tc(L.seconds)}${L.provisional ? " (provisional)" : ""}`}
          info="Sale de las tomas: se suman las marcadas BUENA. Mientras no haya ninguna buena se enseña la toma más larga como estimación, y se dice. Para cambiarla, cambia la duración de una toma."
        >
          {takes.length === 0 ? (
            <p className="rt-note">
              Sin tomas todavía, así que esta escena no ocupa metraje.{" "}
              <button type="button" className="rt-btn" style={{ marginLeft: 6 }} onClick={() => onOpenScene(scene.id)}>
                Ir a la mesa de tomas
              </button>
            </p>
          ) : (
            <div>
              {takes.map((t) => (
                <div className="rt-line" key={t.id}>
                  <span className="rt-cue" style={{ color: t.status === "printed" ? "var(--ok)" : "var(--mute)" }}>
                    T{String(t.no).padStart(2, "0")}
                  </span>
                  <p>
                    {tc(t.dur)} · {t.status === "printed" ? "buena — suma" : t.status === "ng" ? "NG — no cuenta" : "no suma todavía"}
                  </p>
                </div>
              ))}
              <div className="rt-row" style={{ marginTop: 8 }}>
                <span className="rt-mono" style={{ fontSize: 11, color: L.provisional ? "var(--amber)" : "var(--ok)" }}>
                  {L.printed ? `${L.printed} toma(s) buena(s) = ${tc(L.seconds)}` : `estimación: ${tc(L.seconds)}`}
                </span>
                <button type="button" className="rt-btn rt-sp" onClick={() => onOpenScene(scene.id)}>
                  Cambiar en la mesa de tomas
                </button>
              </div>
            </div>
          )}
        </Field>

        <Field label="Sinopsis">
          <textarea className="rt-in" value={scene.synopsis} onChange={(e) => up({ synopsis: e.target.value })} />
        </Field>

        {/* nota 2: la voz en off también se ve desde aquí */}
        <Field label="Voz en off" info="Atraviesa las tomas: pertenece a la escena, no a un plano. Se edita igual aquí y en la mesa de tomas.">
          <VoiceOverEditor
            compact
            items={project.voiceovers[scene.id] ?? []}
            characters={project.characters}
            takes={takes}
            onChange={(v) => patch((p) => ({ ...p, voiceovers: { ...p.voiceovers, [scene.id]: v } }))}
          />
        </Field>

        <Field label="Quién está en la escena">
          <Toggles
            items={project.characters.map((c) => ({ id: c.id, label: `${c.id} · ${c.name}`, color: c.color }))}
            value={scene.cast}
            onChange={(v) => up({ cast: v })}
            colorKey
          />
        </Field>
        <Field label="Pertenece a los hilos" info="Una escena puede servir a más de un hilo — ese solapamiento suele ser donde la película se pone buena.">
          <Toggles
            items={project.storylines.map((s) => ({ id: s.id, label: s.name, color: s.color }))}
            value={inLines}
            colorKey
            onChange={(v) =>
              patch((p) => ({
                ...p,
                storylines: p.storylines.map((sl) => ({
                  ...sl,
                  sceneIds: v.includes(sl.id)
                    ? sl.sceneIds.includes(scene.id)
                      ? sl.sceneIds
                      : [...sl.sceneIds, scene.id]
                    : sl.sceneIds.filter((i) => i !== scene.id),
                })),
              }))
            }
          />
        </Field>
      </div>
    </section>
  );
}

function NewStoryline({ project, patch, onClose }: { project: Project; patch: Patch; onClose: () => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState(PALETTE[(project.storylines.length + 2) % PALETTE.length]);
  const [cast, setCast] = useState<string[]>([]);
  const [scenes, setScenes] = useState<string[]>([]);
  const ok = name.trim() && scenes.length >= 2;
  return (
    <Sheet
      title="Hilo nuevo"
      onClose={onClose}
      info="Una línea de la película con nombre, reparto y al menos dos escenas. Si solo tienes una escena para él, pertenece dentro de otro hilo."
      footer={
        <>
          <button
            type="button"
            className="rt-btn"
            data-tone="go"
            disabled={!ok}
            onClick={() => {
              patch((p) => ({ ...p, storylines: [...p.storylines, { id: uid("sl"), name: name.trim(), note, color, cast, sceneIds: scenes, keys: {} }] }));
              onClose();
            }}
          >
            Crear hilo
          </button>
          <button type="button" className="rt-btn" onClick={onClose}>
            Cancelar
          </button>
          {!ok && <span className="rt-note rt-sp">Hacen falta nombre y dos escenas</span>}
        </>
      }
    >
      <Field label="Nombre">
        <input className="rt-in" value={name} autoFocus placeholder="El libro de cuentas" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="De qué va este hilo">
        <textarea className="rt-in" value={note} placeholder="Una frase. ¿Qué cambia por culpa de este hilo?" onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Color">
        <div className="rt-pick">
          {PALETTE.map((c) => (
            <button type="button" key={c} className="rt-sw" style={{ background: c }} data-on={color === c ? "1" : "0"} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>
      </Field>
      <Field label="Reparto" info="De quién es el hilo. No hace falta que salgan en todas sus escenas.">
        <Toggles items={project.characters.map((c) => ({ id: c.id, label: `${c.id} · ${c.name}`, color: c.color }))} value={cast} onChange={setCast} colorKey />
      </Field>
      <Field label={`Escenas · ${scenes.length} elegidas`}>
        <Toggles
          items={project.scenes.map((s, i) => ({ id: s.id, label: `SC${String(i + 1).padStart(2, "0")} ${s.title}`, color }))}
          value={scenes}
          onChange={setScenes}
          colorKey
        />
      </Field>
    </Sheet>
  );
}

/** Nueva escena. El campo «duración» del prototipo se vuelve «duración de la
 *  primera toma» (nota 1): una escena sin tomas no mide, así que crearla ya con
 *  su primera toma es lo honesto y evita nacer en cero. */
export function NewScene({
  project,
  patch,
  onClose,
  onDone,
}: {
  project: Project;
  patch: Patch;
  onClose: () => void;
  onDone?: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [int, setInt] = useState<"INT" | "EXT">("INT");
  const [loc, setLoc] = useState("");
  const [tod, setTod] = useState("NOCHE");
  const [dur, setDur] = useState(45);
  const [cast, setCast] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [after, setAfter] = useState(project.scenes.length);
  const ok = title.trim();

  return (
    <Sheet
      title="Escena nueva"
      onClose={onClose}
      info="Las escenas son los bloques del vídeo. La posición dice dónde cae en el metraje; la duración ya no se fija aquí — nace con su primera toma y crece con ellas."
      footer={
        <>
          <button
            type="button"
            className="rt-btn"
            data-tone="go"
            disabled={!ok}
            onClick={() => {
              const id = uid("s");
              patch((p) => {
                const scenes = [...p.scenes];
                scenes.splice(after, 0, { id, title: title.trim(), int, location: loc.toUpperCase() || "LOCALIZACIÓN", tod, cast, synopsis: "" });
                return {
                  ...p,
                  scenes,
                  takes: [
                    ...p.takes,
                    { id: uid("tk"), sceneId: id, no: 1, status: "open", cast: cast.slice(0, 2), shot: "two", lens: "Tercera", direction: "", dur, params: null },
                  ],
                  storylines: p.storylines.map((sl) => (lines.includes(sl.id) ? { ...sl, sceneIds: [...sl.sceneIds, id] } : sl)),
                };
              });
              onDone?.(id);
              onClose();
            }}
          >
            Crear escena
          </button>
          <button type="button" className="rt-btn" onClick={onClose}>
            Cancelar
          </button>
        </>
      }
    >
      <Field label="Título">
        <input className="rt-in" autoFocus value={title} placeholder="Puertas retenidas" onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="rt-row" style={{ alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: "0 0 92px" }}>
          <Field label="Int / Ext">
            <div className="rt-seg">
              {(["INT", "EXT"] as const).map((v) => (
                <button type="button" key={v} data-on={int === v ? "1" : "0"} onClick={() => setInt(v)}>
                  {v}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div style={{ flex: "1 1 180px" }}>
          <Field label="Localización">
            <input className="rt-in" value={loc} placeholder="AUTOBÚS — PUERTAS" onChange={(e) => setLoc(e.target.value)} />
          </Field>
        </div>
        <div style={{ flex: "0 0 120px" }}>
          <Field label="Momento del día">
            <input className="rt-in" value={tod} onChange={(e) => setTod(e.target.value.toUpperCase())} />
          </Field>
        </div>
      </div>
      <Field label={`Duración de la primera toma · ${tc(dur)}`} info="La escena mide lo que suman sus tomas buenas. Esto crea la toma 1 con esa duración; a partir de ahí, la escena crece con las tomas.">
        <input type="range" className="rt-scrub" min="5" max="300" step="5" value={dur} onChange={(e) => setDur(Number(e.target.value))} />
      </Field>
      <Field label="Posición" info="Dónde cae en el vídeo. Todo lo que venga después se desplaza.">
        <select className="rt-in" value={after} onChange={(e) => setAfter(Number(e.target.value))}>
          <option value={0}>Antes de SC01</option>
          {project.scenes.map((s, i) => (
            <option key={s.id} value={i + 1}>
              Después de SC{String(i + 1).padStart(2, "0")} · {s.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quién está">
        <Toggles items={project.characters.map((c) => ({ id: c.id, label: `${c.id} · ${c.name}`, color: c.color }))} value={cast} onChange={setCast} colorKey />
      </Field>
      <Field label="Añadir a hilos">
        <Toggles items={project.storylines.map((s) => ({ id: s.id, label: s.name, color: s.color }))} value={lines} onChange={setLines} colorKey />
      </Field>
    </Sheet>
  );
}
