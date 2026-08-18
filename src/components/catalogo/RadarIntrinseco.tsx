"use client";

// El VALOR sale del archivo puro; del módulo `server-only` solo se toma un tipo,
// que se borra al compilar. Ver la cabecera de `atributosSca.ts`.
import { ATRIBUTOS_SCA, type AtributoSCA } from "@/lib/catalogo/atributosSca";
import type { SneakPeekLang } from "@/lib/catalogo/sneakPeek";
import styles from "./SneakPeek.module.css";

// ── El «Análisis Intrínseco» del reverso de la tarjeta ───────────────────────
// La telaraña de los diez atributos del formulario SCA. Se dibuja AQUÍ, en React,
// y no como un SVG generado igual que la rueda de catación, por un motivo
// concreto: sus rótulos son texto y la tarjeta habla tres idiomas. Un SVG
// estático obligaría a generar veintiún archivos (siete lotes × tres lenguas) y
// a regenerarlos cada vez que se toque una palabra. La geometría, en cambio, es
// media docena de líneas de trigonometría.
//
// La ficha en PDF tiene su propia versión —`scripts/lib/analisis-intrinseco.mjs`,
// tema oscuro y un solo idioma— porque allí el documento es fijo y en papel el
// panel oscuro se lee mejor. Las dos comparten el ORDEN de los atributos
// (`ATRIBUTOS_SCA`), que es lo que hace que las dos figuras sean la misma.

const ROTULOS: Record<SneakPeekLang, Record<AtributoSCA, string>> = {
  es: {
    fragancia: "Fragancia",
    sabor: "Sabor",
    residual: "Residual",
    acidez: "Acidez",
    cuerpo: "Cuerpo",
    balance: "Balance",
    uniformidad: "Uniformidad",
    limpia: "Taza limpia",
    dulzor: "Dulzor",
    catador: "Catador",
  },
  en: {
    fragancia: "Fragrance",
    sabor: "Flavor",
    residual: "Aftertaste",
    acidez: "Acidity",
    cuerpo: "Body",
    balance: "Balance",
    uniformidad: "Uniformity",
    limpia: "Clean cup",
    dulzor: "Sweetness",
    catador: "Cupper's",
  },
  de: {
    fragancia: "Duft",
    sabor: "Geschmack",
    residual: "Nachgeschmack",
    acidez: "Säure",
    cuerpo: "Körper",
    balance: "Balance",
    uniformidad: "Gleichmäßigkeit",
    limpia: "Sauberkeit",
    dulzor: "Süße",
    catador: "Gesamt",
  },
};

const ARIA: Record<SneakPeekLang, string> = {
  es: "Análisis intrínseco: los diez atributos del formulario SCA",
  en: "Intrinsic analysis: the ten attributes of the SCA form",
  de: "Intrinsische Analyse: die zehn Attribute des SCA-Formulars",
};

/** La escala arranca en 6 y no en 0: un café de especialidad puntúa entre 7 y 9
 *  en todo, así que de 0 a 10 todas las figuras saldrían casi circulares y la
 *  telaraña no diría nada. */
const MIN = 6;
const MAX = 10;

export function RadarIntrinseco({
  valores,
  lang,
  size = 216,
}: {
  valores: Record<AtributoSCA, number>;
  lang: SneakPeekLang;
  size?: number;
}) {
  // El lienzo es MÁS ANCHO que alto: los rótulos salen del radio y con un lienzo
  // cuadrado «Residual» y «Taza limpia» se cortaban contra el borde de la
  // tarjeta, que recorta lo que se sale. Mismo remedio que en la ficha en PDF.
  const W = Math.round(size * 1.34);
  const H = size;
  const cx = W / 2;
  const cy = H / 2;
  const R = size * 0.30;
  const n = ATRIBUTOS_SCA.length;

  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const radio = (v: number) => ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * R;
  const punto = (i: number, r: number) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
  const fmt = ([x, y]: number[]) => `${x.toFixed(1)},${y.toFixed(1)}`;

  const vertices = ATRIBUTOS_SCA.map((clave, i) => punto(i, radio(valores[clave] ?? MIN)));

  return (
    <svg className={styles.radar} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA[lang]}>
      {/* Los anillos de referencia: 7, 8, 9 y el borde en 10. */}
      {[7, 8, 9, 10].map((v) => (
        <polygon
          key={v}
          points={ATRIBUTOS_SCA.map((_, i) => fmt(punto(i, radio(v)))).join(" ")}
          className={v === 10 ? styles.radarBorde : styles.radarAnillo}
        />
      ))}
      {ATRIBUTOS_SCA.map((_, i) => {
        const [x, y] = punto(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={styles.radarEje} />;
      })}
      <polygon points={vertices.map(fmt).join(" ")} className={styles.radarFigura} />
      {vertices.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.4} className={styles.radarPunto} />
      ))}
      {ATRIBUTOS_SCA.map((clave, i) => {
        const [x, y] = punto(i, R + 15);
        const anclaje = Math.abs(x - cx) < 5 ? "middle" : x > cx ? "start" : "end";
        return (
          <text key={clave} x={x} y={y + 3} textAnchor={anclaje} className={styles.radarRotulo}>
            {ROTULOS[lang][clave]}
          </text>
        );
      })}
    </svg>
  );
}
