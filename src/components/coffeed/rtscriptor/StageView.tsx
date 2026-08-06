"use client";

// ── El espacio de la toma, en vivo ───────────────────────────────────────────
// Pinta las MISMAS primitivas que el servidor serializa al revelar (ver
// `stage.ts`), así que lo que se ve aquí es literalmente lo que sale en el
// fotograma. Mover un mando recompone el cuadro al instante — no hay ningún
// paso intermedio ni ninguna llamada.

import { useMemo } from "react";
import { composeStage, type StageInput } from "./stage";

export function StageView({
  input,
  selected,
  onSelect,
  showGuides = true,
}: {
  input: StageInput;
  selected?: string | null;
  onSelect?: (id: string) => void;
  showGuides?: boolean;
}) {
  const draw = useMemo(() => composeStage(input), [input]);

  return (
    <div className="rt-stage">
      <svg viewBox={`0 0 ${draw.w} ${draw.h}`} width="100%" style={{ display: "block" }}>
        {draw.prims.map((p, i) => {
          if (p.k === "rect") return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.fill} opacity={p.opacity} />;
          if (p.k === "circle")
            return <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.fill ?? "none"} stroke={p.stroke ?? "none"} strokeWidth={p.w ?? 1} opacity={p.opacity} />;
          if (p.k === "poly")
            return (
              <polyline
                key={i}
                points={p.pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={p.stroke}
                strokeWidth={p.w}
                strokeLinecap="round"
                opacity={p.opacity}
              />
            );
          return (
            <text key={i} x={p.x} y={p.y} fill={p.fill} fontSize={p.size} textAnchor={p.anchor} fontFamily="ui-monospace, monospace">
              {p.text}
            </text>
          );
        })}

        {/* Guías de encuadre: tercios y centro. Se apagan, porque a veces
            estorban, pero por defecto están — componer sin ellas es adivinar. */}
        {showGuides && (
          <g stroke="#EDE9DF" strokeWidth="1" opacity=".14">
            <line x1={draw.w / 3} y1="0" x2={draw.w / 3} y2={draw.h} />
            <line x1={(draw.w * 2) / 3} y1="0" x2={(draw.w * 2) / 3} y2={draw.h} />
            <line x1="0" y1={draw.h / 3} x2={draw.w} y2={draw.h / 3} />
            <line x1="0" y1={(draw.h * 2) / 3} x2={draw.w} y2={(draw.h * 2) / 3} />
          </g>
        )}

        {/* Los personajes se pueden pulsar en el propio cuadro para elegirlos:
            señalar a quien quieres mover es más rápido que buscarlo en una lista. */}
        {draw.hits.map((hit) => (
          <g key={`${hit.kind}-${hit.id}`} style={{ cursor: onSelect ? "pointer" : "default" }} onClick={() => onSelect?.(hit.id)}>
            <circle cx={hit.x} cy={hit.y} r={Math.max(hit.r * 1.9, 16)} fill="transparent" />
            {selected === hit.id && (
              <circle cx={hit.x} cy={hit.y} r={Math.max(hit.r * 1.7, 14)} fill="none" stroke="#4DD0C4" strokeWidth="2" strokeDasharray="4 4" />
            )}
            <text
              x={hit.x}
              y={hit.y - Math.max(hit.r * 1.9, 18)}
              textAnchor="middle"
              fontSize={Math.round(draw.h * (hit.kind === "prop" ? 0.024 : 0.03))}
              fill="#EDE9DF"
              opacity={hit.kind === "prop" ? 0.5 : 0.75}
              fontFamily="ui-monospace, monospace"
            >
              {hit.label}
            </text>
          </g>
        ))}
      </svg>

      {draw.notes.length > 0 && (
        <div className="rt-stagenotes">
          {draw.notes.slice(0, 3).map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}
