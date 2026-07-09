import type { CompletionPoint } from "./data";
import styles from "./LotCompletionSparkline.module.css";

const W = 100;
const H = 28;
const PAD = 3;

export function LotCompletionSparkline({ history }: { history: CompletionPoint[] }) {
  if (history.length === 0) {
    return (
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} aria-label="Sin historial de avance todavía">
        <line className={styles.empty} x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
      </svg>
    );
  }

  const points = history.map((h, i) => {
    const x = history.length === 1 ? W / 2 : PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (h.pct / 100) * (H - PAD * 2);
    return [x, y] as const;
  });

  return (
    <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} aria-label={`Avance de la ficha: ${history[history.length - 1].pct}% más reciente`}>
      {points.length > 1 && <polyline className={styles.line} points={points.map((p) => p.join(",")).join(" ")} />}
      {points.map(([x, y], i) => (
        <circle key={i} className={i === points.length - 1 ? styles.dotLast : styles.dot} cx={x} cy={y} r={i === points.length - 1 ? 2.6 : 1.8} />
      ))}
    </svg>
  );
}
