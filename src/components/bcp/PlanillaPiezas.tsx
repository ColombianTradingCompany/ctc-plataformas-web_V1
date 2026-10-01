"use client";

// ── Las piezas visuales de la planilla (V5.130, owner 2026-10-01) ────────────────────────────────────────────────────
// «No estamos usando la herramienta de la rueda combinada con granulometría, la CTCx Datasheet Tool.» La Datasheet Tool
// (`public/tools/green-datasheet/`) abre su hoja de Intrínsecos con un RADAR vivo de los atributos de taza junto al
// puntaje grande y su franja, y cierra con la granulometría. La planilla del Q-Grader era una columna de tablas con una
// lista de botones por rueda. Estas son esas piezas, nativas (React + SVG, sin iframe: la planilla es DUAL —SCA 2004 y
// CVA— y bilingüe, y la Datasheet Tool no lo es), leyendo la MISMA aritmética y la taxonomía única de la rueda:
//   · `RadarDeTaza`     el radar («spider») de la Datasheet Tool, para los diez atributos SCA o las ocho secciones CVA.
//   · `RuedaDeSabores`  la rueda de verdad: nueve familias dentro, sus descriptores fuera; se toca para marcar.
//   · `BarraDeMalla`    la barra de cada malla en la tabla de granulometría.

import { RUEDA } from "@/lib/catacion/rueda";
import type { IdiomaDePlanilla } from "@/lib/arena/planillaI18n";

// ── El radar ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type EjeDeRadar = { label: string; valor: number | null };

const R = 72;
const punto = (i: number, n: number, fraccion: number): [number, number] => {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [R * fraccion * Math.cos(a), R * fraccion * Math.sin(a)];
};
const corta = (label: string) => label.split("/")[0].split("(")[0].trim();

/** `min`–`max` es la escala del eje (6–10 en SCA 2004, 1–9 en CVA): el centro es `min`, el borde es `max`. */
export function RadarDeTaza({ ejes, min, max, color = "#3C0A86" }: { ejes: EjeDeRadar[]; min: number; max: number; color?: string }) {
  const n = ejes.length;
  const fraccion = (v: number) => Math.min(1, Math.max(0.04, (v - min) / (max - min)));
  const anillos = [0.25, 0.5, 0.75, 1];
  const hayDatos = ejes.some((e) => e.valor != null);
  const poligono = ejes.map((e, i) => punto(i, n, e.valor != null ? fraccion(e.valor) : 0.04).map((x) => x.toFixed(1)).join(",")).join(" ");
  return (
    <svg viewBox="-112 -98 224 196" role="img" aria-label={ejes.map((e) => `${e.label}: ${e.valor ?? "—"}`).join(", ")} style={{ width: "100%", maxWidth: 300, display: "block", margin: "0 auto" }}>
      {anillos.map((f) => (
        <polygon key={f} points={ejes.map((_, i) => punto(i, n, f).map((x) => x.toFixed(1)).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={f === 1 ? 1 : 0.6} />
      ))}
      {ejes.map((e, i) => {
        const [x, y] = punto(i, n, 1);
        const [lx, ly] = punto(i, n, 1.2);
        return (
          <g key={e.label}>
            <line x1={0} y1={0} x2={x} y2={y} stroke="var(--line)" strokeWidth={0.6} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={7.2} fill="var(--muted)">
              {corta(e.label)}
            </text>
          </g>
        );
      })}
      {hayDatos && <polygon points={poligono} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />}
      {ejes.map((e, i) => {
        if (e.valor == null) return null;
        const [x, y] = punto(i, n, fraccion(e.valor));
        return <circle key={e.label} cx={x} cy={y} r={2.4} fill={color} />;
      })}
      {/* La escala, sobre el eje de arriba: el centro y el borde. */}
      <text x={3} y={-R * 0.5 - 1} fontSize={5.6} fill="var(--muted)">{(min + (max - min) / 2).toString()}</text>
      <text x={3} y={-R - 1} fontSize={5.6} fill="var(--muted)">{max}</text>
    </svg>
  );
}

// ── La rueda ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const C = 240; // el centro del lienzo de 480
const R_CENTRO = 62;
const R_FAMILIA: [number, number] = [66, 138];
const R_DESCRIPTOR: [number, number] = [141, 236];

/** Cada familia con el índice de su primer descriptor: la rueda es estática, la posición se calcula una vez. */
const FAMILIAS_EN_LA_RUEDA = RUEDA.map((f, i) => ({ f, inicio: RUEDA.slice(0, i).reduce((s, x) => s + x.descriptores.length, 0) }));
const TOTAL_DESCRIPTORES = RUEDA.reduce((s, f) => s + f.descriptores.length, 0);

const polar = (r: number, grados: number): [number, number] => {
  const a = ((grados - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
/** Un sector de anillo entre dos radios y dos ángulos (grados, 0 = arriba, en sentido horario). */
function sector(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  const largo = a1 - a0 > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return `M${f(x0)},${f(y0)} A${r1},${r1} 0 ${largo} 1 ${f(x1)},${f(y1)} L${f(x2)},${f(y2)} A${r0},${r0} 0 ${largo} 0 ${f(x3)},${f(y3)} Z`;
}
/** Parte un rótulo largo en dos renglones: por « / » si lo trae; si no, por el espacio más cercano al medio. */
function renglones(texto: string, maximo: number): string[] {
  if (texto.length <= maximo) return [texto];
  if (texto.includes(" / ")) {
    const [a, b] = texto.split(" / ");
    return [`${a} /`, b];
  }
  const espacios = [...texto].map((ch, i) => (ch === " " ? i : -1)).filter((i) => i > 0);
  if (!espacios.length) return [texto];
  const medio = texto.length / 2;
  const corte = espacios.reduce((mejor, i) => (Math.abs(i - medio) < Math.abs(mejor - medio) ? i : mejor), espacios[0]);
  return [texto.slice(0, corte), texto.slice(corte + 1)];
}
/** El rótulo va sobre el radio: en la mitad derecha se lee hacia afuera; en la izquierda se voltea para no quedar de cabeza. */
function Rotulo({ texto, radio, angulo, size, color, bold, maximo }: { texto: string; radio: number; angulo: number; size: number; color: string; bold?: boolean; maximo: number }) {
  const lineas = renglones(texto, maximo);
  const izquierda = angulo > 180;
  const giro = angulo - 90 + (izquierda ? 180 : 0);
  const [x, y] = polar(radio, angulo);
  return (
    <text transform={`translate(${x.toFixed(2)},${y.toFixed(2)}) rotate(${giro.toFixed(2)})`} textAnchor="middle" fontSize={size} fontWeight={bold ? 800 : 500} fill={color} style={{ pointerEvents: "none", userSelect: "none" }}>
      {lineas.map((l, k) => (
        <tspan key={k} x={0} dy={k === 0 ? (lineas.length === 1 ? "0.35em" : "-0.2em") : "1.1em"}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

export function RuedaDeSabores({
  elegidos,
  onToggle,
  lang,
  disabled,
  rotuloCentro,
}: {
  elegidos: string[];
  onToggle: (id: string) => void;
  lang: IdiomaDePlanilla;
  disabled?: boolean;
  /** Lo que dice el centro bajo la cifra («elegidos» · «selected»). */
  rotuloCentro: string;
}) {
  const paso = 360 / TOTAL_DESCRIPTORES;
  const marcados = new Set(elegidos);
  return (
    <svg viewBox="0 0 480 480" role="group" aria-label={lang === "en" ? "Flavor wheel" : "Rueda de sabores"} style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}>
      {FAMILIAS_EN_LA_RUEDA.map(({ f, inicio }) => {
        const a0 = inicio * paso;
        const a1 = (inicio + f.descriptores.length) * paso;
        const algunoMarcado = f.descriptores.some((x) => marcados.has(x.id));
        return (
          <g key={f.id}>
            <path d={sector(R_FAMILIA[0], R_FAMILIA[1], a0 + 0.35, a1 - 0.35)} fill={f.color} fillOpacity={algunoMarcado ? 1 : 0.82} />
            <Rotulo texto={f[lang]} radio={(R_FAMILIA[0] + R_FAMILIA[1]) / 2} angulo={(a0 + a1) / 2} size={9.6} color="#fff" bold maximo={11} />
            {f.descriptores.map((x, k) => {
              const d0 = (inicio + k) * paso;
              const d1 = d0 + paso;
              const on = marcados.has(x.id);
              return (
                <g key={x.id}>
                  <path
                    d={sector(R_DESCRIPTOR[0], R_DESCRIPTOR[1], d0 + 0.35, d1 - 0.35)}
                    fill={f.color}
                    fillOpacity={on ? 1 : 0.14}
                    stroke={f.color}
                    strokeWidth={on ? 2 : 0.8}
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`${f[lang]} · ${x[lang]}`}
                    tabIndex={disabled ? -1 : 0}
                    onClick={() => !disabled && onToggle(x.id)}
                    onKeyDown={(e) => {
                      if (disabled || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      onToggle(x.id);
                    }}
                    style={{ cursor: disabled ? "default" : "pointer", outlineOffset: -2 }}
                  >
                    <title>{`${f[lang]} · ${x[lang]}`}</title>
                  </path>
                  <Rotulo texto={x[lang]} radio={(R_DESCRIPTOR[0] + R_DESCRIPTOR[1]) / 2} angulo={(d0 + d1) / 2} size={9.4} color={on ? "#fff" : "var(--ink)"} bold={on} maximo={15} />
                </g>
              );
            })}
          </g>
        );
      })}
      <circle cx={C} cy={C} r={R_CENTRO} fill="var(--paper)" stroke="var(--line)" strokeWidth={1.5} />
      <text x={C} y={C - 2} textAnchor="middle" fontSize={34} fontWeight={800} fill="var(--ink)">
        {elegidos.length}
      </text>
      <text x={C} y={C + 18} textAnchor="middle" fontSize={10} fill="var(--muted)">
        {rotuloCentro}
      </text>
    </svg>
  );
}

// ── La barra de una malla ────────────────────────────────────────────────────────────────────────────────────────────
export function BarraDeMalla({ pct, alerta }: { pct: number | null; alerta?: boolean }) {
  const ancho = pct == null ? 0 : Math.min(100, Math.max(0, pct));
  return (
    <div aria-hidden style={{ height: 10, borderRadius: 999, background: "var(--line)", overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${ancho}%`, height: "100%", borderRadius: 999, background: alerta ? "#C4402F" : "var(--primary, #3C0A86)", transition: "width .2s" }} />
    </div>
  );
}
