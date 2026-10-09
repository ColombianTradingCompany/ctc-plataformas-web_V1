import type { SneakPeekLang } from "@/lib/catalogo/sneakPeek";
import styles from "./SneakPeek.module.css";

// ── La telaraña de 8 esquinas del CVA en el reverso de la tarjeta (V5.198) ───────────────────────────────────────────────
// La misma figura que el Perfil de taza del Dossier (`RadarCva`, V5.197: octógono de cara plana, de 1 en el centro a 9 en el borde,
// el 5 punteado), a escala de tarjeta y con los colores del TEMA de cada superficie (las clases de `SneakPeek.module.css`), no con
// los del documento. Reemplaza al «Análisis Intrínseco» de los diez atributos SCA que traían los lotes mock (V4.x): los lotes
// reales se catan en CVA. Sin los valores en las esquinas —a este tamaño serían ruido—: están en el Dossier.

const ROTULOS: Record<SneakPeekLang, Record<string, string>> = {
  es: { fragrance: "Fragancia", aroma: "Aroma", flavor: "Sabor", aftertaste: "Residual", acidity: "Acidez", sweetness: "Dulzor", mouthfeel: "Boca", overall: "General" },
  en: { fragrance: "Fragrance", aroma: "Aroma", flavor: "Flavor", aftertaste: "Aftertaste", acidity: "Acidity", sweetness: "Sweetness", mouthfeel: "Mouthfeel", overall: "Overall" },
  de: { fragrance: "Duft", aroma: "Aroma", flavor: "Geschmack", aftertaste: "Abgang", acidity: "Säure", sweetness: "Süße", mouthfeel: "Mundgefühl", overall: "Gesamt" },
};

const ARIA: Record<SneakPeekLang, string> = {
  es: "Evaluación afectiva CVA: los ocho atributos en la escala de 1 a 9",
  en: "CVA affective assessment: the eight attributes on the 1 to 9 scale",
  de: "Affektive CVA-Bewertung: die acht Attribute auf der Skala von 1 bis 9",
};

const MIN = 1;
const MAX = 9;

export function RadarCvaTarjeta({ valores, lang }: { valores: { k: string; v: number }[]; lang: SneakPeekLang }) {
  const n = valores.length;
  if (n < 3) return null;
  const W = 290;
  const H = 206;
  const cx = W / 2;
  const cy = H / 2;
  const R = 70;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2 + Math.PI / n;
  const pt = (i: number, v: number) => {
    const r = (R * (Math.min(MAX, Math.max(MIN, v)) - MIN)) / (MAX - MIN);
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))] as const;
  };
  const fmt = ([x, y]: readonly [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const anillo = (v: number) => valores.map((_, i) => fmt(pt(i, v))).join(" ");
  return (
    <svg className={styles.radar} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA[lang]}>
      {[3, 5, 7, 9].map((v) => (
        <polygon key={v} points={anillo(v)} className={v === MAX ? styles.radarBorde : styles.radarAnillo} strokeDasharray={v === 5 ? "3 3" : undefined} />
      ))}
      {valores.map((_, i) => {
        const [x, y] = pt(i, MAX);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={styles.radarEje} />;
      })}
      <polygon points={valores.map((x, i) => fmt(pt(i, x.v))).join(" ")} className={styles.radarFigura} />
      {valores.map((x, i) => {
        const [px, py] = pt(i, x.v);
        return <circle key={x.k} cx={px} cy={py} r={3.2} className={styles.radarPunto} />;
      })}
      {valores.map((x, i) => {
        const a = ang(i);
        const lx = cx + (R + 12) * Math.cos(a);
        const ly = cy + (R + 12) * Math.sin(a);
        const anclaje = Math.cos(a) > 0.1 ? "start" : Math.cos(a) < -0.1 ? "end" : "middle";
        return (
          <text key={x.k} x={lx} y={ly + (Math.sin(a) > 0.5 ? 9 : Math.sin(a) < -0.5 ? -2 : 3)} textAnchor={anclaje} className={styles.radarRotulo}>
            {ROTULOS[lang][x.k] ?? x.k}
          </text>
        );
      })}
    </svg>
  );
}
