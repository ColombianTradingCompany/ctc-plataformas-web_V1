"use client";

// ── Guion y dirección ────────────────────────────────────────────────────────
// El mismo material de la línea de tiempo, en el formato que espera un actor o
// un técnico. En el prototipo esta pestaña era de SOLO LECTURA: se cambiaba una
// escena y la página seguía.
//
// La nota 4 del owner le da la vuelta: **el guion se edita, y lo editado se
// puede empujar de vuelta a los mandos.** Que es la parte interesante, porque
// escribir «cerrada sobre sus manos, cámara en mano» es más rápido y más
// natural que buscar dos mosaicos y un desplegable — pero la configuración
// tiene que enterarse.
//
// Cómo se resuelve el empujón, y por qué así:
//   · Nada se aplica solo. «Analizar y empujar» PROPONE; el usuario acepta una
//     a una. Un guion es de quien lo escribe, no del que lo interpreta.
//   · Dos motores, y se ven distintos: las REGLAS son deterministas, gratis y
//     explicables; la IA solo añade lo que una regla no ve. Cada propuesta dice
//     de cuál vino. El prototipo pensaba disfrazar de IA lo que era una lista
//     de palabras clave; aquí las dos cosas existen y se distinguen.
//   · Todo lo que devuelve el modelo se normaliza contra el vocabulario real
//     antes de llegar a la pantalla (ver `analyseScript`).

import { useMemo, useState } from "react";
import { Info, Sheet } from "./parts";
import { analyseScript } from "@/lib/coffeed/rtScriptorActions";
import {
  applyProposal,
  draftOfProject,
  camLabel,
  leadTake,
  uid,
  type DialogueLine,
  type Project,
  type Proposal,
  type SceneDraft,
} from "./model";

type Patch = (fn: (p: Project) => Project) => void;

export function ScriptTab({ project, patch }: { project: Project; patch: Patch }) {
  const [mode, setMode] = useState<"screenplay" | "shooting">("screenplay");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SceneDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const chOf = (id: string) => project.characters.find((c) => c.id === id);
  const scenes = project.scenes.filter((s) => filter === "all" || project.storylines.find((sl) => sl.id === filter)?.sceneIds.includes(s.id));
  const d = (id: string) => draft.find((x) => x.sceneId === id);
  const upDraft = (id: string, u: Partial<SceneDraft>) => setDraft((ds) => ds.map((x) => (x.sceneId === id ? { ...x, ...u } : x)));

  const plain = useMemo(
    () =>
      scenes
        .map((s) => {
          const t = leadTake(project, s.id);
          const head = `${s.int}. ${s.location} — ${s.tod}`;
          const vo = (project.voiceovers[s.id] ?? []).map((v) => `${(chOf(v.c ?? "")?.name ?? "NARRACIÓN").toUpperCase()} (V.O.)\n${v.text}`).join("\n\n");
          const dlg = (project.dialogue[t?.id ?? ""] || [])
            .map((x) => `${chOf(x.c)?.name.toUpperCase() ?? x.c}\n${x.line ?? x.dir ?? ""}`)
            .join("\n\n");
          return [head, s.synopsis, t?.direction, vo, dlg].filter(Boolean).join("\n\n");
        })
        .join("\n\n"),
    [scenes, project] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startEditing = () => {
    setDraft(draftOfProject(project));
    setEditing(true);
    setErr(null);
  };

  const analyse = async () => {
    setBusy(true);
    setErr(null);
    const r = await analyseScript({ projectId: project.id, draft });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setProposals(r.data);
    // Lo literal viene marcado; lo inferido, no. Un cambio que el usuario
    // escribió con sus manos no debería tener que volver a confirmarlo dos
    // veces — uno que se dedujo de su prosa, sí.
    setAccepted(new Set(r.data.filter((p) => p.confidence >= 1).map((p) => p.id)));
  };

  const applyAccepted = () => {
    const chosen = (proposals ?? []).filter((p) => accepted.has(p.id));
    if (chosen.length) patch((p) => chosen.reduce((acc, pr) => applyProposal(acc, pr.op), p));
    setProposals(null);
    setEditing(false);
  };

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <div className="rt-card">
        <div className="rt-head">
          <h2>Guion y dirección</h2>
          <Info
            title="Guion y dirección"
            text="El mismo material que construiste en la línea de tiempo, en el formato que espera un actor o un técnico. En modo lectura no se escribe nada aquí: cambia una escena, una toma buena o una línea de diálogo y esta página sigue. En modo edición se escribe encima y luego se empuja a los mandos."
          />
          <div className="rt-seg" style={{ marginLeft: 8 }}>
            <button type="button" data-on={mode === "screenplay" ? "1" : "0"} onClick={() => setMode("screenplay")}>
              Literario
            </button>
            <button type="button" data-on={mode === "shooting" ? "1" : "0"} onClick={() => setMode("shooting")}>
              Técnico
            </button>
          </div>
          <Info
            title="Dos formatos"
            text="El literario es la lectura limpia: encabezados, acción, diálogo. El técnico añade encima de la acción la línea de cámara de cada toma buena — tipo de plano, punto de vista y reparto."
          />
          <div className="rt-sp" />
          <select className="rt-in" style={{ width: "auto", padding: "6px 9px", fontSize: 12 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todos los hilos</option>
            {project.storylines.map((sl) => (
              <option key={sl.id} value={sl.id}>
                Solo: {sl.name}
              </option>
            ))}
          </select>
          {!editing ? (
            <>
              <button type="button" className="rt-btn" onClick={() => navigator.clipboard?.writeText(plain)}>
                Copiar texto
              </button>
              <button type="button" className="rt-btn" onClick={startEditing}>
                Editar guion
              </button>
            </>
          ) : (
            <>
              <button type="button" className="rt-btn" onClick={() => setEditing(false)}>
                Descartar
              </button>
              <button type="button" className="rt-btn" data-tone="go" disabled={busy} onClick={analyse}>
                {busy ? "Analizando…" : "Analizar y empujar"}
              </button>
              <Info
                title="Analizar y empujar"
                side="right"
                text="Compara lo que acabas de escribir con la configuración del vídeo y propone qué mandos deberían cambiar. Nada se aplica sin que lo marques. Las propuestas de REGLA salen de una lectura literal del texto; las de IA, de una pasada de Claude por encima para lo que una regla no ve."
              />
            </>
          )}
        </div>

        {editing && (
          <div className="rt-body" style={{ borderBottom: "1px solid var(--edge)" }}>
            <p className="rt-note">
              Estás escribiendo encima del guion. Los encabezados, la acción, la dirección, el diálogo y las voces en off son campos;
              lo demás sigue siendo la página. Cuando termines, «Analizar y empujar» traduce lo escrito a cambios de configuración —
              y tú decides cuáles entran.
            </p>
          </div>
        )}
        {err && (
          <div className="rt-body">
            <div className="rt-flag" data-kind="block">
              <b>no se pudo analizar</b>
              <span>{err}</span>
            </div>
          </div>
        )}

        <div className="rt-body" style={{ background: "#0F1314", padding: "22px 12px" }}>
          <div className="rt-page">
            <div className="rt-pgnum">
              {project.title.toUpperCase()} — {mode === "shooting" ? "GUION TÉCNICO" : "GUION LITERARIO"}
            </div>
            {scenes.map((s, i) => {
              const t = leadTake(project, s.id);
              const dr = d(s.id);
              const lines: DialogueLine[] = editing && dr ? dr.dialogue : project.dialogue[t?.id ?? ""] || [];
              const vo = editing && dr ? dr.vo : project.voiceovers[s.id] ?? [];
              const threads = project.storylines.filter((sl) => sl.sceneIds.includes(s.id));
              const n = project.scenes.findIndex((x) => x.id === s.id) + 1;

              return (
                <div key={s.id}>
                  <p className="rt-slug">
                    {threads.map((th, k) => (
                      <s key={th.id} style={{ background: th.color, top: 2 + k * 4, left: -30 - k * 7, height: 14 }} />
                    ))}
                    {String(n).padStart(2, "0")}.{" "}
                    {editing && dr ? (
                      <span style={{ display: "inline-flex", gap: 4 }}>
                        <input className="rt-ed" style={{ width: 52, display: "inline-block" }} value={dr.int} onChange={(e) => upDraft(s.id, { int: e.target.value.toUpperCase() === "EXT" ? "EXT" : "INT" })} />
                        <input className="rt-ed" style={{ width: 190, display: "inline-block" }} value={dr.location} onChange={(e) => upDraft(s.id, { location: e.target.value.toUpperCase() })} />
                        <input className="rt-ed" style={{ width: 96, display: "inline-block" }} value={dr.tod} onChange={(e) => upDraft(s.id, { tod: e.target.value.toUpperCase() })} />
                      </span>
                    ) : (
                      <>
                        {s.int}. {s.location} — {s.tod}
                      </>
                    )}
                  </p>

                  {mode === "shooting" && t && (
                    <p className="rt-anno">
                      Toma {t.no} · {camLabel(t)} · {t.cast.join(", ") || "sin reparto"}
                    </p>
                  )}

                  {editing && dr ? (
                    <textarea className="rt-ed" style={{ marginBottom: 12 }} value={dr.synopsis} onChange={(e) => upDraft(s.id, { synopsis: e.target.value })} />
                  ) : (
                    <p className="rt-act">{s.synopsis}</p>
                  )}

                  {mode === "shooting" &&
                    (editing && dr ? (
                      <textarea
                        className="rt-ed"
                        style={{ marginBottom: 12, color: "#4A4A44" }}
                        value={dr.direction}
                        placeholder="Dirección de la toma — escribe aquí y el empujón la traduce a mandos."
                        onChange={(e) => upDraft(s.id, { direction: e.target.value })}
                      />
                    ) : (
                      t?.direction && (
                        <p className="rt-act" style={{ color: "#4A4A44" }}>
                          {t.direction}
                        </p>
                      )
                    ))}

                  {/* voces en off: van antes del diálogo, como en un guion de verdad */}
                  {vo.map((v, k) =>
                    editing && dr ? (
                      <div key={v.id} style={{ marginBottom: 10 }}>
                        <p className="rt-chr">
                          {(chOf(v.c ?? "")?.name ?? "NARRACIÓN").toUpperCase()} (V.O.)
                        </p>
                        <textarea
                          className="rt-ed"
                          style={{ marginLeft: "22%", width: "60%" }}
                          value={v.text}
                          onChange={(e) => upDraft(s.id, { vo: dr.vo.map((x) => (x.id === v.id ? { ...x, text: e.target.value } : x)) })}
                        />
                      </div>
                    ) : (
                      <div key={v.id || k}>
                        <p className="rt-chr">{(chOf(v.c ?? "")?.name ?? "NARRACIÓN").toUpperCase()} (V.O.)</p>
                        <p className="rt-dlg">{v.text}</p>
                      </div>
                    )
                  )}

                  {lines.map((x, k) =>
                    editing && dr ? (
                      <div key={k} style={{ marginBottom: 10 }}>
                        <select
                          className="rt-ed"
                          style={{ marginLeft: "38%", width: "40%" }}
                          value={x.c}
                          onChange={(e) => upDraft(s.id, { dialogue: dr.dialogue.map((y, j) => (j === k ? { ...y, c: e.target.value } : y)) })}
                        >
                          {project.characters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className="rt-ed"
                          style={{ marginLeft: "22%", width: "60%" }}
                          value={x.line ?? x.dir ?? ""}
                          placeholder="Marca (V.O.) al principio para convertirla en voz en off."
                          onChange={(e) => upDraft(s.id, { dialogue: dr.dialogue.map((y, j) => (j === k ? { ...y, line: e.target.value, dir: undefined } : y)) })}
                        />
                        <button
                          type="button"
                          className="rt-btn"
                          style={{ marginLeft: "22%", marginTop: 4, padding: "3px 8px" }}
                          onClick={() => upDraft(s.id, { dialogue: dr.dialogue.filter((_, j) => j !== k) })}
                        >
                          Quitar línea
                        </button>
                      </div>
                    ) : (
                      <div key={k}>
                        <p className="rt-chr">{chOf(x.c)?.name ?? x.c}</p>
                        {x.dir && <p className="rt-par">{x.dir}</p>}
                        {x.line && <p className="rt-dlg">{x.line}</p>}
                      </div>
                    )
                  )}

                  {editing && dr && (
                    <p style={{ marginLeft: "22%" }}>
                      <button
                        type="button"
                        className="rt-btn"
                        onClick={() =>
                          upDraft(s.id, {
                            dialogue: [...dr.dialogue, { c: project.characters[0]?.id ?? "A", line: "" }],
                          })
                        }
                        disabled={!project.characters.length}
                      >
                        + Línea
                      </button>
                      <button
                        type="button"
                        className="rt-btn"
                        style={{ marginLeft: 6 }}
                        onClick={() => upDraft(s.id, { vo: [...dr.vo, { id: uid("vo"), c: null, text: "", anchor: null }] })}
                      >
                        + Voz en off
                      </button>
                    </p>
                  )}

                  {i === scenes.length - 1 && <p className="rt-tr">Fundido a negro.</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="rt-note">
        Las barras de color del margen izquierdo son los hilos a los que sirve cada escena. Una página con un solo color corriendo por
        el lateral es una película que ha dejado de cortar entre hilos — a veces es a propósito, casi siempre merece una mirada.
      </p>

      {proposals && (
        <Sheet
          wide
          title={`Propuestas · ${proposals.length}`}
          onClose={() => setProposals(null)}
          info="Cada línea es un cambio de configuración deducido de lo que escribiste. Marca las que quieras y aplícalas. Las de REGLA salen de una lectura literal; las de IA, de una pasada del modelo — y esa distinción está a la vista a propósito."
          footer={
            <>
              <button type="button" className="rt-btn" data-tone="go" disabled={!accepted.size} onClick={applyAccepted}>
                Aplicar {accepted.size} cambio(s)
              </button>
              <button type="button" className="rt-btn" onClick={() => setProposals(null)}>
                Cancelar
              </button>
              <span className="rt-note rt-sp">
                {proposals.filter((p) => p.source === "regla").length} de regla · {proposals.filter((p) => p.source === "ia").length} de IA
              </span>
            </>
          }
        >
          {proposals.length === 0 && (
            <p className="rt-note">
              Nada que empujar: lo que escribiste no cambia ninguna configuración. Si esperabas otra cosa, di en la dirección lo que
              quieres con palabras de cámara — «cámara en mano», «primer plano», «35mm», «sostener dos tiempos».
            </p>
          )}
          {proposals.map((p) => {
            const on = accepted.has(p.id);
            return (
              <label className="rt-prop" data-src={p.source} key={p.id} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setAccepted((s) => {
                      const next = new Set(s);
                      if (on) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    })
                  }
                />
                <span style={{ minWidth: 0 }}>
                  <b>{p.label}</b>
                  <small>
                    {p.from || "—"} → {p.to || "—"}
                  </small>
                </span>
                <em>
                  {p.source} · {Math.round(p.confidence * 100)}%
                </em>
              </label>
            );
          })}
        </Sheet>
      )}
    </div>
  );
}
