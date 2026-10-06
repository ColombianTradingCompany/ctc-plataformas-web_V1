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

/** La regla de altitud: de 0 a 2.500 m, con la finca marcada. */
export function ReglaDeAltitud({ metros, etiqueta, loc = "es-CO" }: { metros: number; etiqueta: string; loc?: string }) {
  const H = 150;
  const TOPE = 2500;
  const y = (m: number) => H - (Math.min(TOPE, Math.max(0, m)) / TOPE) * H;
  return (
    <svg viewBox={`-4 -10 120 ${H + 20}`} width="100%" role="img" aria-label={etiqueta} style={{ display: "block" }}>
      <rect x={34} y={y(metros)} width={14} height={H - y(metros)} fill={MORADO} />
      <rect x={34} y={0} width={14} height={y(metros)} fill={MORADO_TINTE} />
      {[0, 500, 1000, 1500, 2000, 2500].map((m) => (
        <g key={m}>
          <line x1={28} y1={y(m)} x2={34} y2={y(m)} stroke={TINTA_SUAVE} strokeWidth={0.7} />
          <text x={24} y={y(m) + 3} fontSize={7.5} fill={TINTA_SUAVE} textAnchor="end">
            {m.toLocaleString(loc)}
          </text>
        </g>
      ))}
      <line x1={48} y1={y(metros)} x2={58} y2={y(metros)} stroke={TINTA} strokeWidth={1} />
      <text x={61} y={y(metros) + 4} fontSize={12} fontWeight={700} fill={TINTA}>
        {metros.toLocaleString(loc)} m
      </text>
    </svg>
  );
}

/** La composición varietal: una barra al 100 % repartida por variedad. */
export function Composicion({ variedades }: { variedades: { nombre: string; pct: number | null }[] }) {
  const conPct = variedades.filter((v) => v.pct != null && v.pct > 0);
  const lista = conPct.length ? conPct : variedades.map((v) => ({ ...v, pct: 100 / Math.max(1, variedades.length) }));
  if (!lista.length) return null;
  const total = lista.reduce((s, v) => s + (v.pct ?? 0), 0) || 1;
  const tonos = [MORADO, "#7A4FC2", "#B49BE0", "#D9CDF1"];
  // Las posiciones se calculan antes de pintar (nada se reasigna durante el render).
  const anchos = lista.map((v) => ((v.pct ?? 0) / total) * 400);
  const inicios = anchos.map((_, i) => anchos.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <svg viewBox="0 0 400 34" width="100%" role="img" aria-label="Composición varietal" style={{ display: "block" }}>
      {lista.map((v, i) => {
        const w = anchos[i];
        const x0 = inicios[i];
        const claro = i >= 2;
        return (
          <g key={v.nombre + i}>
            <rect x={x0} y={0} width={w} height={20} fill={tonos[i % tonos.length]} stroke="#fff" strokeWidth={1} />
            {w > 60 && (
              <text x={x0 + 6} y={14} fontSize={9} fill={claro ? TINTA : "#fff"} fontWeight={600}>
                {v.nombre} {Math.round(v.pct ?? 0)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Una barra de intensidad de 0 a 15 (la escala de la rueda). */
export function Intensidad({ valor, color }: { valor: number; color: string }) {
  return (
    <svg viewBox="0 0 60 6" width={60} height={6} aria-hidden style={{ display: "block" }}>
      <rect x={0} y={0} width={60} height={6} fill={LINEA} />
      <rect x={0} y={0} width={(Math.min(15, Math.max(0, valor)) / 15) * 60} height={6} fill={color} />
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
