"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GESTION_LABEL, type Gestion } from "@/lib/asistencia/desacoplado";
import { PRODUCER_SEGMENTS, type ProducerSegment } from "@/lib/bcp/producerSegments";
import { SesionAsistidaBoton } from "./SesionAsistidaBoton";
import styles from "@/components/panel/shared.module.css";

// ── Asistencia a Proveedores · la tabla con filtros y buscador (V5.105, owner 2026-09-30) ─────────────────────────
// «Agrega opciones de filtros y también un buscador que vaya no solo al nombre directo del productor, sino también un
// toggle on/off para hacer "deep look" y que encuentre matches entre las fincas y lotes.»
// El buscador normal mira al productor (nombre, correo, código, empresa). Con la BÚSQUEDA PROFUNDA encendida mira
// también sus fincas (nombre, código CTC-F-, vereda, municipio) y sus lotes (nombre, código CTC-L-), y la fila dice
// en qué coincidió. Los filtros son los mismos de /ocp/kr donde aplican: cuenta (propia · desacoplado · entregado),
// estado del productor por casillas (de `PRODUCER_SEGMENTS`, la fuente), departamento, con/sin finca, con/sin lote.

export type AsistenciaFila = {
  id: string;
  nombre: string;
  email: string | null;
  codigo: string;
  empresa: string | null;
  departamento: string | null;
  gestion: Gestion | null;
  segmentoId: ProducerSegment;
  segmento: string;
  fincas: { nombre: string; codigo: string; lugar: string }[];
  lotes: { nombre: string; codigo: string }[];
};

type Cuenta = "" | "propia" | Gestion;
type ConSin = "" | "con" | "sin";

const norm = (s: string | null | undefined) => (s ?? "").toLocaleLowerCase("es-CO");

export function AsistenciaTabla({ filas }: { filas: AsistenciaFila[] }) {
  const [texto, setTexto] = useState("");
  const [profunda, setProfunda] = useState(false);
  const [cuenta, setCuenta] = useState<Cuenta>("");
  const [segmentos, setSegmentos] = useState<Set<ProducerSegment>>(() => new Set());
  const [depto, setDepto] = useState("");
  const [finca, setFinca] = useState<ConSin>("");
  const [lote, setLote] = useState<ConSin>("");

  const deptos = useMemo(() => [...new Set(filas.map((f) => f.departamento).filter((d): d is string => !!d))].sort(), [filas]);

  const visibles = useMemo(() => {
    const q = norm(texto.trim());
    return filas
      .map((f) => {
        if (cuenta === "propia" && f.gestion) return null;
        if (cuenta && cuenta !== "propia" && f.gestion !== cuenta) return null;
        if (segmentos.size > 0 && !segmentos.has(f.segmentoId)) return null;
        if (depto && f.departamento !== depto) return null;
        if (finca === "con" && !f.fincas.length) return null;
        if (finca === "sin" && f.fincas.length) return null;
        if (lote === "con" && !f.lotes.length) return null;
        if (lote === "sin" && f.lotes.length) return null;
        if (!q) return { fila: f, coincide: [] as string[] };
        const directo = [f.nombre, f.email, f.codigo, f.empresa].some((v) => norm(v).includes(q));
        if (directo) return { fila: f, coincide: [] as string[] };
        if (!profunda) return null;
        // Búsqueda profunda: fincas y lotes, y la fila dice dónde coincidió.
        const coincide = [
          ...f.fincas.filter((x) => [x.nombre, x.codigo, x.lugar].some((v) => norm(v).includes(q))).map((x) => `Finca ${x.nombre} (${x.codigo})`),
          ...f.lotes.filter((x) => [x.nombre, x.codigo].some((v) => norm(v).includes(q))).map((x) => `Lote ${x.nombre} (${x.codigo})`),
        ];
        return coincide.length ? { fila: f, coincide } : null;
      })
      .filter((x): x is { fila: AsistenciaFila; coincide: string[] } => x !== null);
  }, [filas, texto, profunda, cuenta, segmentos, depto, finca, lote]);

  const chip = (activo: boolean, label: string, onClick: () => void) => (
    <button type="button" className={`btn btn-sm ${activo ? "btn-solid" : ""}`} aria-pressed={activo} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <input
          id="asistencia-buscar"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={profunda ? "Buscar productor, finca o lote (nombre o código)…" : "Buscar productor (nombre, correo, código, empresa)…"}
          aria-label="Buscar"
          style={{ flex: "1 1 260px", padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13 }}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }} title="Con la búsqueda profunda, lo que escriba también se busca en las fincas y los lotes de cada productor">
          <input type="checkbox" role="switch" aria-checked={profunda} checked={profunda} onChange={(e) => setProfunda(e.target.checked)} />
          Búsqueda profunda · fincas y lotes {profunda ? "ON" : "OFF"}
        </label>
        <select id="asistencia-cuenta" aria-label="Cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value as Cuenta)}>
          <option value="">Cuenta: todas</option>
          <option value="propia">Propia</option>
          {(Object.keys(GESTION_LABEL) as Gestion[]).map((g) => (
            <option key={g} value={g}>{GESTION_LABEL[g]}</option>
          ))}
        </select>
        <select id="asistencia-depto" aria-label="Departamento" value={depto} onChange={(e) => setDepto(e.target.value)}>
          <option value="">Departamento</option>
          {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap", alignItems: "center", marginBottom: 10 }} role="group" aria-label="Estado del productor">
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Estado del productor:</span>
        {PRODUCER_SEGMENTS.map((sg) => (
          <label key={sg.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={segmentos.has(sg.id)}
              onChange={(e) =>
                setSegmentos((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(sg.id);
                  else next.delete(sg.id);
                  return next;
                })
              }
            />
            {sg.label}
          </label>
        ))}
        {segmentos.size > 0 && (
          <button type="button" className="btn btn-sm" onClick={() => setSegmentos(new Set())}>Todos</button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {chip(finca === "con", "Finca ✅", () => setFinca(finca === "con" ? "" : "con"))}
        {chip(finca === "sin", "Sin finca", () => setFinca(finca === "sin" ? "" : "sin"))}
        {chip(lote === "con", "Lote ✅", () => setLote(lote === "con" ? "" : "con"))}
        {chip(lote === "sin", "Sin lote", () => setLote(lote === "sin" ? "" : "sin"))}
        <span className={styles.meta} style={{ marginTop: 0 }}>
          {visibles.length} de {filas.length} productores
        </span>
      </div>

      {!visibles.length ? (
        <p className={styles.empty}>Ningún productor coincide{texto && !profunda ? " — pruebe con la búsqueda profunda para mirar en fincas y lotes" : ""}.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "var(--card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Productor", "Código", "Cuenta", "Fincas", "Lotes", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map(({ fila: p, coincide }) => (
                <tr key={p.id}>
                  <td style={td}>
                    <Link href={`/ocp/kr?productor=${p.id}`} style={{ fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
                      {p.nombre}
                    </Link>
                    <span style={sub}>{[p.empresa, p.segmento, p.departamento].filter(Boolean).join(" · ")}</span>
                    {p.email && <span style={sub}>{p.email}</span>}
                    {coincide.length > 0 && <span style={{ ...sub, color: "var(--primary)" }}>Coincide en: {coincide.join(" · ")}</span>}
                  </td>
                  <td style={td}>
                    <span className="mono">{p.codigo}</span>
                  </td>
                  <td style={td}>
                    {p.gestion ? <span className={`${styles.badge} ${styles.badgeWarn}`}>{GESTION_LABEL[p.gestion]}</span> : <span className={styles.meta}>Propia</span>}
                  </td>
                  <td style={td}>{p.fincas.length}</td>
                  <td style={td}>{p.lotes.length}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <SesionAsistidaBoton producerId={p.id} nombre={p.nombre} compacto />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const td: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };
const sub: React.CSSProperties = { display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 };
