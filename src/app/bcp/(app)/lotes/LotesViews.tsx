"use client";

// ── Los lotes que YA PASARON el intake, en 3 vistas (2026-07-23, owner) ──────
//   1. MAPA — un pin por lote sobre la finca de origen, coloreado por su grado
//      CTC (negro por defecto mientras no tenga grado); pines cercanos se
//      agrupan y los de una misma finca se ramifican (GeoMap). Arriba, el
//      botón de temporadas abre un dial con DOS perillas (desde/hasta).
//   2. LISTA — todos los lotes con filtros (región, temporada, grado, etapa) y
//      búsqueda libre; la postulación en nombre del productor sigue aquí.
//   3. NO APTOS — el veredicto reversible, con su razón.
// Reemplaza a AptosNoAptosSections (2026-07-20), que solo tenía Aptos/No aptos.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revertNoApto } from "../actions";
import { PostularOnBehalfButton } from "../nominados/NominadosClient";
import { GeoMap, type GeoMarker } from "@/components/bcp/GeoMap";
import styles from "../shared.module.css";

export type ViewLot = {
  id: string;
  name: string;
  reference: string;
  producerName: string;
  /** Cualquier etapa del ciclo — la Lista muestra TODOS los lotes (2026-07-23). */
  stage: string;
  /** true = ya pasó el intake (apto en adelante) — "en el camino de la Arena". */
  arenaPath: boolean;
  grade: string | null;
  seasonId: string | null;
  seasonLabel: string;
  fincaName: string;
  /** Región = departamento de la finca de origen. */
  region: string;
  lat: number | null;
  lng: number | null;
  postulated: boolean;
  reason: string | null;
};

const STAGE_LABEL: Record<string, string> = {
  borrador: "Borrador",
  ficha_completa: "En EVA",
  videos_ok: "Videos ✓ (legado)",
  muestra_transito: "Muestra en tránsito (legado)",
  apto: "Apto",
  no_apto: "No apto",
  fila_arena: "En sesión de Arena",
  evaluado: "Evaluado",
  galardonado: "Galardonado",
};
const stageLabelOf = (s: string) => STAGE_LABEL[s] ?? s;

// Hexes concretos de los grados (globals.css --t-*): el pin de Maps no lee
// variables CSS. Negro por defecto = "sin grado todavía" (pedido del owner).
const GRADE_HEX: Record<string, string> = {
  Black: "#1A1C1E",
  Red: "#B01F24",
  Blue: "#1F4FB0",
  Gold: "#A87A14",
  Tyrian: "#66023C",
};
const DEFAULT_PIN = "#1A1C1E";

function lotLink(l: ViewLot): { label: string; href: string } | undefined {
  if (l.stage === "galardonado") return { label: "Ver en Galardonados", href: "/bcp/galardonados" };
  if (l.stage === "fila_arena") return { label: "Ver en Arena", href: "/bcp/arena" };
  if (l.postulated) return { label: "Ver en Nominados", href: "/bcp/nominados" };
  return undefined;
}

// ── El dial de temporadas: botón → popover con DOS perillas (desde/hasta) ────
function SeasonRangeDial({
  seasons,
  range,
  onChange,
}: {
  /** Ordenadas de la más vieja a la más nueva. */
  seasons: { id: string; label: string }[];
  range: [number, number] | null; // índices inclusive; null = todas
  onChange: (r: [number, number] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const max = seasons.length - 1;
  const [from, to] = range ?? [0, max];
  const label = range ? `${seasons[from]?.label} — ${seasons[to]?.label}` : "Todas las temporadas";

  if (!seasons.length) return null;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        🗓 {label} ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, minWidth: 260,
            background: "var(--card)", border: "1.5px solid var(--line)", borderRadius: 12, padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,.14)",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", margin: "0 0 8px" }}>
            Rango de temporadas
          </p>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>
            Desde: <span style={{ color: "var(--primary)" }}>{seasons[from]?.label}</span>
            <input
              type="range" min={0} max={max} value={from}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), to);
                onChange([v, to]);
              }}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
          </label>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
            Hasta: <span style={{ color: "var(--primary)" }}>{seasons[to]?.label}</span>
            <input
              type="range" min={0} max={max} value={to}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), from);
                onChange([from, v]);
              }}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => onChange(null)}>Todas</button>
            <button type="button" className="btn btn-sm btn-solid" onClick={() => setOpen(false)}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RevertNoAptoButton({ lotId }: { lotId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button
        className="btn btn-sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await revertNoApto(lotId);
            if (res.ok) router.refresh();
            else setError(res.error);
          });
        }}
      >
        {pending ? "Reabriendo…" : "Reabrir evaluación"}
      </button>
      {error && <span className={styles.warn}> {error}</span>}
    </span>
  );
}

// Celdas de la lista "detalles" — mismo lenguaje que las tablas del ECP.
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "7px 10px",
  fontFamily: "var(--font-spline-mono), monospace",
  fontSize: 10,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--muted)",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "6px 10px", color: "var(--muted)", whiteSpace: "nowrap" };

function GradeDot({ grade }: { grade: string | null }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700 }}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: grade ? GRADE_HEX[grade] ?? DEFAULT_PIN : DEFAULT_PIN, border: "1.5px solid #fff", boxShadow: "0 0 0 1px var(--line)" }} />
      {grade ?? "Sin grado"}
    </span>
  );
}

type ViewKey = "mapa" | "lista" | "noaptos";

export function LotesViews({
  lots,
  noAptos,
  seasons,
}: {
  /** Lotes que pasaron el intake (apto en adelante, sin no_apto). */
  lots: ViewLot[];
  noAptos: ViewLot[];
  /** Ordenadas de la más vieja a la más nueva. */
  seasons: { id: string; label: string }[];
}) {
  const [view, setView] = useState<ViewKey>("mapa");
  const [range, setRange] = useState<[number, number] | null>(null);
  // Lista: filtros + búsqueda. `scope` = alcance (todos / camino de la Arena /
  // intake documental) — la Lista muestra TODOS los lotes por defecto.
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"" | "camino" | "intake">("");
  const [region, setRegion] = useState("");
  const [season, setSeason] = useState("");
  const [grade, setGrade] = useState("");
  const [stage, setStage] = useState("");
  const [noAptosSeason, setNoAptosSeason] = useState("");

  const seasonIndex = useMemo(() => new Map(seasons.map((s, i) => [s.id, i])), [seasons]);
  const regions = useMemo(() => [...new Set(lots.map((l) => l.region).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [lots]);
  const grades = useMemo(() => [...new Set(lots.map((l) => l.grade).filter((g): g is string => !!g))], [lots]);
  const stagesPresent = useMemo(() => [...new Set(lots.map((l) => l.stage))], [lots]);

  // MAPA: solo el camino de la Arena (apto en adelante) — la Lista es la que
  // abarca todos. Rango de temporadas inclusive; sin temporada se muestra siempre.
  const mapLots = lots.filter((l) => {
    if (!l.arenaPath) return false;
    if (!range) return true;
    if (!l.seasonId) return true;
    const i = seasonIndex.get(l.seasonId);
    return i == null || (i >= range[0] && i <= range[1]);
  });
  const withCoords = mapLots.filter((l) => l.lat != null && l.lng != null);
  const markers: GeoMarker[] = withCoords.map((l) => ({
    id: l.id,
    lat: l.lat!,
    lng: l.lng!,
    color: l.grade ? GRADE_HEX[l.grade] ?? DEFAULT_PIN : DEFAULT_PIN,
    title: l.name,
    lines: [
      l.reference,
      `${stageLabelOf(l.stage)}${l.grade ? ` · Grado ${l.grade}` : " · Sin grado"}`,
      `Finca ${l.fincaName}${l.region ? ` · ${l.region}` : ""}`,
      l.producerName,
      l.seasonLabel,
    ],
    link: lotLink(l),
  }));

  // LISTA: filtros + búsqueda libre sobre TODOS los lotes.
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const listLots = lots.filter((l) => {
    if (scope === "camino" && !l.arenaPath) return false;
    if (scope === "intake" && l.arenaPath) return false;
    if (region && l.region !== region) return false;
    if (season && l.seasonId !== season) return false;
    if (grade && (l.grade ?? "") !== grade) return false;
    if (stage && l.stage !== stage) return false;
    if (q) {
      const hay = norm(`${l.name} ${l.reference} ${l.producerName} ${l.fincaName} ${l.region}`);
      if (!hay.includes(norm(q))) return false;
    }
    return true;
  });

  const fNoAptos = noAptosSeason ? noAptos.filter((l) => l.seasonId === noAptosSeason) : noAptos;

  const tabs: { key: ViewKey; label: string; count: number }[] = [
    { key: "mapa", label: "🗺 Mapa", count: withCoords.length },
    { key: "lista", label: "☰ Lista", count: lots.length },
    { key: "noaptos", label: "✗ No aptos", count: noAptos.length },
  ];

  return (
    <div style={{ marginTop: 30 }} id="aptos">
      <h2 style={{ fontSize: 17, marginBottom: 2 }}>Todos los lotes</h2>
      <p className={styles.subtitle} style={{ marginTop: 0 }}>
        El mapa muestra los lotes en el camino de la Arena por finca de origen (color = grado CTC, negro mientras no lo
        tenga); la lista abarca TODOS los lotes del ciclo — filtre por alcance, región, temporada, grado o etapa — y los
        No aptos tienen su propia vista.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 14px" }}>
        {tabs.map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              aria-pressed={active}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${active ? "var(--primary)" : "var(--line)"}`,
                background: active ? "var(--primary)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
              }}
            >
              {t.label}
              <span style={{
                fontSize: 10.5, fontWeight: 800, minWidth: 16, textAlign: "center", padding: "0 5px", borderRadius: 999,
                background: active ? "rgba(255,255,255,.25)" : "var(--line)", color: active ? "#fff" : "var(--muted)",
              }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {view === "mapa" && (
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <SeasonRangeDial seasons={seasons} range={range} onChange={setRange} />
            <span className={styles.meta} style={{ margin: 0 }}>
              {withCoords.length} de {mapLots.length} lote{mapLots.length === 1 ? "" : "s"} con ubicación de finca.
            </span>
          </div>
          {!withCoords.length ? (
            <p className={styles.empty}>Ningún lote del rango tiene finca con coordenadas.</p>
          ) : (
            <GeoMap markers={markers} height={500} />
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            {Object.entries(GRADE_HEX).map(([g, hex]) => (
              <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)" }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: hex }} /> {g}
              </span>
            ))}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--muted)" }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: DEFAULT_PIN, outline: "1.5px dashed var(--muted)", outlineOffset: 1 }} /> Sin grado (negro por defecto)
            </span>
          </div>
        </div>
      )}

      {view === "lista" && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input
              placeholder="Buscar por lote, referencia, productor, finca…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)" }}
            />
            <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} aria-label="Alcance">
              <option value="">Todos los lotes</option>
              <option value="camino">En el camino de la Arena</option>
              <option value="intake">En intake documental</option>
            </select>
            <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Región">
              <option value="">Región (todas)</option>
              {regions.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
            <select value={season} onChange={(e) => setSeason(e.target.value)} aria-label="Temporada">
              <option value="">Temporada (todas)</option>
              {seasons.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
            </select>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Grado">
              <option value="">Grado (todos)</option>
              {grades.map((g) => (<option key={g} value={g}>{g}</option>))}
            </select>
            <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Etapa">
              <option value="">Etapa (todas)</option>
              {stagesPresent.map((s) => (
                <option key={s} value={s}>{stageLabelOf(s)}</option>
              ))}
            </select>
          </div>
          {!listLots.length ? (
            <p className={styles.empty}>Ningún lote coincide con el filtro.</p>
          ) : (
            // Lista tipo "detalles" (2026-07-23): una fila compacta por lote.
            <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "var(--card)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 760 }}>
                <thead>
                  <tr>
                    {["Lote", "Referencia", "Etapa", "Grado", "Temporada", "Productor", "Finca", "Región", ""].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listLots.map((l) => (
                    <tr key={l.id} id={`lot-${l.id}`} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ ...td, fontWeight: 700, color: "var(--ink)" }}>{l.name}</td>
                      <td style={{ ...td, fontFamily: "var(--font-spline-mono), monospace", fontSize: 11.5 }}>{l.reference}</td>
                      <td style={td}>{stageLabelOf(l.stage)}{l.stage === "apto" && l.postulated ? " · Postulado ✓" : ""}</td>
                      <td style={td}><GradeDot grade={l.grade} /></td>
                      <td style={td}>{l.seasonLabel}</td>
                      <td style={td}>{l.producerName}</td>
                      <td style={td}>{l.fincaName}</td>
                      <td style={td}>{l.region || "—"}</td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        {l.stage === "apto" && !l.postulated && <PostularOnBehalfButton lotId={l.id} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.meta} style={{ marginTop: 6 }}>
            {listLots.length} de {lots.length} lote{lots.length === 1 ? "" : "s"}.
          </p>
        </div>
      )}

      {view === "noaptos" && (
        <div id="no-aptos">
          <p className={styles.subtitle} style={{ marginTop: 0 }}>
            El veredicto puede reabrirse — la razón queda visible para el productor mientras tanto.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 10px" }}>
            {[{ id: "", label: "Todas las temporadas" }, ...seasons].map((s) => (
              <button
                key={s.id || "todas"}
                type="button"
                className={styles.badge}
                style={{
                  cursor: "pointer", border: "1px solid var(--line)",
                  background: noAptosSeason === s.id ? "var(--primary)" : undefined,
                  color: noAptosSeason === s.id ? "#fff" : undefined,
                }}
                onClick={() => setNoAptosSeason(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {!fNoAptos.length ? (
            <p className={styles.empty}>Sin lotes no aptos en esta temporada.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {fNoAptos.map((l) => (
                <div key={l.id} id={`lot-${l.id}`} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b>{l.name}</b>
                    <span className={`${styles.badge} mono`}>{l.reference}</span>
                    <span className={styles.badge}>{l.seasonLabel}</span>
                  </div>
                  <p className={styles.meta}>
                    {l.producerName} · Motivo: {l.reason || "—"}
                  </p>
                  <div>
                    <RevertNoAptoButton lotId={l.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
