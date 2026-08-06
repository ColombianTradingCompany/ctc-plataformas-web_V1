"use client";

// ── Escenarios y Props ───────────────────────────────────────────────────────
// Las dos pestañas que faltaban, al mismo nivel que Personajes — y por la misma
// razón que existe Personajes: son cosas del VÍDEO que las escenas referencian,
// no texto suelto dentro de cada escena.
//
// Un ESCENARIO no es una etiqueta de sitio: es el ESPACIO. Lleva el encabezado
// del guion, sí, pero sobre todo lleva el decorado —qué objetos hay y dónde—,
// que es lo que hace que el cuadro de la mesa de tomas deje de estar en el
// vacío. Se viste una vez y todas las escenas que pasan ahí lo heredan.
//
// Un PROP existe una vez y se usa donde haga falta: puede ser DE alguien (viaja
// con él a cualquier escena en la que salga) y/o estar PUESTO en un escenario.
// Las dos cosas a la vez, que es lo normal — la taza es de Mara Y está sobre la
// mesa de la bodega.
//
// Los dos se importan de otro vídeo de la misma serie, igual que los
// personajes, y se COPIAN, no se enlazan: un decorado cambia entre episodios.

import { useEffect, useState } from "react";
import { Field, Info, Sheet, Spinner } from "./parts";
import { StageView } from "./StageView";
import { seriesSets, type BorrowedEscenario, type BorrowedProp } from "@/lib/coffeed/rtScriptorActions";
import {
  uid,
  CAMERA_DEFAULT,
  PALETTE,
  applyShot,
  type Escenario,
  type Project,
  type Prop,
} from "./model";

type Patch = (fn: (p: Project) => Project) => void;

/** La vista de planta con la que se viste un decorado: la misma máquina de
 *  composición, con la cámara puesta arriba. No es otro dibujo — es el mismo. */
function PlanView({ project, esc, selected, onSelect }: { project: Project; esc: Escenario; selected: string | null; onSelect: (id: string) => void }) {
  const pal = esc.palette.length >= 3 ? esc.palette : ["#141A1B", "#1B2A33", "#C9C6BD"];
  return (
    <StageView
      showGuides={false}
      selected={selected}
      onSelect={onSelect}
      input={{
        cam: { ...applyShot(CAMERA_DEFAULT, "cenital"), dist: 260, height: 700 },
        treatment: "normal",
        actors: [],
        props: esc.props
          .map((pl) => {
            const p = project.props.find((x) => x.id === pl.propId);
            return p ? { id: p.id, label: p.name, x: pl.x, z: pl.z, w: p.w, h: p.h, d: p.d, color: p.color } : null;
          })
          .filter(Boolean) as { id: string; label: string; x: number; z: number; w: number; h: number; d: number; color: string }[],
        palette: { ground: pal[0], sky: pal[1], ink: pal[2] },
        aspect: "16:9",
        width: 720,
      }}
    />
  );
}

/* ═════════════════════════════ ESCENARIOS ═════════════════════════════ */

export function EscenariosTab({ project, patch, inSeries }: { project: Project; patch: Patch; inSeries: boolean }) {
  const [sel, setSel] = useState<string | null>(project.escenarios[0]?.id ?? null);
  const [borrow, setBorrow] = useState(false);
  const [pickedProp, setPickedProp] = useState<string | null>(null);
  const esc = project.escenarios.find((e) => e.id === sel);

  const up = (id: string, u: Partial<Escenario>) => patch((p) => ({ ...p, escenarios: p.escenarios.map((e) => (e.id === id ? { ...e, ...u } : e)) }));

  const create = () => {
    const id = uid("esc");
    patch((p) => ({
      ...p,
      escenarios: [...p.escenarios, { id, name: "Escenario nuevo", int: "INT", location: "LOCALIZACIÓN", tod: "", note: "", palette: [], props: [] }],
    }));
    setSel(id);
  };

  const placed = esc?.props.find((pl) => pl.propId === pickedProp);

  return (
    <section style={{ display: "grid", gap: 13 }}>
      <div className="rt-head rt-card">
        <h2>Escenarios</h2>
        <Info
          title="Escenarios"
          text="Un escenario es el SITIO donde pasan escenas — y sobre todo, es el espacio: lleva el decorado, con sus objetos y sus medidas. Es lo que hace que el cuadro de la mesa de tomas deje de estar en un vacío. Una escena elige uno y hereda su encabezado; el momento del día sigue siendo de la escena, porque la misma bodega es otra cosa de noche."
        />
        <p style={{ marginLeft: 8 }}>{project.escenarios.length} en el vídeo</p>
        <div className="rt-sp" />
        {inSeries && (
          <button type="button" className="rt-btn" onClick={() => setBorrow(true)}>
            Importar de la serie
          </button>
        )}
        <button type="button" className="rt-btn" onClick={create}>
          + Escenario
        </button>
      </div>

      {project.escenarios.length === 0 && (
        <p className="rt-note">
          Sin escenarios. Las escenas siguen funcionando con su localización escrita a mano, pero el cuadro no tendrá nada alrededor:
          un escenario es lo que pone suelo, paleta y objetos dentro del plano.
        </p>
      )}

      {project.escenarios.length > 0 && (
        <div className="rt-shots">
          {project.escenarios.map((e) => {
            const uses = project.scenes.filter((s) => s.escenarioId === e.id).length;
            return (
              <button type="button" key={e.id} className="rt-shot" data-on={sel === e.id ? "1" : "0"} onClick={() => setSel(e.id)}>
                {e.int}. {e.name} {uses > 0 && <em style={{ fontStyle: "normal", opacity: 0.6 }}>· {uses}</em>}
              </button>
            );
          })}
        </div>
      )}

      {esc && (
        <div className="rt-stagewrap">
          <section>
            <p className="rt-label">
              Planta del decorado
              <Info title="Planta" text="El escenario visto desde arriba, con la MISMA máquina que compone la toma. Pulsa un objeto para elegirlo y muévelo con los mandos de al lado. Lo que coloques aquí aparece en toda escena que pase en este escenario." />
              <span>{esc.props.length} objetos</span>
            </p>
            <PlanView project={project} esc={esc} selected={pickedProp} onSelect={(id) => setPickedProp(id === pickedProp ? null : id)} />
            {placed && (
              <div className="rt-markbox">
                <p className="rt-label" style={{ marginTop: 0 }}>
                  {project.props.find((x) => x.id === placed.propId)?.name}
                  <span>
                    x {Math.round(placed.x)} · z {Math.round(placed.z)}
                  </span>
                </p>
                {(["x", "z"] as const).map((k) => (
                  <div className="rt-dial" key={k}>
                    <label>
                      {k === "x" ? "Lateral" : "Profundidad"}
                      <b>{Math.round(placed[k])}cm</b>
                    </label>
                    <input
                      type="range"
                      min={-500}
                      max={500}
                      step={5}
                      value={placed[k]}
                      onChange={(ev) => up(esc.id, { props: esc.props.map((pl) => (pl.propId === placed.propId ? { ...pl, [k]: Number(ev.target.value) } : pl)) })}
                    />
                  </div>
                ))}
                <button type="button" className="rt-btn" onClick={() => up(esc.id, { props: esc.props.filter((pl) => pl.propId !== placed.propId) })}>
                  Quitar del decorado
                </button>
              </div>
            )}
          </section>

          <section className="rt-rig">
            <Field label="Nombre">
              <input className="rt-in" value={esc.name} onChange={(e) => up(esc.id, { name: e.target.value })} />
            </Field>
            <div className="rt-row" style={{ alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: "0 0 88px" }}>
                <Field label="Int / Ext">
                  <div className="rt-seg">
                    {(["INT", "EXT"] as const).map((v) => (
                      <button type="button" key={v} data-on={esc.int === v ? "1" : "0"} onClick={() => up(esc.id, { int: v })}>
                        {v}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <Field label="Encabezado" info="Lo que se lee en el guion. En mayúsculas, como manda el formato.">
                  <input className="rt-in" value={esc.location} onChange={(e) => up(esc.id, { location: e.target.value.toUpperCase() })} />
                </Field>
              </div>
            </div>
            <Field label="Momento del día por defecto" info="Una propuesta: cada escena puede pisarlo, porque la misma bodega es otra cosa de noche.">
              <input className="rt-in" value={esc.tod} placeholder="DÍA" onChange={(e) => up(esc.id, { tod: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Qué es este sitio">
              <textarea className="rt-in" value={esc.note} onChange={(e) => up(esc.id, { note: e.target.value })} />
            </Field>
            <Field label="Paleta" info="Tres colores: suelo, fondo y tinta. Si la dejas vacía manda la baraja de estilo del vídeo.">
              <div className="rt-row">
                {esc.palette.map((c, i) => (
                  <button type="button" key={`${c}${i}`} className="rt-sw" style={{ background: c, width: 30, height: 24 }} title={`${c} — quitar`} onClick={() => up(esc.id, { palette: esc.palette.filter((_, k) => k !== i) })} />
                ))}
                {esc.palette.length < 3 &&
                  PALETTE.concat(["#141A1B", "#1B2A33", "#C9C6BD", "#6E5230"]).slice(0, 8).map((c) => (
                    <button type="button" key={c} className="rt-sw" style={{ background: c, width: 30, height: 24, opacity: 0.45 }} title={`añadir ${c}`} onClick={() => up(esc.id, { palette: [...esc.palette, c] })} />
                  ))}
              </div>
            </Field>

            <p className="rt-label" style={{ marginTop: 12 }}>
              Poner objetos <span>{project.props.length} en el vídeo</span>
            </p>
            {project.props.length === 0 && <p className="rt-note">Todavía no hay objetos. Se crean en la pestaña Props.</p>}
            <div className="rt-shots">
              {project.props.map((p) => {
                const on = esc.props.some((pl) => pl.propId === p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    className="rt-shot"
                    data-on={on ? "1" : "0"}
                    onClick={() => {
                      up(esc.id, { props: on ? esc.props.filter((pl) => pl.propId !== p.id) : [...esc.props, { propId: p.id, x: 0, z: 120 }] });
                      setPickedProp(p.id);
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            <p className="rt-note" style={{ marginTop: 12 }}>
              Lo usan {project.scenes.filter((s) => s.escenarioId === esc.id).length} escena(s).
            </p>
            <button
              type="button"
              className="rt-btn"
              style={{ marginTop: 8 }}
              onClick={() => {
                if (!confirm(`¿Borrar «${esc.name}»? Las escenas que lo usaban se quedan con su localización escrita.`)) return;
                patch((p) => ({
                  ...p,
                  escenarios: p.escenarios.filter((e) => e.id !== esc.id),
                  scenes: p.scenes.map((s) => (s.escenarioId === esc.id ? { ...s, escenarioId: null, int: esc.int, location: esc.location } : s)),
                }));
                setSel(null);
              }}
            >
              Borrar escenario
            </button>
          </section>
        </div>
      )}

      {borrow && <BorrowSets project={project} patch={patch} kind="escenario" onClose={() => setBorrow(false)} />}
    </section>
  );
}

/* ═══════════════════════════════ PROPS ═══════════════════════════════ */

export function PropsTab({ project, patch, inSeries }: { project: Project; patch: Patch; inSeries: boolean }) {
  const [sel, setSel] = useState<string | null>(project.props[0]?.id ?? null);
  const [borrow, setBorrow] = useState(false);
  const prop = project.props.find((p) => p.id === sel);

  const up = (id: string, u: Partial<Prop>) => patch((p) => ({ ...p, props: p.props.map((x) => (x.id === id ? { ...x, ...u } : x)) }));

  const create = () => {
    const id = uid("prop");
    patch((p) => ({ ...p, props: [...p.props, { id, name: "Objeto nuevo", note: "", color: PALETTE[p.props.length % PALETTE.length], w: 40, h: 40, d: 40, ownerId: null }] }));
    setSel(id);
  };

  return (
    <section style={{ display: "grid", gap: 13 }}>
      <div className="rt-head rt-card">
        <h2>Props</h2>
        <Info
          title="Props"
          text="Un objeto existe UNA vez en el vídeo y se usa donde haga falta. Puede ser DE un personaje —y entonces viaja con él a cualquier escena en la que salga, sin colocarlo dos veces— y/o estar PUESTO en un escenario, que es el decorado fijo. Las dos cosas a la vez es lo normal: la taza es de Mara y está sobre la mesa de la bodega."
        />
        <p style={{ marginLeft: 8 }}>{project.props.length} en el vídeo</p>
        <div className="rt-sp" />
        {inSeries && (
          <button type="button" className="rt-btn" onClick={() => setBorrow(true)}>
            Importar de la serie
          </button>
        )}
        <button type="button" className="rt-btn" onClick={create}>
          + Prop
        </button>
      </div>

      {project.props.length === 0 && (
        <p className="rt-note">Sin objetos. Un prop ocupa sitio de verdad en el cuadro — es lo que hace que una mesa tape a quien está detrás.</p>
      )}

      {project.props.length > 0 && (
        <div className="rt-shots">
          {project.props.map((p) => (
            <button type="button" key={p.id} className="rt-shot" data-on={sel === p.id ? "1" : "0"} onClick={() => setSel(p.id)} style={sel === p.id ? undefined : { borderLeftColor: p.color, borderLeftWidth: 3 }}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {prop && (
        <div className="rt-card">
          <div className="rt-body">
            <div className="rt-split">
              <div>
                <Field label="Nombre">
                  <input className="rt-in" value={prop.name} onChange={(e) => up(prop.id, { name: e.target.value })} />
                </Field>
                <Field label="Qué es">
                  <textarea className="rt-in" value={prop.note} onChange={(e) => up(prop.id, { note: e.target.value })} />
                </Field>
                <Field label="De quién es" info="Si es de alguien, viaja con esa persona: aparece en toda escena en la que salga, sin tener que colocarlo escenario por escenario.">
                  <select className="rt-in" value={prop.ownerId ?? ""} onChange={(e) => up(prop.id, { ownerId: e.target.value || null })}>
                    <option value="">De nadie — es del decorado</option>
                    {project.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} · {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Color">
                  <div className="rt-pick">
                    {PALETTE.map((c) => (
                      <button type="button" key={c} className="rt-sw" style={{ background: c }} data-on={prop.color === c ? "1" : "0"} onClick={() => up(prop.id, { color: c })} aria-label={c} />
                    ))}
                  </div>
                </Field>
              </div>

              <div>
                <p className="rt-label">
                  Medidas
                  <Info title="Medidas" text="En centímetros, y son de verdad: se dibujan a escala en el cuadro. Una mesa de 75 cm de alto tapa lo que hay detrás, y eso se ve antes de rodar." />
                </p>
                {(
                  [
                    { k: "w" as const, label: "Ancho" },
                    { k: "h" as const, label: "Alto" },
                    { k: "d" as const, label: "Fondo" },
                  ]
                ).map((m) => (
                  <div className="rt-dial" key={m.k}>
                    <label>
                      {m.label}
                      <b>{prop[m.k]}cm</b>
                    </label>
                    <input type="range" min={5} max={400} step={5} value={prop[m.k]} onChange={(e) => up(prop.id, { [m.k]: Number(e.target.value) })} />
                  </div>
                ))}

                <p className="rt-label" style={{ marginTop: 12 }}>
                  Está puesto en <span>{project.escenarios.filter((e) => e.props.some((pl) => pl.propId === prop.id)).length}</span>
                </p>
                <div className="rt-shots">
                  {project.escenarios.map((e) => {
                    const on = e.props.some((pl) => pl.propId === prop.id);
                    return (
                      <button
                        type="button"
                        key={e.id}
                        className="rt-shot"
                        data-on={on ? "1" : "0"}
                        onClick={() =>
                          patch((p) => ({
                            ...p,
                            escenarios: p.escenarios.map((x) =>
                              x.id !== e.id ? x : { ...x, props: on ? x.props.filter((pl) => pl.propId !== prop.id) : [...x.props, { propId: prop.id, x: 0, z: 120 }] }
                            ),
                          }))
                        }
                      >
                        {e.name}
                      </button>
                    );
                  })}
                  {project.escenarios.length === 0 && <span className="rt-note">Todavía no hay escenarios.</span>}
                </div>

                <button
                  type="button"
                  className="rt-btn"
                  style={{ marginTop: 14 }}
                  onClick={() => {
                    if (!confirm(`¿Borrar «${prop.name}»? Sale de todos los escenarios donde estaba.`)) return;
                    patch((p) => ({
                      ...p,
                      props: p.props.filter((x) => x.id !== prop.id),
                      escenarios: p.escenarios.map((e) => ({ ...e, props: e.props.filter((pl) => pl.propId !== prop.id) })),
                    }));
                    setSel(null);
                  }}
                >
                  Borrar objeto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {borrow && <BorrowSets project={project} patch={patch} kind="prop" onClose={() => setBorrow(false)} />}
    </section>
  );
}

/* ══════════════════════ importar de la serie ══════════════════════ */

function BorrowSets({ project, patch, kind, onClose }: { project: Project; patch: Patch; kind: "escenario" | "prop"; onClose: () => void }) {
  const [data, setData] = useState<{ escenarios: BorrowedEscenario[]; props: BorrowedProp[] } | null>(null);
  const [taken, setTaken] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    seriesSets(project.id).then((r) => alive && setData(r));
    return () => {
      alive = false;
    };
  }, [project.id]);

  /** Un escenario viaja CON sus objetos, y los que ya existan por nombre se
   *  reutilizan en vez de duplicarse. */
  const importEscenario = (b: BorrowedEscenario) => {
    patch((p) => {
      const map: Record<string, string> = {};
      const newProps: Prop[] = [];
      for (const src of b.props) {
        const mine = p.props.find((x) => x.name.toLowerCase() === src.name.toLowerCase());
        if (mine) {
          map[src.id] = mine.id;
        } else {
          const id = uid("prop");
          map[src.id] = id;
          newProps.push({ ...src, id, ownerId: null });
        }
      }
      const id = uid("esc");
      return {
        ...p,
        props: [...p.props, ...newProps],
        escenarios: [...p.escenarios, { ...b.escenario, id, props: b.escenario.props.filter((pl) => map[pl.propId]).map((pl) => ({ ...pl, propId: map[pl.propId] })) }],
      };
    });
    setTaken((t) => [...t, b.escenario.id]);
  };

  const importProp = (b: BorrowedProp) => {
    // El dueño NO viaja: las letras de personaje son de cada vídeo y apuntar a
    // una de otro sería una referencia rota con buena pinta.
    patch((p) => ({ ...p, props: [...p.props, { ...b.prop, id: uid("prop"), ownerId: null }] }));
    setTaken((t) => [...t, b.prop.id]);
  };

  const list = kind === "escenario" ? (data?.escenarios ?? []) : (data?.props ?? []);
  const mine = new Set((kind === "escenario" ? project.escenarios : project.props).map((x) => x.name.toLowerCase()));

  return (
    <Sheet
      wide
      title={kind === "escenario" ? "Importar escenarios" : "Importar objetos"}
      onClose={onClose}
      info="De los otros vídeos de esta serie. Se copian, no se enlazan: un decorado cambia entre episodios y sincronizarlos sería una regla que nadie pidió. Un escenario se trae con los objetos que tiene puestos; los que ya tengas con el mismo nombre se reutilizan en vez de duplicarse."
      footer={
        <>
          <button type="button" className="rt-btn" onClick={onClose}>
            Cerrar
          </button>
          {taken.length > 0 && <span className="rt-note rt-sp">{taken.length} importado(s)</span>}
        </>
      }
    >
      {data === null && (
        <p className="rt-note">
          <Spinner label="Buscando en la serie" />
        </p>
      )}
      {data !== null && list.length === 0 && <p className="rt-note">Los otros vídeos de la serie no tienen nada de esto todavía.</p>}

      {kind === "escenario" &&
        (data?.escenarios ?? []).map((b, i) => {
          const already = mine.has(b.escenario.name.toLowerCase()) || taken.includes(b.escenario.id);
          return (
            <div key={`${b.videoId}-${b.escenario.id}-${i}`} className="rt-prop" data-src="regla" style={{ alignItems: "center" }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <b>
                  {b.escenario.int}. {b.escenario.name}
                </b>
                <small>
                  {b.escenario.location} · {b.props.length} objeto(s) · de «{b.videoTitle}»
                </small>
              </span>
              <button type="button" className="rt-btn" disabled={already} onClick={() => importEscenario(b)}>
                {already ? "Ya está" : "Importar"}
              </button>
            </div>
          );
        })}

      {kind === "prop" &&
        (data?.props ?? []).map((b, i) => {
          const already = mine.has(b.prop.name.toLowerCase()) || taken.includes(b.prop.id);
          return (
            <div key={`${b.videoId}-${b.prop.id}-${i}`} className="rt-prop" data-src="regla" style={{ alignItems: "center" }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <b>{b.prop.name}</b>
                <small>
                  {b.prop.w}×{b.prop.h}×{b.prop.d} cm · de «{b.videoTitle}»
                </small>
              </span>
              <button type="button" className="rt-btn" disabled={already} onClick={() => importProp(b)}>
                {already ? "Ya está" : "Importar"}
              </button>
            </div>
          );
        })}
    </Sheet>
  );
}
