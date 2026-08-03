"use client";

// ── Datawave · las piezas del gráfico ────────────────────────────────────────
// Curvas (todo el tramo), tablero ordenado (un tick) y el buscador de entradas.
// Puerto tipado del prototipo, sin cambios de comportamiento.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { clamp, fmtVal, MAX_PICKS, PALETTE, rankedAt, type Spec } from "./model";

function useWidth(ref: RefObject<HTMLDivElement | null>, initial = 720): number {
  const [w, setW] = useState(initial);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export function Curves({
  spec,
  picked,
  idx,
  log,
  onPick,
  height = 300,
  bare = false,
}: {
  spec: Spec;
  picked: string[];
  idx: number;
  log: boolean;
  onPick?: (id: string) => void;
  height?: number;
  bare?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const w = useWidth(wrapRef);
  const h = height;
  const pad = bare ? { l: 6, r: 6, t: 10, b: 4 } : { l: 46, r: 14, t: 18, b: 26 };
  const { ticks, axis, scale } = spec;
  const top = scale.max;
  const floor = scale.floor;

  const X = (t: number) => pad.l + ((t - axis.start) / (axis.end - axis.start)) * (w - pad.l - pad.r);
  const Y = (v: number) => {
    const inner = h - pad.t - pad.b;
    if (log) {
      const c = Math.max(v, floor);
      const f = (Math.log10(c) - Math.log10(floor)) / (Math.log10(top) - Math.log10(floor));
      return pad.t + inner - clamp(f, 0, 1) * inner;
    }
    return pad.t + inner - (Math.min(v, top) / top) * inner;
  };
  const path = (it: { v: number[] }) => it.v.map((v, i) => `${i ? "L" : "M"}${X(ticks[i]).toFixed(1)},${Y(v).toFixed(1)}`).join("");

  const yTicks = useMemo(() => {
    if (log) {
      const out: number[] = [];
      for (let e = Math.ceil(Math.log10(floor)); e <= Math.floor(Math.log10(top)); e++) out.push(Math.pow(10, e));
      return out;
    }
    return [0, 0.25, 0.5, 0.75, 1].map((f) => +(top * f).toPrecision(2));
  }, [log, top, floor]);

  const xTicks = useMemo(() => {
    const span = axis.end - axis.start;
    const raw = span / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const stepT = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
    const out: number[] = [];
    for (let t = Math.ceil(axis.start / stepT) * stepT; t <= axis.end; t += stepT) out.push(t);
    return out;
  }, [axis.start, axis.end]);

  const ghosts = spec.items.length <= 140;

  return (
    <div ref={wrapRef} className="dw-chartwrap">
      <svg width={w} height={h} role="img" aria-label={`${spec.title} a lo largo de ${axis.key}`}>
        {!bare &&
          yTicks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} className="dw-grid" />
              <text x={pad.l - 8} y={Y(t) + 3.5} textAnchor="end" className="dw-axis">
                {fmtVal(t)}
              </text>
            </g>
          ))}
        {!bare &&
          xTicks.map((t) => (
            <text key={t} x={X(t)} y={h - 7} textAnchor="middle" className="dw-axis">
              {t}
            </text>
          ))}
        {ghosts &&
          spec.items
            .filter((i) => !picked.includes(i.id))
            .map((i) => <path key={i.id} d={path(i)} fill="none" className="dw-ghost" onClick={() => onPick?.(i.id)} />)}
        <line x1={X(ticks[idx])} x2={X(ticks[idx])} y1={pad.t} y2={h - pad.b} className="dw-playhead" />
        {!bare && (
          <text x={X(ticks[idx])} y={pad.t - 5} textAnchor="middle" className="dw-axis dw-axis-strong">
            {ticks[idx]}
          </text>
        )}
        {picked.map((id, i) => {
          const it = spec.byId[id];
          if (!it) return null;
          const c = PALETTE[i % PALETTE.length];
          return (
            <g key={id}>
              <path d={path(it)} fill="none" stroke={c} strokeWidth="2.6" strokeLinejoin="round" />
              <circle cx={X(ticks[idx])} cy={Y(it.v[idx])} r="4.5" fill="#fff" stroke={c} strokeWidth="2.4" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Board({
  spec,
  facet,
  label,
  idx,
  picked,
  onPick,
  rowH = 34,
  big = false,
}: {
  spec: Spec;
  facet: string | null;
  label: string;
  idx: number;
  picked: string[];
  onPick?: (id: string) => void;
  rowH?: number;
  big?: boolean;
}) {
  const rows = useMemo(() => rankedAt(spec, idx, facet).slice(0, spec.topN), [spec, idx, facet]);
  const max = rows[0]?.v || 1;
  const hue = (id: string) => PALETTE[Math.max(0, spec.items.findIndex((i) => i.id === id)) % PALETTE.length];

  return (
    <div className="dw-board">
      {label && <div className="dw-boardlabel">{label}</div>}
      <div className="dw-rows" style={{ height: rowH * spec.topN }}>
        {rows.map((r, i) => {
          const pi = picked.indexOf(r.id);
          return (
            <button
              key={r.id}
              className={"dw-row" + (pi >= 0 ? " is-picked" : "") + (big ? " is-big" : "")}
              style={
                {
                  transform: `translateY(${i * rowH}px)`,
                  height: rowH - 4,
                  "--pc": pi >= 0 ? PALETTE[pi % PALETTE.length] : big ? hue(r.id) : "#2b3040",
                } as React.CSSProperties
              }
              onClick={() => onPick?.(r.id)}
            >
              <span className="dw-rank">{i + 1}</span>
              <span className="dw-bar" style={{ width: `${Math.max(3, (r.v / max) * 100)}%` }} />
              <span className="dw-rowname">
                {r.emblem && <b className="dw-emblem">{r.emblem}</b>}
                {r.label}
              </span>
              <span className="dw-val">{fmtVal(r.v)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Picker({ spec, picked, onPick }: { spec: Spec; picked: string[]; onPick: (id: string | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const full = picked.length >= MAX_PICKS;
  const groups: { id: string | null; label: string }[] = spec.facets.length ? spec.facets : [{ id: null, label: "" }];
  const match = (g: { id: string | null }) =>
    spec.items
      .filter((i) => (g.id ? i.facet === g.id : true))
      .filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => a.label.localeCompare(b.label));
  const hits = groups.reduce((n, g) => n + match(g).length, 0);

  return (
    <div className="dw-picker" ref={box}>
      <div className="dw-search">
        <span className="dw-mag">⌕</span>
        <input
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={`Buscar entre ${spec.items.length}`}
          aria-label="Buscar entradas para seguir"
        />
        {q && (
          <button className="dw-clear" onClick={() => setQ("")} aria-label="Limpiar búsqueda">
            ×
          </button>
        )}
      </div>
      <div className="dw-chips">
        {picked.map((id, i) => (
          <button key={id} className="dw-chip" style={{ borderColor: PALETTE[i % PALETTE.length] }} onClick={() => onPick(id)}>
            <span className="dw-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
            {spec.byId[id]?.label || id}
            <span className="dw-chip-x">×</span>
          </button>
        ))}
        {!picked.length && <span className="dw-hint">Nada seguido todavía. Busca, o toca una barra.</span>}
        {picked.length > 0 && (
          <button className="dw-clearall" onClick={() => onPick(null)}>
            Quitar todas
          </button>
        )}
      </div>
      {open && (
        <div className="dw-drop">
          {!hits ? (
            <div className="dw-empty">Nada coincide con «{q}».</div>
          ) : (
            <>
              {full && <div className="dw-empty">Seis curvas es el tope. Suelta una para añadir otra.</div>}
              {groups.map((g) => {
                const items = match(g);
                if (!items.length) return null;
                return (
                  <div className="dw-group" key={g.id || "all"}>
                    {g.label && <div className="dw-grouplabel">{g.label}</div>}
                    <div className="dw-opts">
                      {items.map((it) => {
                        const i = picked.indexOf(it.id);
                        const on = i >= 0;
                        return (
                          <button
                            key={it.id}
                            className={"dw-opt" + (on ? " is-on" : "")}
                            style={{ "--pc": on ? PALETTE[i % PALETTE.length] : "#c9cfdd" } as React.CSSProperties}
                            disabled={!on && full}
                            onClick={() => onPick(it.id)}
                          >
                            <span className="dw-tick">{on ? "✓" : "+"}</span>
                            {it.emblem} {it.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
