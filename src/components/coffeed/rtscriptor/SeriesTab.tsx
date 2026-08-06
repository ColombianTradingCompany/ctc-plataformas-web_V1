"use client";

// ── Serie ────────────────────────────────────────────────────────────────────
// Un conjunto de vídeos que comparten estilo y una regla narrativa — lo que
// convierte una carpeta en un cuerpo de trabajo. Las series se crean y se
// editan en los Ajustes; aquí se elige a cuál pertenece este vídeo.

import { Info } from "./parts";
import { tc, type Deck, type Project, type ProjectCard, type Series } from "./model";

export function SeriesTab({
  project,
  cards,
  series,
  decks,
  assets,
  patch,
  openSettings,
  openProject,
}: {
  project: Project;
  cards: ProjectCard[];
  series: Series[];
  decks: Deck[];
  assets: Record<string, string>;
  patch: (fn: (p: Project) => Project) => void;
  openSettings: () => void;
  openProject: (id: string) => void;
}) {
  const mine = series.find((s) => s.id === project.seriesId);
  const deck = decks.find((d) => d.id === (mine?.deckId || project.deckId));
  const siblings = mine ? (mine.videoIds.map((id) => cards.find((c) => c.id === id)).filter(Boolean) as ProjectCard[]) : [];

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <div className="rt-card">
        <div className="rt-head">
          <h2>Serie</h2>
          <Info
            title="Serie"
            text="Un conjunto de vídeos que comparten un estilo visual y un pegamento narrativo — lo que hace que sean un cuerpo de trabajo y no una carpeta. Las series se crean en Ajustes; aquí eliges a cuál pertenece este vídeo."
          />
          <div className="rt-sp" />
          <select
            className="rt-in"
            style={{ width: "auto", padding: "6px 9px", fontSize: 12 }}
            value={project.seriesId || ""}
            onChange={(e) => patch((p) => ({ ...p, seriesId: e.target.value || null }))}
          >
            <option value="">Suelto — sin serie</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" className="rt-btn" onClick={openSettings}>
            Gestionar series
          </button>
        </div>

        {!mine ? (
          <div className="rt-body">
            <p className="rt-note">
              Este vídeo va solo. Engánchalo a una serie para heredar un estilo visual y una premisa compartida, o déjalo como está.
            </p>
          </div>
        ) : (
          <div className="rt-body">
            <div className="rt-row" style={{ alignItems: "flex-start", gap: 18 }}>
              <div style={{ flex: "1 1 320px" }}>
                <p className="rt-label">
                  Pegamento narrativo
                  <Info
                    title="Pegamento narrativo"
                    text="La regla que obedece todo vídeo del conjunto. No es una trama — es una restricción. Es lo que hace que un episodio pertenezca aunque cambie el reparto."
                  />
                </p>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--dim)", margin: "0 0 14px" }}>{mine.glue || "Sin escribir todavía."}</p>
                <p className="rt-label">
                  Cadencia <span>{mine.cadence || "sin fijar"}</span>
                </p>
              </div>
              <div style={{ flex: "1 1 260px" }}>
                <p className="rt-label">
                  Estilo visual <span>{deck?.name ?? "sin baraja"}</span>
                </p>
                <div className="rt-slots" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(72px,1fr))" }}>
                  {(deck?.images || []).slice(0, 6).map((im) => (
                    <div className="rt-slot" key={im.id} style={{ background: im.grad || "#141A1B" }}>
                      {im.path && assets[im.path] && <img src={assets[im.path]} alt={im.label} />}
                    </div>
                  ))}
                </div>
                <div className="rt-chips" style={{ marginTop: 8 }}>
                  {(deck?.descriptors || []).map((x) => (
                    <span key={x} className="rt-chip">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {mine && (
        <div className="rt-card">
          <div className="rt-head">
            <h2>Vídeos del conjunto</h2>
            <p style={{ marginLeft: 8 }}>{siblings.length} · en orden</p>
          </div>
          <div className="rt-body" style={{ display: "grid", gap: 8 }}>
            {siblings.map((p, i) => {
              const here = p.id === project.id;
              return (
                <div
                  key={p.id}
                  className="rt-row"
                  style={{ border: "1px solid var(--edge)", padding: "9px 11px", background: here ? "var(--panel2)" : "transparent" }}
                >
                  <span className="rt-mono" style={{ color: "var(--faint)", fontSize: 11 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <b style={{ fontFamily: "var(--cond)", letterSpacing: ".06em", textTransform: "uppercase", fontSize: 14 }}>{p.title}</b>
                  <span className="rt-chip">{p.scenes} escenas</span>
                  <span className="rt-chip">{tc(p.duration)}</span>
                  <div className="rt-sp" />
                  {here ? (
                    <span className="rt-chip" style={{ borderColor: "var(--grease)", color: "var(--grease)" }}>
                      abierto ahora
                    </span>
                  ) : (
                    <button type="button" className="rt-btn" onClick={() => openProject(p.id)}>
                      Abrir
                    </button>
                  )}
                </div>
              );
            })}
            {siblings.length === 0 && <p className="rt-note">La serie existe pero todavía no tiene vídeos asignados. Se hace en Ajustes.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
