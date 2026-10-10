// V5.166: las figuras del dossier CTCx. SVG en línea y sin librerías: se imprimen idénticas a como se ven y no cargan nada
// del cliente. Los colores de los datos son los de la marca (morado CTCx) y, en la escala, los de cada grado.
import { BANDAS_PUNTOS, PUNTOS_MAX, PUNTOS_MIN } from "@/lib/pvc/escala";

export const MORADO = "#3D0A8A";
export const MORADO_TINTE = "#EEE8F8";
export const TINTA = "#17121F";
export const TINTA_SUAVE = "#5B5568";
export const LINEA = "#E2DEE9";

const fmt = (n: number, d = 1, loc = "es-CO") => n.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d });

/** El radar de los atributos de taza, en la escala del formulario (6 a 10). */
export function Radar({ items, min = 6, max = 10, size = 300 }: { items: { label: string; v: number }[]; min?: number; max?: number; size?: number }) {
  const n = items.length;
  if (n < 3) return null;
  const R = 100;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (R * (Math.min(max, Math.max(min, v)) - min)) / (max - min);
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  };
  const anillos = Array.from({ length: max - min + 1 }, (_, k) => min + k);
  const poly = items.map((it, i) => pt(i, it.v).join(",")).join(" ");
  return (
    <svg viewBox="-150 -132 300 264" width={size} role="img" aria-label="Radar" style={{ display: "block", maxWidth: "100%", height: "auto" }}>
      {anillos.map((v) => (
        <polygon key={v} points={items.map((_, i) => pt(i, v).join(",")).join(" ")} fill="none" stroke={LINEA} strokeWidth={v === max ? 1.2 : 0.7} />
      ))}
      {anillos.slice(1, -1).map((v) => {
        const [x, y] = pt(0.5, v);
        return (
          <text key={`t${v}`} x={x} y={y} fontSize={6.5} fill={TINTA_SUAVE} textAnchor="middle" dominantBaseline="middle">
            {v}
          </text>
        );
      })}
      {items.map((it, i) => {
        const [x, y] = pt(i, max);
        const [lx, ly] = pt(i, max + (max - min) * 0.2);
        const anchor = Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end";
        return (
          <g key={it.label}>
            <line x1={0} y1={0} x2={x} y2={y} stroke={LINEA} strokeWidth={0.7} />
            <text x={lx} y={ly} fontSize={8.6} fill={TINTA} textAnchor={anchor} dominantBaseline="middle">
              {it.label}
            </text>
          </g>
        );
      })}
      <polygon points={poly} fill={MORADO} fillOpacity={0.14} stroke={MORADO} strokeWidth={1.8} strokeLinejoin="round" />
      {items.map((it, i) => {
        const [x, y] = pt(i, it.v);
        return <circle key={i} cx={x} cy={y} r={2.6} fill={MORADO} />;
      })}
    </svg>
  );
}

// ── V5.197 (owner, 2026-10-10): «las barras de la Evaluación afectiva reemplazarlas por la gráfica de telaraña de 8 esquinas
//    de CVA» y la intensidad de la descriptiva mejor visualizada ──────────────────────────────────────────────────────

const f2 = (n: number) => n.toFixed(2);

/**
 * La telaraña de 8 esquinas del CVA (la evaluación afectiva, escala de 1 a 9). Octógono de cara plana arriba y abajo, un
 * anillo por punto de la escala —el 5, «ni alta ni baja», punteado; el 9, el borde—, y en cada esquina el atributo con su
 * valor. El 1 está en el centro: un atributo bajo se ve hundido, no escondido.
 */
export function RadarCva({ items, etiqueta, loc = "es-CO" }: { items: { label: string; v: number }[]; etiqueta: string; loc?: string }) {
  const n = items.length;
  if (n < 3) return null;
  const R = 104;
  const MIN = 1;
  const MAX = 9;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2 + Math.PI / n;
  const pt = (i: number, v: number) => {
    const r = (R * (Math.min(MAX, Math.max(MIN, v)) - MIN)) / (MAX - MIN);
    return [r * Math.cos(ang(i)), r * Math.sin(ang(i))] as const;
  };
  const anillo = (v: number) => items.map((_, i) => pt(i, v).map(f2).join(",")).join(" ");
  const valor = (v: number) => v.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Un rótulo largo («Sensación en boca», «Impresión general») va en dos renglones: así la telaraña ocupa el ancho y no los rótulos.
  const renglones = (s: string): string[] => {
    if (s.length <= 11 || !s.includes(" ")) return [s];
    const medio = s.length / 2;
    const cortes = [...s.matchAll(/ /g)].map((m) => m.index ?? 0);
    const corte = cortes.reduce((a, b) => (Math.abs(b - medio) < Math.abs(a - medio) ? b : a), cortes[0]);
    return [s.slice(0, corte), s.slice(corte + 1)];
  };
  return (
    <svg viewBox="-182 -146 364 292" width="100%" role="img" aria-label={etiqueta} style={{ display: "block" }}>
      <polygon points={anillo(MAX)} fill="#FAF8FD" stroke="none" />
      {[2, 3, 4, 5, 6, 7, 8, 9].map((v) => (
        <polygon
          key={v}
          points={anillo(v)}
          fill="none"
          stroke={v === 5 ? TINTA_SUAVE : LINEA}
          strokeOpacity={v === 5 ? 0.6 : 1}
          strokeWidth={v === MAX ? 1.3 : 0.7}
          strokeDasharray={v === 5 ? "3 2.6" : undefined}
        />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, MAX);
        return <line key={i} x1={0} y1={0} x2={f2(x)} y2={f2(y)} stroke={LINEA} strokeWidth={0.7} />;
      })}
      {[3, 5, 7, 9].map((v) => (
        <text
          key={v}
          x={0}
          y={f2(-((R * (v - MIN)) / (MAX - MIN)) * Math.cos(Math.PI / n) + 2.4)}
          fontSize={6.6}
          fill={TINTA_SUAVE}
          textAnchor="middle"
          stroke="#FAF8FD"
          strokeWidth={2.6}
          paintOrder="stroke"
        >
          {v}
        </text>
      ))}
      <polygon points={items.map((it, i) => pt(i, it.v).map(f2).join(",")).join(" ")} fill={MORADO} fillOpacity={0.16} stroke={MORADO} strokeWidth={2} strokeLinejoin="round" />
      {items.map((it, i) => {
        const [x, y] = pt(i, it.v);
        return <circle key={i} cx={f2(x)} cy={f2(y)} r={3.1} fill="#fff" stroke={MORADO} strokeWidth={1.8} />;
      })}
      {items.map((it, i) => {
        const a = ang(i);
        const lx = (R + 10) * Math.cos(a);
        const ly = (R + 10) * Math.sin(a);
        const anchor = Math.cos(a) > 0.1 ? "start" : Math.cos(a) < -0.1 ? "end" : "middle";
        const lineas = renglones(it.label);
        // El bloque (nombre en uno o dos renglones + valor) se apoya en la esquina: por encima en las de arriba, por debajo en
        // las de abajo, centrado en las de los lados.
        const alto = lineas.length * 10.5 + 12;
        const y0 = Math.sin(a) < -0.5 ? ly - alto + 8 : Math.sin(a) > 0.5 ? ly + 9 : ly - alto / 2 + 8;
        return (
          <g key={it.label}>
            {lineas.map((l, k) => (
              <text key={l} x={f2(lx)} y={f2(y0 + k * 10.5)} fontSize={9.2} fontWeight={600} fill={TINTA} textAnchor={anchor}>
                {l}
              </text>
            ))}
            <text x={f2(lx)} y={f2(y0 + lineas.length * 10.5 + 2)} fontSize={11} fontWeight={700} fill={MORADO} textAnchor={anchor} style={{ fontFamily: "var(--font-spline-mono), monospace" }}>
              {valor(it.v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** El color de una familia, más oscuro (para el trazo de su ícono, que sobre su tinte claro tiene que leerse). */
export function oscurece(hex: string, k = 0.25): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.round(x * (1 - k)));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * La intensidad de la descriptiva (0 a 15 en pasos de 0,5) en 15 casillas, con las tres zonas de la escala separadas:
 * baja (0–4), media (5–9) y alta (10–15). Lo vacío se tiñe un poco más en cada zona; lo lleno, del color de la nota.
 */
export function BarraDeIntensidad({ valor, color, etiqueta }: { valor: number; color: string; etiqueta?: string }) {
  const N = 15;
  const G = 1.1;
  const ZONA = 1.4;
  const W = 96;
  const w = (W - G * (N - 1) - ZONA * 2) / N;
  const v = Math.min(N, Math.max(0, valor));
  const x = (k: number) => k * (w + G) + (k >= 5 ? ZONA : 0) + (k >= 10 ? ZONA : 0);
  const vacio = (k: number) => (k < 5 ? "#EFECF4" : k < 10 ? "#E6E1EE" : "#DCD6E6");
  return (
    <svg viewBox={`0 0 ${W} 7`} width="100%" role={etiqueta ? "img" : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true} style={{ display: "block" }}>
      {Array.from({ length: N }, (_, k) => (
        <g key={k}>
          <rect x={f2(x(k))} y={0} width={f2(w)} height={7} fill={vacio(k)} />
          {v > k && <rect x={f2(x(k))} y={0} width={f2(w * Math.min(1, v - k))} height={7} fill={color} />}
        </g>
      ))}
    </svg>
  );
}

/** La escala CTC de 1.000 a 2.500 puntos, con las cinco bandas y el lote marcado. */
export function EscalaCtc({ puntos, etiqueta, loc = "es-CO" }: { puntos: number | null; etiqueta: string; loc?: string }) {
  const W = 600;
  const x = (p: number) => ((p - PUNTOS_MIN) / (PUNTOS_MAX - PUNTOS_MIN)) * W;
  const marca = puntos != null ? Math.min(W, Math.max(0, x(puntos))) : null;
  return (
    <svg viewBox={`-10 -34 ${W + 20} 84`} width="100%" role="img" aria-label={etiqueta} style={{ display: "block" }}>
      {BANDAS_PUNTOS.map((b) => (
        <g key={b.id}>
          <rect x={x(b.min)} y={0} width={x(Math.min(b.max + 1, PUNTOS_MAX)) - x(b.min)} height={16} fill={b.hex} />
          <text x={(x(b.min) + x(Math.min(b.max + 1, PUNTOS_MAX))) / 2} y={11.5} fontSize={9} fill="#fff" textAnchor="middle" fontWeight={700} letterSpacing=".06em">
            {b.nombre.toUpperCase()}
          </text>
          <text x={x(b.min)} y={30} fontSize={8} fill={TINTA_SUAVE} textAnchor={b.min === PUNTOS_MIN ? "start" : "middle"}>
            {b.min.toLocaleString(loc)}
          </text>
        </g>
      ))}
      <text x={W} y={30} fontSize={8} fill={TINTA_SUAVE} textAnchor="end">
        {PUNTOS_MAX.toLocaleString(loc)}
      </text>
      {marca != null && (
        <g>
          <line x1={marca} y1={-8} x2={marca} y2={22} stroke={TINTA} strokeWidth={2} />
          <polygon points={`${marca - 6},-14 ${marca + 6},-14 ${marca},-6`} fill={TINTA} />
          <text x={marca} y={-19} fontSize={11} fontWeight={700} fill={TINTA} textAnchor={marca < 40 ? "start" : marca > W - 40 ? "end" : "middle"}>
            {Math.round(puntos!).toLocaleString(loc)}
          </text>
        </g>
      )}
    </svg>
  );
}

/** Lo que pasa con la muestra: pergamino → verde + merma → grano sano + defectos. Tres barras a la misma escala. */
export function Rendimiento({
  pesos,
  t,
  loc = "es-CO",
}: {
  pesos: { pergamino: number; verde: number; merma: number; primario: number; secundario: number; sano: number };
  t: { pergamino: string; merma: string; verde: string; defPrim: string; defSec: string; sano: string };
  loc?: string;
}) {
  const W = 600;
  const k = W / pesos.pergamino;
  const pct = (g: number) => `${fmt((g / pesos.pergamino) * 100, 1, loc)} %`;
  const fila = (y: number, partes: { g: number; color: string; label: string; claro?: boolean }[]) => {
    let acc = 0;
    return partes.map((p) => {
      const x0 = acc;
      const w = Math.max(0, p.g * k);
      acc += w;
      const cabe = w > `${p.label} · ${fmt(p.g, 1, loc)} g`.length * 5.6 + 14;
      return (
        <g key={p.label}>
          <rect x={x0} y={y} width={w} height={26} fill={p.color} />
          {cabe ? (
            <text x={x0 + 8} y={y + 17} fontSize={9.5} fill={p.claro ? TINTA : "#fff"} fontWeight={600}>
              {p.label} · {fmt(p.g, 1, loc)} g
            </text>
          ) : null}
        </g>
      );
    });
  };
  const defectos = pesos.primario + pesos.secundario;
  return (
    <svg viewBox={`0 -4 ${W} 160`} width="100%" role="img" aria-label={t.sano} style={{ display: "block" }}>
      {fila(0, [{ g: pesos.pergamino, color: "#8C6A3F", label: t.pergamino }])}
      {fila(44, [
        { g: pesos.verde, color: "#4F7A3A", label: t.verde },
        { g: pesos.merma, color: LINEA, label: t.merma, claro: true },
      ])}
      {fila(88, [
        { g: pesos.sano, color: MORADO, label: t.sano },
        { g: pesos.primario, color: "#C8102E", label: t.defPrim },
        { g: pesos.secundario, color: "#E8A33D", label: t.defSec },
      ])}
      {/* Las cotas de lo que no cabe dentro de su barra. */}
      <text x={W} y={44 + 40} fontSize={8.5} fill={TINTA_SUAVE} textAnchor="end">
        {t.merma} {fmt(pesos.merma, 1, loc)} g ({pct(pesos.merma)})
      </text>
      <text x={W} y={88 + 40} fontSize={8.5} fill={TINTA_SUAVE} textAnchor="end">
        {t.defPrim} {fmt(pesos.primario, 1, loc)} g · {t.defSec} {fmt(pesos.secundario, 1, loc)} g ({pct(defectos)})
      </text>
      <text x={0} y={88 + 40} fontSize={8.5} fill={TINTA_SUAVE}>
        {t.sano} {pct(pesos.sano)}
      </text>
    </svg>
  );
}

/** La granulometría: el porcentaje del verde que queda en cada malla. */
export function Mallas({ mallas, loc = "es-CO" }: { mallas: { malla: string; pct: number; gramos: number }[]; loc?: string }) {
  if (!mallas.length) return null;
  const W = 300;
  const H = 120;
  const max = Math.max(...mallas.map((m) => m.pct), 1);
  const bw = W / mallas.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 46}`} width="100%" role="img" aria-label="Granulometría" style={{ display: "block" }}>
      <line x1={0} y1={H} x2={W} y2={H} stroke={TINTA} strokeWidth={0.8} />
      {mallas.map((m, i) => {
        const h = (m.pct / max) * (H - 18);
        const x = i * bw + bw * 0.16;
        const w = bw * 0.68;
        const corto = m.malla.replace(/\s*\(.*\)/, "");
        const sub = (m.malla.match(/\((.*)\)/) ?? [])[1] ?? "";
        return (
          <g key={m.malla}>
            <rect x={x} y={H - h} width={w} height={h} fill={i === mallas.length - 1 ? LINEA : MORADO} />
            <text x={x + w / 2} y={H - h - 4} fontSize={8} fill={TINTA} textAnchor="middle" fontWeight={600}>
              {fmt(m.pct, 1, loc)}%
            </text>
            <text x={x + w / 2} y={H + 12} fontSize={7.4} fill={TINTA} textAnchor="middle">
              {corto}
            </text>
            {sub && (
              <text x={x + w / 2} y={H + 22} fontSize={6.8} fill={TINTA_SUAVE} textAnchor="middle">
                {sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Un medidor lineal: la escala, el rango que se espera (sombreado) y el valor del lote. */
export function Medidor({ valor, min, max, rango, decimales = 1, unidad = "", loc = "es-CO" }: { valor: number; min: number; max: number; rango?: [number, number]; decimales?: number; unidad?: string; loc?: string }) {
  const W = 200;
  const x = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * W;
  return (
    <svg viewBox={`0 -16 ${W} 40`} width="100%" role="img" aria-label={`${valor}${unidad}`} style={{ display: "block" }}>
      <rect x={0} y={0} width={W} height={6} fill={LINEA} />
      {rango && <rect x={x(rango[0])} y={0} width={x(rango[1]) - x(rango[0])} height={6} fill={MORADO} fillOpacity={0.28} />}
      <line x1={x(valor)} y1={-5} x2={x(valor)} y2={11} stroke={MORADO} strokeWidth={2.4} />
      <text x={0} y={20} fontSize={7.5} fill={TINTA_SUAVE}>
        {min.toLocaleString(loc, { maximumFractionDigits: decimales })}
      </text>
      <text x={W} y={20} fontSize={7.5} fill={TINTA_SUAVE} textAnchor="end">
        {max.toLocaleString(loc, { maximumFractionDigits: decimales })}
      </text>
    </svg>
  );
}

/**
 * La rueda del sabor reducida a sus familias: un anillo por familia (su color) y, hacia afuera, cada nota marcada en el
 * ángulo de su familia y a la distancia de su intensidad (0 en el anillo, 15 en el borde). Las notas de defecto llevan
 * borde rojo.
 */
export function RuedaFamilias({
  familias,
  marcas,
}: {
  familias: { id: string; nombre: string; color: string }[];
  marcas: { familiaId: string; nota: string; intensidad: number; defecto: boolean }[];
}) {
  const n = familias.length;
  if (!n) return null;
  const R0 = 34;
  const R1 = 54;
  const RMAX = 112;
  const arco = (Math.PI * 2) / n;
  const ang = (i: number) => i * arco - Math.PI / 2;
  const xy = (a: number, r: number) => [r * Math.cos(a), r * Math.sin(a)] as const;
  const sector = (i: number) => {
    const a0 = ang(i) + 0.012;
    const a1 = ang(i + 1) - 0.012;
    const [x0, y0] = xy(a0, R1);
    const [x1, y1] = xy(a1, R1);
    const [x2, y2] = xy(a1, R0);
    const [x3, y3] = xy(a0, R0);
    return `M${x0},${y0} A${R1},${R1} 0 0 1 ${x1},${y1} L${x2},${y2} A${R0},${R0} 0 0 0 ${x3},${y3} Z`;
  };
  // Las marcas de una misma familia se reparten dentro de su arco.
  const porFamilia = new Map<string, typeof marcas>();
  for (const m of marcas) porFamilia.set(m.familiaId, [...(porFamilia.get(m.familiaId) ?? []), m]);
  return (
    <svg viewBox="-160 -136 320 272" width="100%" role="img" aria-label="Rueda del sabor" style={{ display: "block" }}>
      {[5, 10, 15].map((v) => (
        <circle key={v} cx={0} cy={0} r={R1 + ((RMAX - R1) * v) / 15} fill="none" stroke={LINEA} strokeWidth={0.7} strokeDasharray={v === 15 ? undefined : "2 3"} />
      ))}
      {familias.map((f, i) => {
        const activa = porFamilia.has(f.id);
        const [lx, ly] = xy(ang(i) + arco / 2, (R0 + R1) / 2);
        return (
          <g key={f.id}>
            <path d={sector(i)} fill={f.color} fillOpacity={activa ? 1 : 0.28} />
            <text x={lx} y={ly} fontSize={6.8} fill={activa ? "#fff" : TINTA_SUAVE} textAnchor="middle" dominantBaseline="middle" fontWeight={700}>
              {f.nombre.split(/[ /]/)[0].slice(0, 9)}
            </text>
          </g>
        );
      })}
      {familias.map((f, i) =>
        (porFamilia.get(f.id) ?? []).map((m, j, arr) => {
          const a = ang(i) + (arco * (j + 1)) / (arr.length + 1);
          const r = R1 + ((RMAX - R1) * Math.min(15, Math.max(0, m.intensidad))) / 15;
          const [x, y] = xy(a, r);
          const [x0, y0] = xy(a, R1);
          const derecha = Math.cos(a) >= 0;
          return (
            <g key={`${f.id}-${m.nota}`}>
              <line x1={x0} y1={y0} x2={x} y2={y} stroke={f.color} strokeWidth={1.2} />
              <circle cx={x} cy={y} r={4.2} fill={f.color} stroke={m.defecto ? "#C8102E" : "#fff"} strokeWidth={m.defecto ? 2 : 1.2} />
              <text x={x + (derecha ? 7 : -7)} y={y + 3.5} fontSize={11} fill={TINTA} textAnchor={derecha ? "start" : "end"} fontWeight={600}>
                {m.nota}
              </text>
            </g>
          );
        })
      )}
    </svg>
  );
}

/** La matriz de respaldo: qué dato declaró el productor, cuál revisó CTCx y cuál midió el Q-Grader. */
export function MatrizDeRespaldo({ columnas, filas }: { columnas: string[]; filas: { dato: string; marcas: ("si" | "pend" | "no")[] }[] }) {
  const W = 600;
  const c0 = 220;
  const cw = (W - c0) / columnas.length;
  const fh = 24;
  return (
    <svg viewBox={`0 0 ${W} ${32 + filas.length * fh}`} width="100%" role="img" aria-label="Matriz de respaldo" style={{ display: "block" }}>
      {columnas.map((c, i) => (
        <text key={c} x={c0 + cw * i + cw / 2} y={14} fontSize={9.5} fontWeight={700} fill={TINTA} textAnchor="middle">
          {c}
        </text>
      ))}
      <line x1={0} y1={24} x2={W} y2={24} stroke={TINTA} strokeWidth={1} />
      {filas.map((f, r) => {
        const y = 32 + r * fh;
        return (
          <g key={f.dato}>
            <text x={0} y={y + fh / 2 + 1} fontSize={9.5} fill={TINTA} dominantBaseline="middle">
              {f.dato}
            </text>
            <line x1={0} y1={y + fh} x2={W} y2={y + fh} stroke={LINEA} strokeWidth={0.8} />
            {f.marcas.map((m, i) => {
              const cx = c0 + cw * i + cw / 2;
              const cy = y + fh / 2;
              return m === "si" ? (
                <circle key={i} cx={cx} cy={cy} r={6} fill={MORADO} />
              ) : m === "pend" ? (
                <circle key={i} cx={cx} cy={cy} r={5.4} fill="none" stroke={MORADO} strokeWidth={1.4} strokeDasharray="2 2" />
              ) : (
                <line key={i} x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke={LINEA} strokeWidth={1.4} />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ── V5.167 (owner): ilustraciones conceptuales, minimalistas, en trazo de la marca ──────────────────────────────────────
// «Utiliza imágenes minimalistas conceptuales para enriquecer las visuales […] como en "Altitud de la finca sobre el nivel
// del mar" puede tener una silueta de montaña.» Dibujos de pocas formas, un solo color (el morado CTCx en tintes): acompañan
// a los datos, no los reemplazan.

/** La altitud de la finca sobre una silueta de montañas: tres cordilleras en tintes, la cota de la finca y su marca. */
/** `rotulo` (V5.202, Dossier público): lo que se escribe junto a la línea en vez de «N m» (el tramo «1.700–1.800 m»). */
export function AltitudEnLaMontana({ metros, etiqueta, loc = "es-CO", rotulo }: { metros: number; etiqueta: string; loc?: string; rotulo?: string | null }) {
  const W = 240;
  const H = 150;
  const TOPE = 2600;
  const y = (m: number) => H - (Math.min(TOPE, Math.max(0, m)) / TOPE) * H;
  const yf = y(metros);
  return (
    <svg viewBox={`-30 -12 ${W + 34} ${H + 22}`} width="100%" role="img" aria-label={etiqueta} style={{ display: "block" }}>
      <polygon points={`0,${H} 0,${y(900)} 40,${y(1500)} 75,${y(1100)} 120,${y(2300)} 160,${y(1600)} 200,${y(2000)} ${W},${y(1300)} ${W},${H}`} fill={MORADO} fillOpacity={0.1} />
      <polygon points={`0,${H} 0,${y(600)} 55,${y(1350)} 100,${y(900)} 150,${y(1750)} 205,${y(1050)} ${W},${y(1400)} ${W},${H}`} fill={MORADO} fillOpacity={0.2} />
      <polygon points={`0,${H} 0,${y(300)} 45,${y(700)} 95,${y(400)} 140,${y(1000)} 190,${y(500)} ${W},${y(800)} ${W},${H}`} fill={MORADO} fillOpacity={0.38} />
      {[0, 500, 1000, 1500, 2000, 2500].map((m) => (
        <g key={m}>
          <line x1={-4} y1={y(m)} x2={0} y2={y(m)} stroke={TINTA_SUAVE} strokeWidth={0.7} />
          <text x={-7} y={y(m) + 3} fontSize={7.5} fill={TINTA_SUAVE} textAnchor="end">
            {m.toLocaleString(loc)}
          </text>
        </g>
      ))}
      <line x1={0} y1={yf} x2={W} y2={yf} stroke={TINTA} strokeWidth={1} strokeDasharray="3 3" />
      <circle cx={150} cy={yf} r={4.5} fill={TINTA} />
      <text x={rotulo ? W : 158} y={yf - 6} fontSize={13} fontWeight={700} fill={TINTA} textAnchor={rotulo ? "end" : undefined}>
        {rotulo || `${metros.toLocaleString(loc)} m`}
      </text>
    </svg>
  );
}

/** Una taza de catación vista de lado, con su plato y el vapor: la cabecera del perfil de taza. */
export function IlustracionTaza() {
  return (
    <svg viewBox="0 0 120 100" width="100%" aria-hidden style={{ display: "block" }}>
      <path d="M44 22c-6 6 6 10 0 16M60 18c-6 6 6 10 0 16M76 22c-6 6 6 10 0 16" fill="none" stroke={MORADO} strokeOpacity={0.45} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M28 44h64v10c0 18-14 30-32 30S28 72 28 54z" fill={MORADO} fillOpacity={0.12} stroke={MORADO} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M92 50h4a9 9 0 0 1 0 18h-6" fill="none" stroke={MORADO} strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={60} cy={44} rx={32} ry={4} fill={MORADO} fillOpacity={0.35} />
      <path d="M14 90h92" stroke={MORADO} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

/** Tres granos: pergamino, verde y grano sano (el camino del análisis físico). */
export function IlustracionGranos() {
  const grano = (cx: number, relleno: string, opacidad: number, rot: number) => (
    <g transform={`rotate(${rot} ${cx} 50)`}>
      <ellipse cx={cx} cy={50} rx={15} ry={22} fill={relleno} fillOpacity={opacidad} stroke={MORADO} strokeWidth={2.2} />
      <path d={`M${cx} 30c-7 8 7 14 0 20s7 12 0 20`} fill="none" stroke={MORADO} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 136 100" width="100%" aria-hidden style={{ display: "block" }}>
      {grano(22, "#ffffff", 1, -14)}
      {grano(68, MORADO, 0.15, 0)}
      {grano(114, MORADO, 0.4, 14)}
    </svg>
  );
}
