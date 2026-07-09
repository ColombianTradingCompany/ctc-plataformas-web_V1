import { SCA_ATTRS } from "./fichaData";
import styles from "./SpiderChart.module.css";

const R = 72;
const N = 10;

function point(idx: number, val: number): [number, number] {
  const a = (Math.PI * 2 * idx) / N - Math.PI / 2;
  const r = R * (val / 10);
  return [r * Math.cos(a), r * Math.sin(a)];
}

export function SpiderChart({ values }: { values: number[] }) {
  const rings = [2, 4, 6, 8, 10];
  const polyPoints = values.map((v, i) => point(i, v).join(",")).join(" ");

  return (
    <svg className={styles.svg} viewBox="-90 -90 180 180">
      {rings.map((v) => (
        <polygon
          key={v}
          className={styles.bg}
          points={Array.from({ length: N }, (_, i) => point(i, v).join(",")).join(" ")}
        />
      ))}
      {SCA_ATTRS.map((_, i) => {
        const [x1, y1] = point(i, 0.5);
        const [x2, y2] = point(i, 10);
        const [lx, ly] = point(i, 11.8);
        return (
          <g key={i}>
            <line className={styles.axis} x1={x1} y1={y1} x2={x2} y2={y2} />
            <text className={styles.label} x={lx} y={ly}>
              {SCA_ATTRS[i][1].split("/")[0].split(" ")[0]}
            </text>
          </g>
        );
      })}
      <polygon className={styles.poly} points={polyPoints} />
      {values.map((v, i) => {
        const [x, y] = point(i, v);
        return <circle key={i} className={styles.dot} cx={x} cy={y} r={3} />;
      })}
    </svg>
  );
}

/** Standalone SVG markup (inline-styled, no CSS Module) for the exported/printed ficha document. */
export function spiderSvgString(values: number[]) {
  const rings = [2, 4, 6, 8, 10];
  const bg = rings
    .map((v) => `<polygon points="${Array.from({ length: N }, (_, i) => point(i, v).join(",")).join(" ")}" fill="none" stroke="#2A2540" stroke-width="0.5"/>`)
    .join("");
  const axes = SCA_ATTRS.map((_, i) => {
    const [x1, y1] = point(i, 0.5);
    const [x2, y2] = point(i, 10);
    const [lx, ly] = point(i, 11.8);
    const label = SCA_ATTRS[i][1].split("/")[0].split(" ")[0];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3A3550" stroke-width="0.5"/><text x="${lx}" y="${ly}" font-size="6" fill="#9389B0" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }).join("");
  const poly = values.map((v, i) => point(i, v).join(",")).join(" ");
  const dots = values.map((v, i) => { const [x, y] = point(i, v); return `<circle cx="${x}" cy="${y}" r="3" fill="#FFCD00"/>`; }).join("");
  return `<svg viewBox="-90 -90 180 180" style="width:100%;display:block">${bg}${axes}<polygon points="${poly}" fill="rgba(211,184,250,.25)" stroke="#D3B8FA" stroke-width="1.5"/>${dots}</svg>`;
}
