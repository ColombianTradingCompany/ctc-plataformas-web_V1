"use client";

// ── Voz en off · nota 2 del owner ────────────────────────────────────────────
// «Las escenas pueden tener voces en off transversales a las tomas.»
//
// De ahí sale toda la forma del modelo: la voz en off NO cuelga de una toma
// —que es un intento de un plano— sino de la ESCENA, y opcionalmente se ancla a
// una toma para decir por dónde entra. Una voz sin ancla corre por encima de la
// escena entera, que es lo que hace una voz en off cuando de verdad lo es.
//
// El mismo editor se usa en dos sitios (la ficha de escena y la mesa de tomas)
// porque el owner pidió verlo en los dos; es un componente, no dos copias.

import { uid, type Character, type VoiceOver, type Take } from "./model";

export function VoiceOverEditor({
  items,
  characters,
  takes,
  onChange,
  compact,
}: {
  items: VoiceOver[];
  characters: Character[];
  takes: Take[];
  onChange: (v: VoiceOver[]) => void;
  compact?: boolean;
}) {
  const up = (id: string, patch: Partial<VoiceOver>) => onChange(items.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  return (
    <div>
      {items.length === 0 && (
        <p className="rt-note" style={{ marginBottom: 8 }}>
          Sin voz en off. Una escena no la necesita — pero cuando la lleva, no pertenece a ninguna toma en concreto.
        </p>
      )}

      {items.map((v) => {
        const anchored = takes.find((t) => t.id === v.anchor);
        return (
          <div className="rt-vo" key={v.id}>
            <div className="rt-vo-h">
              <span>V.O.</span>
              <select
                className="rt-in"
                style={{ width: "auto", padding: "2px 6px", fontSize: 11 }}
                value={v.c ?? ""}
                onChange={(e) => up(v.id, { c: e.target.value || null })}
              >
                <option value="">Narración</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.name}
                  </option>
                ))}
              </select>
              <select
                className="rt-in"
                style={{ width: "auto", padding: "2px 6px", fontSize: 11 }}
                value={v.anchor ?? ""}
                onChange={(e) => up(v.id, { anchor: e.target.value || null })}
                title="Dónde entra"
              >
                <option value="">Toda la escena</option>
                {takes.map((t) => (
                  <option key={t.id} value={t.id}>
                    Entra en la toma {t.no}
                  </option>
                ))}
              </select>
              <span className="rt-sp" />
              <button type="button" className="rt-btn" style={{ padding: "3px 8px" }} onClick={() => onChange(items.filter((x) => x.id !== v.id))}>
                Quitar
              </button>
            </div>
            <textarea
              className="rt-in"
              style={{ minHeight: compact ? 44 : 60 }}
              value={v.text}
              placeholder="Lo que se oye por encima de la imagen."
              onChange={(e) => up(v.id, { text: e.target.value })}
            />
            {anchored && (
              <p className="rt-note" style={{ marginTop: 5 }}>
                Anclada a la toma {anchored.no}: entra donde entra esa toma y sigue sonando por encima de lo que venga después.
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        className="rt-btn"
        onClick={() => onChange([...items, { id: uid("vo"), c: null, text: "", anchor: null }])}
      >
        + Voz en off
      </button>
    </div>
  );
}
