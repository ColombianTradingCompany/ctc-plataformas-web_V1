"use client";

// ── OCP · Cotizadores · Cuadro de evaluación del costo de empaque ────────────
// Superpone las configuraciones guardadas y las lee por LENTES. Cada lente es
// una pregunta distinta sobre las mismas cotizaciones —cuánto cuesta el kilo, de
// qué se compone ese costo, cuánto se alcanza a empacar en un día, cuánta plata
// hay que poner— y ninguna sirve sola: la máquina más barata suele ser la de
// menor capacidad, y eso solo se ve comparando dos lentes.
//
// Se elige qué entra: al desmarcar una configuración sale del gráfico Y de la
// escala, para poder comparar dos candidatas sin que una tercera aplaste la
// barra. Cada fila lleva a su propia cotización.
//
// Colores: los MISMOS tres papeles que la herramienta y su PDF (bolsa, mano de
// obra, amortización), en pasos validados con el validador del skill dataviz
// (banda de luminosidad + separación para daltonismo). El ámbar queda por debajo
// de 3:1 contra el fondo, así que el valor va SIEMPRE escrito y hay tabla.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listQuoteMetrics } from "@/lib/cotizador/actions";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@/lib/cotizador/types";
import styles from "@/components/panel/shared.module.css";
import ev from "./evaluacion.module.css";

type MetricRow = {
  id: string;
  code: string;
  title: string;
  status: QuoteStatus;
  total: number | null;
  createdAt: string;
  results: Record<string, unknown>;
};

const COLOR = { bolsa: "#D9A400", labor: "#C8102E", maquina: "#3A6FD0" };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const cop = (v: number | null) =>
  v === null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const kg = (v: number | null) => (v === null ? "—" : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(v)} kg`);

/** Las lentes. `better:"low"` = gana el más bajo (costos); `"high"` = el más alto. */
const LENSES = [
  {
    key: "kilo",
    label: "Costo por kilo",
    unit: "COP/kg",
    better: "low" as const,
    stacked: true,
    help: "Lo que cuesta empacar un kilo, y de qué se compone. La bolsa suele ser la mayoría: es el gasto que se repite en cada unidad.",
    value: (r: MetricRow) => num(r.results.costoPorKilo) ?? r.total,
    parts: (r: MetricRow) => [
      { key: "bolsa", label: "Bolsa", color: COLOR.bolsa, v: num(r.results.costoBolsa) ?? 0 },
      { key: "labor", label: "Mano de obra", color: COLOR.labor, v: num(r.results.costoManoObra) ?? 0 },
      { key: "maquina", label: "Amortización", color: COLOR.maquina, v: num(r.results.costoAmortizacion) ?? 0 },
    ],
    fmt: cop,
  },
  {
    key: "bolsa",
    label: "Costo por bolsa",
    unit: "COP",
    better: "low" as const,
    stacked: false,
    help: "Lo mismo, pero por unidad empacada: la cifra que se compara contra el precio de venta de esa presentación.",
    value: (r: MetricRow) => num(r.results.costoPorBolsa),
    fmt: cop,
  },
  {
    key: "capacidad",
    label: "Capacidad · kg por día",
    unit: "kg/día",
    better: "high" as const,
    stacked: false,
    help: "Cuánto alcanza a empacar en una jornada. Una máquina barata con poca capacidad puede costar más por kilo que una cara que rinde.",
    value: (r: MetricRow) => num(r.results.kgPorDia),
    fmt: kg,
  },
  {
    key: "inversion",
    label: "Inversión · precio de la máquina",
    unit: "COP",
    better: "low" as const,
    stacked: false,
    help: "La plata que hay que poner de entrada. Se lee contra la capacidad: es la otra mitad de la misma decisión.",
    value: (r: MetricRow) => num(r.results.precioMaquina),
    fmt: cop,
  },
];

/** `rows` viene dado solo cuando alguien ya las tiene (o para previsualizar el
 *  tablero sin sesión del OCP); en uso normal se piden aquí. */
export function EvaluationBoard({ rows: given }: { rows?: MetricRow[] } = {}) {
  const [rows, setRows] = useState<MetricRow[] | null>(given ?? null);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [lensKey, setLensKey] = useState("kilo");

  useEffect(() => {
    if (given) return;
    listQuoteMetrics("empaque").then((r) => setRows((r as MetricRow[] | null) ?? []));
  }, [given]);

  const lens = LENSES.find((l) => l.key === lensKey) ?? LENSES[0];

  // Solo entran las que tienen la cifra de ESTA lente: una cotización recién
  // creada y nunca guardada no tiene resultados, y pintarla como cero mentiría.
  const usable = useMemo(() => (rows ?? []).filter((r) => lens.value(r) !== null), [rows, lens]);
  const shown = useMemo(() => usable.filter((r) => !off.has(r.id)), [usable, off]);

  const sorted = useMemo(() => {
    const s = [...shown];
    s.sort((a, b) => {
      const av = lens.value(a) ?? 0;
      const bv = lens.value(b) ?? 0;
      return lens.better === "low" ? av - bv : bv - av;
    });
    return s;
  }, [shown, lens]);

  const max = useMemo(() => Math.max(...sorted.map((r) => lens.value(r) ?? 0), 0), [sorted, lens]);

  if (rows === null) return <p className={styles.subtitle}>Cargando configuraciones…</p>;

  if (!rows.length) {
    return (
      <div className={styles.empty}>
        <h3>Todavía no hay configuraciones guardadas</h3>
        <p className={styles.meta}>
          Cada análisis que guardes en el cotizador de costo de empaque aparece aquí para compararlo con los demás.
        </p>
        <Link className={styles.backLink} href="/ocp/cotizador-empaque">← Ir al cotizador</Link>
      </div>
    );
  }

  return (
    <>
      <div className={ev.panel}>
        <div className={ev.panelHead}>
          <strong>Qué se compara</strong>
          <span className={styles.meta}>
            {shown.length} de {usable.length} con cifras guardadas
          </span>
        </div>
        <div className={ev.pickList}>
          {usable.map((r) => (
            <label key={r.id} className={ev.pick}>
              <input
                type="checkbox"
                checked={!off.has(r.id)}
                onChange={(e) => {
                  const next = new Set(off);
                  if (e.target.checked) next.delete(r.id);
                  else next.add(r.id);
                  setOff(next);
                }}
              />
              <span className={ev.pickName}>
                {r.title}
                <span className={ev.pickMeta}> · {r.code} · {QUOTE_STATUS_LABEL[r.status]}</span>
              </span>
              <Link className={ev.pickMeta} href={`/ocp/cotizador-empaque/${r.id}`}>abrir →</Link>
            </label>
          ))}
        </div>
        {usable.length < rows.length && (
          <p className={styles.meta}>
            {rows.length - usable.length} cotización(es) sin cifras para esta lente: ábrelas y guarda una vez para que entren.
          </p>
        )}
      </div>

      <div className={ev.panel}>
        <div className={ev.lenses} role="group" aria-label="Lente de comparación">
          {LENSES.map((l) => (
            <button
              key={l.key}
              type="button"
              className={ev.lens}
              aria-pressed={l.key === lensKey}
              onClick={() => setLensKey(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className={ev.panelHead}>
          <strong>{lens.label} <span className={styles.meta}>({lens.unit})</span></strong>
          <span className={styles.meta}>{lens.better === "low" ? "Mejor: el más bajo" : "Mejor: el más alto"}</span>
        </div>
        <p className={styles.meta}>{lens.help}</p>

        {lens.stacked && (
          <div className={ev.legend}>
            {lens.parts!(sorted[0] ?? ({ results: {} } as MetricRow)).map((p) => (
              <span key={p.key}><i style={{ background: p.color }} />{p.label}</span>
            ))}
          </div>
        )}

        {!sorted.length ? (
          <p className={styles.meta}>No hay ninguna configuración marcada.</p>
        ) : (
          <div className={ev.chart}>
            {sorted.map((r, i) => {
              const v = lens.value(r) ?? 0;
              const w = max > 0 ? (v / max) * 100 : 0;
              return (
                <div key={r.id} className={ev.row}>
                  <Link className={ev.rowName} href={`/ocp/cotizador-empaque/${r.id}`}>
                    {r.title}
                    <span className={ev.rowCode}>{r.code}</span>
                  </Link>
                  <div className={ev.track}>
                    <div className={ev.bar} style={{ width: `${w}%` }}>
                      {lens.stacked
                        ? lens.parts!(r).map((p) => (
                            <div
                              key={p.key}
                              className={ev.seg}
                              style={{ background: p.color, width: `${v > 0 ? (p.v / v) * 100 : 0}%` }}
                              title={`${p.label}: ${cop(p.v)}`}
                            />
                          ))
                        : <div className={ev.seg} style={{ background: "#3C0A86", width: "100%" }} />}
                    </div>
                  </div>
                  <div className={ev.value}>
                    {lens.fmt(v)}
                    {i === 0 && sorted.length > 1 && <span className={ev.best}>mejor</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* La tabla no es un extra: el ámbar de "bolsa" no alcanza 3:1 contra el
          fondo, así que las cifras tienen que poder leerse sin depender del color. */}
      <div className={ev.panel}>
        <div className={ev.panelHead}>
          <strong>Todas las cifras</strong>
        </div>
        <div className={ev.tableWrap}>
          <table className={ev.table}>
            <thead>
              <tr>
                <th>Configuración</th>
                <th>COP/kg</th>
                <th>Bolsa</th>
                <th>Mano de obra</th>
                <th>Amortización</th>
                <th>Por bolsa</th>
                <th>kg/día</th>
                <th>Máquina</th>
                <th>Bolsa elegida</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/ocp/cotizador-empaque/${r.id}`}>{r.title}</Link>
                    <span className={ev.rowCode}>{r.code}</span>
                  </td>
                  <td className={ev.num}>{cop(num(r.results.costoPorKilo) ?? r.total)}</td>
                  <td className={ev.num}>{cop(num(r.results.costoBolsa))}</td>
                  <td className={ev.num}>{cop(num(r.results.costoManoObra))}</td>
                  <td className={ev.num}>{cop(num(r.results.costoAmortizacion))}</td>
                  <td className={ev.num}>{cop(num(r.results.costoPorBolsa))}</td>
                  <td className={ev.num}>{kg(num(r.results.kgPorDia))}</td>
                  <td>{(r.results.maquinaElegida as string) || "—"}</td>
                  <td>{(r.results.bolsaElegida as string) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
