"use client";

// ── OCP · Anclas de mercado ──────────────────────────────────────────────────
// El histórico del precio interno de la FNC, que antes vivía en el localStorage
// de la Calculadora de Mermas: se perdía al limpiar el caché y no lo veía nadie
// más. Aquí se consulta, se corrige y se acumula.
//
// La calculadora sigue usando el precio como referencia; lo recibe de aquí al
// abrirse (ver AppFrame).

import { useCallback, useEffect, useMemo, useState } from "react";
import { consultFncNow, deleteAnchor, listAnchors, recordAnchor } from "@/lib/anclas/actions";
import { ANCHOR_KINDS, SOURCE_LABEL, type MarketAnchor } from "@/lib/anclas/types";
import styles from "@/app/bcp/(app)/shared.module.css";
import table from "./quotesTable.module.css";

const cop = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);

/** La serie, en SVG. Sin librería: es una línea y una retícula. */
function Spark({ points }: { points: { asOf: string; value: number }[] }) {
  if (points.length < 2) return null;
  const W = 720, H = 150, pad = 26;
  const xs = points.map((p) => new Date(`${p.asOf}T12:00:00`).getTime());
  const ys = points.map((p) => p.value);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = (t: number) => pad + ((t - x0) / (x1 - x0 || 1)) * (W - pad * 2);
  const sy = (v: number) => H - pad - ((v - y0) / (y1 - y0 || 1)) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(xs[i]).toFixed(1)},${sy(p.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={table.spark} role="img" aria-label="Serie del precio">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="currentColor" strokeOpacity=".18" />
      <path d={d} fill="none" stroke="#3c0a86" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={p.asOf} cx={sx(xs[i])} cy={sy(p.value)} r="2.6" fill="#3c0a86" />)}
      <text x={pad} y={14} fontSize="10" fill="currentColor" fillOpacity=".6">{cop(y1)}</text>
      <text x={pad} y={H - 8} fontSize="10" fill="currentColor" fillOpacity=".6">{cop(y0)}</text>
    </svg>
  );
}

export function AnclasBoard() {
  const [rows, setRows] = useState<MarketAnchor[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ asOf: today(), value: "", note: "" });

  const refresh = useCallback(async () => setRows((await listAnchors()) ?? []), []);
  useEffect(() => { listAnchors().then((r) => setRows(r ?? [])); }, []);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(true); setError(""); setMsg("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "No se pudo.");
    else { setMsg(okMsg); await refresh(); }
    setBusy(false);
  }

  const last = rows?.[0] ?? null;
  const serie = useMemo(() => (rows ?? []).slice(0, 40).slice().reverse().map((r) => ({ asOf: r.asOf, value: r.value })), [rows]);
  const kind = ANCHOR_KINDS[0];

  if (rows === null) return <p className={styles.subtitle}>Cargando anclas…</p>;

  return (
    <>
      <h1 className={styles.title}>Anclas de mercado</h1>
      <p className={styles.subtitle}>
        Las referencias con las que se cotiza. Se consultan y se corrigen aquí; las calculadoras las usan sin
        tener que guardarlas cada una por su cuenta. La lectura del precio FNC se toma sola una vez al día.
      </p>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>{kind.label}</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{last ? cop(last.value) : "—"}</span>
          <span className={styles.kpiSub}>{last ? `${day(last.asOf)} · ${SOURCE_LABEL[last.source] ?? last.source}` : "sin lecturas"}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>Lecturas</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{rows.length}</span>
          <span className={styles.kpiSub}>{kind.hint}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>Automáticas</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{rows.filter((r) => r.automatic).length}</span>
          <span className={styles.kpiSub}>traídas por el cron diario</span>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: 18 }}>
        <div className={styles.sectionHead}>
          <strong>{kind.label}</strong>
          <span className={styles.actions}>
            <button className="btn btn-sm btn-solid" type="button" disabled={busy}
              onClick={() => run(consultFncNow, "Precio consultado y anotado.")}>
              Consultar precio de hoy
            </button>
          </span>
        </div>
        <Spark points={serie} />
        <p className={styles.meta}>
          Fuente: federaciondecafeteros.org. Si la página cambia de formato y la lectura no se reconoce, no se
          anota nada — es preferible un hueco en la serie a un número inventado. En ese caso, anótalo a mano.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}><strong>Anotar una lectura</strong></div>
        <form
          className={styles.formGrid}
          onSubmit={async (e) => {
            e.preventDefault();
            const v = Number(form.value.replace(/\./g, "").replace(",", "."));
            if (!(v > 0)) { setError("El valor tiene que ser mayor que cero."); return; }
            await run(() => recordAnchor({ asOf: form.asOf, value: v, note: form.note, source: "manual" }), "Lectura anotada.");
            setForm({ asOf: today(), value: "", note: "" });
          }}
        >
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="a-date">Fecha</label>
            <input id="a-date" type="date" value={form.asOf} onChange={(e) => setForm({ ...form, asOf: e.target.value })} required />
          </div>
          <div className={styles.field} style={{ minWidth: 170 }}>
            <label htmlFor="a-val">Precio (COP/carga)</label>
            <input id="a-val" inputMode="numeric" placeholder="2.210.000" value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })} required />
          </div>
          <div className={styles.field} style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="a-note">Nota</label>
            <input id="a-note" placeholder="De dónde salió" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="btn btn-sm" type="submit" disabled={busy}>Anotar</button>
        </form>
        <p className={styles.meta}>Una lectura por día: si ya hay una para esa fecha, se corrige en vez de duplicarse.</p>
        {msg && <p className={styles.meta}>{msg}</p>}
        {error && <p className={styles.warn}>{error}</p>}
      </div>

      <div className={table.scroll}>
        <table className={table.t}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th className={table.r}>Valor</th>
              <th>Origen</th>
              <th>Nota</th>
              <th className={table.acts}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{day(r.asOf)}</td>
                <td className={table.r}><span className={table.strong}>{cop(r.value)}</span><small>{r.unit}</small></td>
                <td>
                  {SOURCE_LABEL[r.source] ?? r.source}
                  {r.automatic && <span className={table.tag}>auto</span>}
                </td>
                <td className={table.muted}>{r.note ?? "—"}</td>
                <td className={table.acts}>
                  <button className="btn btn-sm" type="button" disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`¿Borrar la lectura del ${day(r.asOf)} (${cop(r.value)})?`)) return;
                      void run(() => deleteAnchor(r.id), "Lectura borrada.");
                    }}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
