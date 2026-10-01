"use client";

// ── Las piezas visuales de la planilla (V5.130, owner 2026-10-01) ────────────────────────────────────────────────────
// «No estamos usando la herramienta de la rueda combinada con granulometría, la CTCx Datasheet Tool.» La Datasheet Tool
// (`public/tools/green-datasheet/`) abre su hoja de Intrínsecos con un RADAR vivo de los atributos de taza junto al
// puntaje grande y su franja, y cierra con la granulometría. La planilla del Q-Grader era una columna de tablas con una
// lista de botones por rueda. Estas son esas piezas, nativas (React + SVG, sin iframe: la planilla es DUAL —SCA 2004 y
// CVA— y bilingüe, y la Datasheet Tool no lo es), leyendo la MISMA aritmética y la taxonomía única de la rueda:
//   · `RadarDeTaza`     el radar («spider») de la Datasheet Tool, para los diez atributos SCA o las ocho secciones CVA.
//   · `RuedaDeSabores`  la Rueda del Café del taller, tal cual (V5.131): tres anillos y la banda; se marca en cualquier nivel.
//   · `BarraDeMalla`    la barra de cada malla en la tabla de granulometría.

import { useState } from "react";
import { RUEDA, idDeNota, rutaDe } from "@/lib/catacion/rueda";
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
// V5.131 (owner, 2026-10-01 — «deben ser iguales»): ESTA es la Rueda del Café del taller, no una parecida. La taxonomía
// es la de la herramienta (`rueda.ts` ← `ruedaDatos.ts`, generado de su HTML) y la geometría, los colores y las marcas
// están copiados de su «GEOMETRY ENGINE» y su «RENDER» (`public/tools/catacion/rueda-del-cafe-v23.html`):
//   · tres anillos — familia (icono) → subcategoría → nota — y la banda exterior con el nombre de la familia;
//   · el color de la familia, aclarado un 16 % en la subcategoría y un 34 % en la nota, y oscurecido un 22 % en la banda;
//   · se marca en CUALQUIER nivel, y cada marca deja su AGUJA del centro al borde, como en el «modo Catar».
// Lo que NO se trae: girar la rueda y la lupa (son de la exploración; aquí la rueda se pinta a tamaño de lectura y el
// renglón de arriba dice lo que hay bajo el cursor), el vapor animado, y la etapa e intensidad de cada marca.

const CX = 450;
const CY = 450;
const R0 = 60; // el núcleo
const R1 = 144; // familia
const R2 = 236; // subcategoría
const R3 = 362; // nota
const OB0 = 372; // la banda exterior
const OB1 = 420;
const GAP_FAM = 0.55;
const GAP_SUB = 0.28;
const GAP_LEAF = 0.12;
const MORADO = "#2c1a52"; // `--purple-deep` de la herramienta: el trazo de las marcas y las agujas

const polar = (r: number, grados: number): [number, number] => {
  const a = ((grados - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
/** Un sector de anillo entre dos radios y dos ángulos (grados, 0 = arriba, en sentido horario). */
function sector(rInterno: number, rExterno: number, a0: number, a1: number): string {
  const largo = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = polar(rExterno, a0);
  const [x2, y2] = polar(rExterno, a1);
  const [x3, y3] = polar(rInterno, a1);
  const [x4, y4] = polar(rInterno, a0);
  const f = (n: number) => n.toFixed(2);
  return `M ${f(x1)} ${f(y1)} A ${rExterno} ${rExterno} 0 ${largo} 1 ${f(x2)} ${f(y2)} L ${f(x3)} ${f(y3)} A ${rInterno} ${rInterno} 0 ${largo} 0 ${f(x4)} ${f(y4)} Z`;
}
/** `pct` de −1 a 1: negativo oscurece, positivo aclara (la `shade` de la herramienta). */
function matiz(hex: string, pct: number): string {
  const n = hex.replace("#", "");
  const mezcla = (c: number) => Math.round(c + ((pct >= 0 ? 255 : 0) - c) * Math.abs(pct));
  return `#${[0, 2, 4].map((i) => mezcla(parseInt(n.slice(i, i + 2), 16)).toString(16).padStart(2, "0")).join("")}`;
}
/** Tinta oscura o blanco, lo que más contraste con el fondo del sector. */
function tintaSobre(hex: string): string {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#211632" : "#ffffff";
}

/** Cada familia, subcategoría y nota con su arco: la rueda es estática, los ángulos se calculan una vez. */
const TOTAL_DE_NOTAS = RUEDA.reduce((n, f) => n + f.subs.reduce((m, sub) => m + sub.hojas.length, 0), 0);
const GRADOS_POR_NOTA = 360 / TOTAL_DE_NOTAS;
const ARCOS = (() => {
  let cursor = 0;
  return RUEDA.map((f) => {
    const a0 = cursor;
    const subs = f.subs.map((sub) => {
      const s0 = cursor;
      const hojas = sub.hojas.map((h) => {
        const h0 = cursor;
        cursor += GRADOS_POR_NOTA;
        return { h, id: idDeNota(sub.id, h.id), a0: h0, a1: cursor };
      });
      return { sub, a0: s0, a1: cursor, hojas };
    });
    return { f, a0, a1: cursor, subs };
  });
})();

/** Hacia dónde apunta la aguja de una marca: el medio de su arco, en el borde de su anillo. */
function blancoDe(id: string): { angulo: number; radio: number; color: string } | null {
  for (const fam of ARCOS) {
    if (fam.f.id === id) return { angulo: (fam.a0 + fam.a1) / 2, radio: R1, color: fam.f.color };
    for (const sub of fam.subs) {
      if (sub.sub.id === id) return { angulo: (sub.a0 + sub.a1) / 2, radio: R2, color: fam.f.color };
      for (const hoja of sub.hojas) if (hoja.id === id) return { angulo: (hoja.a0 + hoja.a1) / 2, radio: R3, color: fam.f.color };
    }
  }
  return null;
}

/** El rótulo de un sector: radial (sobre el radio) o tangencial (la banda). Nunca queda de cabeza. */
function Etiqueta({ texto, radio, a0, a1, tipo, fill, size, weight, banda }: { texto: string; radio: number; a0: number; a1: number; tipo: "radial" | "tangencial"; fill: string; size: number; weight: number; banda?: boolean }) {
  const medio = (a0 + a1) / 2;
  const [x, y] = polar(radio, medio);
  const base = tipo === "tangencial" ? medio : medio - 90;
  const total = ((base % 360) + 360) % 360;
  const giro = total > 90 && total < 270 ? base + 180 : base;
  return (
    <text
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${giro.toFixed(2)})`}
      textAnchor="middle"
      dominantBaseline="central"
      fill={fill}
      fontSize={size}
      fontWeight={weight}
      stroke="rgba(0,0,0,.15)"
      strokeWidth={0.4}
      style={{ pointerEvents: "none", userSelect: "none", paintOrder: "stroke", ...(banda ? { fontFamily: "ui-monospace, 'JetBrains Mono', monospace", letterSpacing: ".05em", textTransform: "uppercase" as const } : {}) }}
    >
      {texto}
    </text>
  );
}

export function RuedaDeSabores({
  elegidos,
  onToggle,
  lang,
  disabled,
  rotuloCentro,
  pista,
}: {
  elegidos: string[];
  onToggle: (id: string) => void;
  lang: IdiomaDePlanilla;
  disabled?: boolean;
  /** El rótulo del núcleo: «CENTRO → BORDE» · «CENTER → EDGE». */
  rotuloCentro: string;
  /** Lo que dice el renglón de lectura cuando el cursor no está sobre la rueda. */
  pista: string;
}) {
  const [bajoElCursor, setBajoElCursor] = useState<string | null>(null);
  const marcados = new Set(elegidos);

  // Un sector de cualquier nivel: se marca al tocarlo (o con Enter / espacio) y avisa qué hay bajo el cursor.
  const sectorMarcable = (id: string, d: string, fill: string, clave: string) => {
    const on = marcados.has(id);
    return (
      <path
        key={clave}
        d={d}
        fill={fill}
        stroke={on ? MORADO : "#ffffff"}
        strokeWidth={on ? 5 : 1.6}
        role="checkbox"
        aria-checked={on}
        aria-label={rutaDe(id, lang)}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onToggle(id)}
        onKeyDown={(e) => {
          if (disabled || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          onToggle(id);
        }}
        onMouseEnter={() => setBajoElCursor(id)}
        onMouseLeave={() => setBajoElCursor((actual) => (actual === id ? null : actual))}
        onFocus={() => setBajoElCursor(id)}
        style={{
          cursor: disabled ? "default" : "pointer",
          outline: "none",
          filter: on ? "saturate(1.35) brightness(1.02) drop-shadow(0 0 7px rgba(75,42,134,.55))" : bajoElCursor === id ? "brightness(1.1) saturate(1.12)" : undefined,
          transition: "filter .18s ease, stroke .18s ease, stroke-width .18s ease",
        }}
      />
    );
  };

  const familiaBajoElCursor = bajoElCursor ? ARCOS.find((fam) => fam.f.id === bajoElCursor || fam.subs.some((sub) => sub.sub.id === bajoElCursor || sub.hojas.some((h) => h.id === bajoElCursor))) : null;

  return (
    <div>
      {/* El renglón de lectura: lo que hay bajo el cursor, del centro al borde (hace las veces de la lupa de la herramienta). */}
      <div aria-live="polite" style={{ minHeight: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
        {bajoElCursor && familiaBajoElCursor ? (
          <>
            <span aria-hidden style={{ width: 12, height: 12, borderRadius: "50%", background: familiaBajoElCursor.f.color, flex: "0 0 auto" }} />
            {rutaDe(bajoElCursor, lang)}
          </>
        ) : (
          <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--muted)" }}>{pista}</span>
        )}
      </div>
      <svg viewBox="22 22 856 856" role="group" aria-label={lang === "en" ? "Coffee flavor wheel" : "Rueda del sabor del café"} style={{ width: "100%", display: "block", margin: "0 auto" }}>
        {ARCOS.map((fam) => {
          const colorSub = matiz(fam.f.color, 0.16);
          const colorNota = matiz(fam.f.color, 0.34);
          const [ix, iy] = polar((R0 + R1) / 2, (fam.a0 + fam.a1) / 2);
          return (
            <g key={fam.f.id}>
              {/* Nivel 1 — el icono (el nombre ya va escrito en la banda exterior). */}
              {sectorMarcable(fam.f.id, sector(R0, R1, fam.a0 + GAP_FAM / 2, fam.a1 - GAP_FAM / 2), fam.f.color, "n1")}
              <text x={ix} y={iy} textAnchor="middle" dominantBaseline="central" fontSize={26} style={{ pointerEvents: "none", userSelect: "none" }}>
                {fam.f.icono}
              </text>
              {fam.subs.map((sub) => (
                <g key={sub.sub.id}>
                  {sectorMarcable(sub.sub.id, sector(R1, R2, sub.a0 + GAP_SUB / 2, sub.a1 - GAP_SUB / 2), colorSub, "n2")}
                  {sub.a1 - sub.a0 > 9 && <Etiqueta texto={sub.sub[lang]} radio={(R1 + R2) / 2} a0={sub.a0} a1={sub.a1} tipo="radial" fill={tintaSobre(colorSub)} size={11.5} weight={700} />}
                  {sub.hojas.map((hoja) => (
                    <g key={hoja.id}>
                      {sectorMarcable(hoja.id, sector(R2, R3, hoja.a0 + GAP_LEAF / 2, hoja.a1 - GAP_LEAF / 2), colorNota, "n3")}
                      {hoja.a1 - hoja.a0 > 3.4 && <Etiqueta texto={hoja.h[lang]} radio={(R2 + R3) / 2 + 4} a0={hoja.a0} a1={hoja.a1} tipo="radial" fill={tintaSobre(colorNota)} size={10} weight={600} />}
                    </g>
                  ))}
                </g>
              ))}
            </g>
          );
        })}

        {/* La banda exterior repite el nombre de cada familia: quien lee de afuera hacia adentro la identifica sin mirar el centro. */}
        {ARCOS.map((fam) => {
          const colorBanda = matiz(fam.f.color, -0.22);
          return (
            <g key={fam.f.id}>
              {sectorMarcable(fam.f.id, sector(OB0, OB1, fam.a0 + GAP_FAM / 2, fam.a1 - GAP_FAM / 2), colorBanda, "banda")}
              {fam.a1 - fam.a0 > 6 && <Etiqueta texto={fam.f[lang]} radio={(OB0 + OB1) / 2} a0={fam.a0} a1={fam.a1} tipo="tangencial" fill={tintaSobre(colorBanda)} size={13} weight={700} banda />}
            </g>
          );
        })}

        {/* Las agujas: cada marca, del centro al borde de su anillo. */}
        <g style={{ pointerEvents: "none" }}>
          {elegidos.map((id) => {
            const blanco = blancoDe(id);
            if (!blanco) return null;
            const [tx, ty] = polar(blanco.radio + 16, blanco.angulo);
            return (
              <g key={id} style={{ filter: "drop-shadow(0 1px 2px rgba(43,26,82,.35))" }}>
                <line x1={CX} y1={CY} x2={tx} y2={ty} stroke={MORADO} strokeWidth={3} strokeLinecap="round" />
                <circle cx={tx} cy={ty} r={6} fill={blanco.color} stroke={MORADO} strokeWidth={2.5} />
              </g>
            );
          })}
        </g>

        {/* El núcleo. */}
        <circle cx={CX} cy={CY} r={R0} fill="#f5f2fc" stroke="#e6e1f2" strokeWidth={1.5} style={{ pointerEvents: "none" }} />
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize={36} style={{ pointerEvents: "none", userSelect: "none" }}>
          ☕
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize={9.5} fill="#8b84a0" style={{ pointerEvents: "none", fontFamily: "ui-monospace, 'JetBrains Mono', monospace", letterSpacing: ".08em" }}>
          {rotuloCentro}
        </text>
      </svg>
    </div>
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
