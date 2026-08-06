"use client";

// ── Personajes ───────────────────────────────────────────────────────────────
// La compañía. Un personaje existe UNA vez para todo el vídeo; las escenas, los
// hilos y las tomas lo referencian por su letra.
//
// Novedad de la V1 (nota 3): tres imágenes por personaje —perfil, cuerpo entero
// y detalle particular— y la de perfil viaja a todas partes donde antes había
// una figura dibujada: la fila de reparto, los chips de la toma y la columna de
// la escena. Es lo que convierte una letra en una cara.

import { useEffect, useState } from "react";
import { Field, Info, PicSlots, Portrait, Sheet, Spinner, Toggles } from "./parts";
import { seriesCharacters, type BorrowedCharacter } from "@/lib/coffeed/rtScriptorActions";
import { LETTERS, PALETTE, uid, type CharPics, type Character, type Project } from "./model";

type Patch = (fn: (p: Project) => Project) => void;

export function CastTab({
  project,
  patch,
  assets,
  onAsset,
  inSeries,
}: {
  project: Project;
  patch: Patch;
  assets: Record<string, string>;
  onAsset: (path: string, url: string) => void;
  inSeries: boolean;
}) {
  const [add, setAdd] = useState(false);
  const [borrow, setBorrow] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const ch = project.characters.find((c) => c.id === sel);

  /** Copia la ficha con una letra libre de ESTE vídeo. */
  const importCharacter = (c: Character) => {
    const used = project.characters.map((x) => x.id);
    const code = LETTERS.split("").find((l) => !used.includes(l)) || uid("c");
    patch((p) => ({ ...p, characters: [...p.characters, { ...c, id: code }] }));
  };

  const upChar = (id: string, u: Partial<Character>) =>
    patch((p) => ({ ...p, characters: p.characters.map((c) => (c.id === id ? { ...c, ...u } : c)) }));

  return (
    <section>
      <div className="rt-head rt-card" style={{ marginBottom: 12 }}>
        <h2>Personajes</h2>
        <Info
          title="Personajes"
          text="La compañía. Un personaje existe una vez para todo el vídeo; las escenas y los hilos lo referencian. Borrarlo lo saca de todas las escenas, tomas e hilos."
        />
        <p style={{ marginLeft: 8 }}>{project.characters.length} en la compañía</p>
        <div className="rt-sp" />
        {inSeries && (
          <button type="button" className="rt-btn" onClick={() => setBorrow(true)} title="Traer un personaje de otro vídeo de esta serie">
            Importar de la serie
          </button>
        )}
        <button type="button" className="rt-btn" onClick={() => setAdd(true)}>
          + Personaje
        </button>
      </div>

      {project.characters.length === 0 && (
        <p className="rt-note">Todavía no hay nadie. Un vídeo sin personajes puede tener escenas, pero no reparto que poner en ellas.</p>
      )}

      <div className="rt-cast">
        {project.characters.map((c) => {
          const scenes = project.scenes.filter((s) => s.cast.includes(c.id)).length;
          const threads = project.storylines.filter((s) => s.cast.includes(c.id));
          return (
            <button type="button" key={c.id} className="rt-castrow" onClick={() => setSel(sel === c.id ? null : c.id)} style={{ borderLeftColor: c.color }}>
              <div className="rt-port">
                <Portrait ch={c} assets={assets} h={72} />
              </div>
              <div className="rt-castmeta">
                <h3>{c.name}</h3>
                <p className="rt-role" style={{ color: c.color }}>
                  {c.id} · {c.role || "sin rol"}
                </p>
                <p>{c.bio}</p>
                <div className="rt-chips">
                  {c.traits.map((t) => (
                    <span key={t} className="rt-chip">
                      {t}
                    </span>
                  ))}
                  <span className="rt-chip" style={{ borderColor: c.color, color: c.color }}>
                    {scenes} escenas
                  </span>
                  {threads.map((t) => (
                    <span key={t.id} className="rt-chip" style={{ borderColor: t.color, color: t.color }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {ch && (
        <section className="rt-card" style={{ marginTop: 12 }}>
          <div className="rt-head">
            <h2>Editar · {ch.name}</h2>
            <div className="rt-sp" />
            <button
              type="button"
              className="rt-btn"
              onClick={() => {
                patch((p) => ({
                  ...p,
                  characters: p.characters.filter((c) => c.id !== ch.id),
                  scenes: p.scenes.map((s) => ({ ...s, cast: s.cast.filter((c) => c !== ch.id) })),
                  storylines: p.storylines.map((s) => ({ ...s, cast: s.cast.filter((c) => c !== ch.id) })),
                  takes: p.takes.map((t) => ({ ...t, cast: t.cast.filter((c) => c !== ch.id) })),
                }));
                setSel(null);
              }}
            >
              Borrar
            </button>
            <button type="button" className="rt-btn" onClick={() => setSel(null)}>
              Cerrar
            </button>
          </div>
          <div className="rt-body">
            <div className="rt-split">
              <div>
                <Field label="Nombre">
                  <input className="rt-in" value={ch.name} onChange={(e) => upChar(ch.id, { name: e.target.value })} />
                </Field>
                <Field label="Rol">
                  <input className="rt-in" value={ch.role} onChange={(e) => upChar(ch.id, { role: e.target.value })} />
                </Field>
                <Field label="Quién es">
                  <textarea className="rt-in" value={ch.bio} onChange={(e) => upChar(ch.id, { bio: e.target.value })} />
                </Field>
                <Field label="Rasgos" info="Separados por comas. Viajan como dirección en toda toma que siga abierta.">
                  <input
                    className="rt-in"
                    value={ch.traits.join(", ")}
                    onChange={(e) => upChar(ch.id, { traits: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  />
                </Field>
                <Field label="Color">
                  <div className="rt-pick">
                    {PALETTE.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className="rt-sw"
                        style={{ background: c }}
                        data-on={ch.color === c ? "1" : "0"}
                        onClick={() => upChar(ch.id, { color: c })}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Aparece en">
                  <Toggles
                    items={project.scenes.map((s, i) => ({ id: s.id, label: `SC${String(i + 1).padStart(2, "0")} ${s.title}`, color: ch.color }))}
                    value={project.scenes.filter((s) => s.cast.includes(ch.id)).map((s) => s.id)}
                    colorKey
                    onChange={(v) =>
                      patch((p) => ({
                        ...p,
                        scenes: p.scenes.map((s) => ({
                          ...s,
                          cast: v.includes(s.id) ? (s.cast.includes(ch.id) ? s.cast : [...s.cast, ch.id]) : s.cast.filter((c) => c !== ch.id),
                        })),
                      }))
                    }
                  />
                </Field>
              </div>

              <div>
                <Field
                  label="Imágenes"
                  info="Tres, y cada una hace un trabajo distinto: el PERFIL es la que viaja por toda la app; el CUERPO ENTERO fija silueta y vestuario; el DETALLE guarda esa cosa concreta —una mano, un objeto, una cicatriz— que hay que poder mirar sin abrir un plano."
                >
                  <PicSlots
                    pics={ch.pics}
                    owner={ch.id}
                    assets={assets}
                    onAsset={onAsset}
                    onChange={(pics: CharPics) => upChar(ch.id, { pics })}
                  />
                </Field>
                <p className="rt-note">Se suben al almacenamiento de la plataforma, no al documento del vídeo. Máximo 8 MB cada una.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {add && <NewCharacter project={project} patch={patch} onClose={() => setAdd(false)} />}
      {borrow && <BorrowSheet projectId={project.id} have={project.characters} onPick={importCharacter} onClose={() => setBorrow(false)} />}
    </section>
  );
}

/** Los personajes de los OTROS vídeos de la serie. Importar copia la ficha —
 *  no la enlaza: un personaje cambia entre episodios, y sincronizarlos sería
 *  una regla que nadie pidió y que se rompería el primer día. */
function BorrowSheet({
  projectId,
  have,
  onPick,
  onClose,
}: {
  projectId: string;
  have: Character[];
  onPick: (c: Character) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<BorrowedCharacter[] | null>(null);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [taken, setTaken] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    seriesCharacters(projectId).then((r) => {
      if (!alive) return;
      setList(r.list);
      setAssets(r.assets);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const names = new Set(have.map((c) => c.name.toLowerCase()));

  return (
    <Sheet
      title="Importar de la serie"
      onClose={onClose}
      info="La continuidad de reparto es lo que convierte una carpeta de vídeos en una serie: que sea la MISMA persona en los tres episodios. Se copia la ficha —nombre, rol, rasgos, color y fotos— y a partir de ahí este vídeo la lleva por su cuenta."
      footer={
        <>
          <button type="button" className="rt-btn" onClick={onClose}>
            Cerrar
          </button>
          {taken.length > 0 && <span className="rt-note rt-sp">{taken.length} importado(s)</span>}
        </>
      }
    >
      {list === null && <p className="rt-note"><Spinner label="Buscando en la serie" /></p>}
      {list !== null && list.length === 0 && (
        <p className="rt-note">Los otros vídeos de la serie no tienen personajes todavía — o este vídeo es el único del conjunto.</p>
      )}
      {(list ?? []).map((b, i) => {
        const already = names.has(b.character.name.toLowerCase()) || taken.includes(`${b.videoId}:${b.character.id}`);
        const url = b.character.pics?.profile ? assets[b.character.pics.profile] : null;
        return (
          <div key={`${b.videoId}-${b.character.id}-${i}`} className="rt-castrow" style={{ borderLeftColor: b.character.color, cursor: "default" }}>
            <div className="rt-port">{url ? <img src={url} alt={b.character.name} /> : <div style={{ height: 72 }} />}</div>
            <div className="rt-castmeta" style={{ flex: 1 }}>
              <h3>{b.character.name}</h3>
              <p className="rt-role" style={{ color: b.character.color }}>
                {b.character.role || "sin rol"} · de «{b.videoTitle}»
              </p>
              <p>{b.character.bio}</p>
              <button
                type="button"
                className="rt-btn"
                disabled={already}
                onClick={() => {
                  onPick(b.character);
                  setTaken((t) => [...t, `${b.videoId}:${b.character.id}`]);
                }}
              >
                {already ? "Ya está en este vídeo" : "Importar"}
              </button>
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}

function NewCharacter({ project, patch, onClose }: { project: Project; patch: Patch; onClose: () => void }) {
  const used = project.characters.map((c) => c.id);
  const code = LETTERS.split("").find((l) => !used.includes(l)) || uid("c");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [traits, setTraits] = useState("");
  const [color, setColor] = useState(PALETTE[project.characters.length % PALETTE.length]);
  const [scenes, setScenes] = useState<string[]>([]);

  return (
    <Sheet
      title="Personaje nuevo"
      onClose={onClose}
      info="Cada personaje lleva una letra que se usa donde no cabe el nombre: las marcas de la línea de tiempo, la tira de tomas, la hoja de reparto. Las fotos se añaden después, al editarlo."
      footer={
        <>
          <button
            type="button"
            className="rt-btn"
            data-tone="go"
            disabled={!name.trim()}
            onClick={() => {
              patch((p) => ({
                ...p,
                characters: [
                  ...p.characters,
                  {
                    id: code,
                    name: name.trim(),
                    role,
                    bio,
                    color,
                    traits: traits.split(",").map((t) => t.trim()).filter(Boolean),
                    pics: { profile: null, body: null, detail: null },
                  },
                ],
                scenes: p.scenes.map((s) => (scenes.includes(s.id) ? { ...s, cast: [...s.cast, code] } : s)),
              }));
              onClose();
            }}
          >
            Crear personaje
          </button>
          <button type="button" className="rt-btn" onClick={onClose}>
            Cancelar
          </button>
          <span className="rt-note rt-sp">Letra {code}</span>
        </>
      }
    >
      <Field label="Nombre">
        <input className="rt-in" autoFocus value={name} placeholder="Mara Vance" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Rol">
        <input className="rt-in" value={role} placeholder="Protagonista · auditora de turno de noche" onChange={(e) => setRole(e.target.value)} />
      </Field>
      <Field label="Quién es">
        <textarea className="rt-in" value={bio} onChange={(e) => setBio(e.target.value)} />
      </Field>
      <Field label="Rasgos" info="Separados por comas.">
        <input className="rt-in" value={traits} placeholder="reservada, insomne" onChange={(e) => setTraits(e.target.value)} />
      </Field>
      <Field label="Color">
        <div className="rt-pick">
          {PALETTE.map((c) => (
            <button type="button" key={c} className="rt-sw" style={{ background: c }} data-on={color === c ? "1" : "0"} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>
      </Field>
      <Field label="Aparece en">
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
