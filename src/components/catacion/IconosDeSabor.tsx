// ── V5.197 (owner, 2026-10-10) · los íconos de la rueda del sabor ──────────────────────────────────────────────────────
// «Que en el Perfil de taza se visualice mejor la información consignada de la intensidad por la Evaluación Descriptiva,
// con íconos apropiados para cada una de las Notas y también para Acidez e intensidad.»
// UN ícono por cada punto de la rueda —9 familias, 22 subcategorías, 85 notas (`lib/catacion/ruedaDatos.ts`)— y por cada
// opción del formato descriptivo (tipo de acidez, texturas en boca). Mismo trazo que la familia de íconos del proyecto
// (lucide: rejilla de 24, trazo redondo, sin relleno), así que conviven en una hoja sin que se note quién dibujó cuál: se
// usa el de lucide cuando existe y es el objeto correcto (cereza, uva, manzana, rodaja de cítrico, copa de vino…) y se
// dibuja aquí el resto (fresa, mora, arándano, durazno, chocolate, miel, canela, anís…).
// La tabla es EXPLÍCITA, id por id: `qa-dossier-taza` comprueba que ningún punto de la rueda cae al ícono de reserva.
// PURO (sin hooks ni estado): lo pinta igual el dossier (servidor) que una tarjeta del catálogo (cliente).

import type { CSSProperties, ReactNode } from "react";
import { Apple, Bean, Candy, Cherry, Citrus, FlameKindling, Flame, FlaskConical, FlaskRound, Fuel, Grape, Leaf, LeafyGreen, Nut, Package, PawPrint, Pill, Soup, Sparkles, Sprout, Wheat, Wind, Wine, type LucideIcon } from "lucide-react";

export type PropsDeIcono = { size?: number | string; strokeWidth?: number; className?: string; style?: CSSProperties };
export type IconoDeSabor = (p: PropsDeIcono) => ReactNode;

function Trazo({ size = 24, strokeWidth = 2, className, style, children }: PropsDeIcono & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

const dibujo = (contenido: ReactNode): IconoDeSabor => {
  const Icono = (p: PropsDeIcono) => <Trazo {...p}>{contenido}</Trazo>;
  return Icono;
};

const deLucide = (L: LucideIcon): IconoDeSabor => {
  const Icono = ({ size = 24, strokeWidth = 2, className, style }: PropsDeIcono) => <L size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden focusable="false" />;
  return Icono;
};

/** Un punto relleno (semillas, poros, granos): sin trazo, del color del ícono. */
const punto = (cx: number, cy: number, r = 0.65) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
/** Un relleno suave dentro de un contorno (lo oscuro de un chocolate amargo, de una ciruela pasa, del azúcar morena). */
const SOMBRA = { fill: "currentColor", fillOpacity: 0.22 } as const;

/** Una gota con la punta en (`cx`, `top`) y `h` de alto: la de lucide (`droplet`, 12,3 → 12,22), llevada a su sitio. */
const gota = (cx: number, top: number, h: number) => {
  const s = h / 19;
  const X = (x: number) => (cx + (x - 12) * s).toFixed(2);
  const Y = (y: number) => (top + (y - 3) * s).toFixed(2);
  const r = (7 * s).toFixed(2);
  return `M${X(12)} ${Y(22)}A${r} ${r} 0 0 0 ${X(19)} ${Y(15)}C${X(19)} ${Y(13)} ${X(18)} ${Y(11.1)} ${X(16)} ${Y(9.5)}C${X(14)} ${Y(7.9)} ${X(12.5)} ${Y(5.5)} ${X(12)} ${Y(3)}C${X(11.5)} ${Y(5.5)} ${X(10)} ${Y(7.9)} ${X(8)} ${Y(9.5)}C${X(6)} ${Y(11.1)} ${X(5)} ${Y(13)} ${X(5)} ${Y(15)}A${r} ${r} 0 0 0 ${X(12)} ${Y(22)}Z`;
};

/** Una estrella de `n` puntas (anís estrellado, el cáliz de un arándano). */
function estrella(cx: number, cy: number, rOut: number, rIn: number, n: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

// ── Los dibujos ──────────────────────────────────────────────────────────────────────────────────────────────────────

const FLOR = dibujo(
  <>
    {[0, 72, 144, 216, 288].map((a) => (
      <path key={a} d="M12 10.6c-1.7-1.3-2.4-3.6-1.5-5.5.5-1 2.5-1 3 0 .9 1.9.2 4.2-1.5 5.5z" transform={`rotate(${a} 12 12)`} />
    ))}
    <circle cx={12} cy={12} r={1.5} />
  </>
);

const MANZANILLA = dibujo(
  <>
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <ellipse key={a} cx={12} cy={5.7} rx={1.5} ry={2.7} transform={`rotate(${a} 12 12)`} />
    ))}
    <circle cx={12} cy={12} r={2.4} {...SOMBRA} />
  </>
);

const ROSA = dibujo(
  <>
    <path d="M12 3.8c-3 0-5.4 2.4-5.4 5.4 0 2.9 2.4 5.2 5.4 5.2s5.4-2.3 5.4-5.2c0-3-2.4-5.4-5.4-5.4z" />
    <path d="M12 6.9c1.3 0 2.3 1 2.3 2.2s-1 2.1-2.2 2.1c-1 0-1.8-.7-1.8-1.6 0-.7.5-1.2 1.2-1.2" />
    <path d="M7.2 8.3c1.3-.4 2.6 0 3.4.9M16.8 8.3c-1.3-.4-2.6 0-3.4.9" />
    <path d="M12 14.4v7.2" />
    <path d="M12 18.6c-1.3-1.3-3.2-1.7-4.7-1.1.9 1.5 2.9 2 4.7 1.1zM12 17.6c1.1-1.1 2.7-1.4 4-.9-.8 1.3-2.5 1.8-4 .9z" />
  </>
);

const TE = dibujo(
  <>
    <path d="M4.8 10h11v3a5.5 5.5 0 0 1-5.5 5.5 5.5 5.5 0 0 1-5.5-5.5z" />
    <path d="M15.8 11h1.3a2.3 2.3 0 0 1 0 4.6h-1.9" />
    <path d="M3.4 21h14.8" />
    <path d="M10.3 7.4c-1-1.5-.8-3.5.7-4.9 1.1 1.6.9 3.5-.7 4.9zM10.3 7.4l.5-2.2" />
  </>
);

const FRESA = dibujo(
  <>
    <path d="M12 8.7c2.6-.9 5.6-.4 6.4 1.6.9 2.5-.6 6.1-3.2 8.6-1.4 1.4-2.4 2.4-3.2 2.4s-1.8-1-3.2-2.4C6.2 16.4 4.7 12.8 5.6 10.3c.8-2 3.8-2.5 6.4-1.6z" />
    <path d="M12 8.6V4.4M12 8.4 8.6 6.4M12 8.4l3.4-2" />
    {[punto(9.2, 11.6), punto(12, 11.1), punto(14.8, 11.6), punto(10.6, 14.4), punto(13.4, 14.4), punto(12, 17.3)]}
  </>
);

/** Frambuesa y mora: UNA fruta (su silueta) hecha de drupas, no un racimo: así no se confunde con la uva. */
const DRUPAS: [number, number][] = [
  [10.2, 10],
  [13.8, 10],
  [8.6, 12.9],
  [12, 12.9],
  [15.4, 12.9],
  [10.2, 15.8],
  [13.8, 15.8],
  [12, 18.6],
];
const drupa = (rellena: boolean) =>
  dibujo(
    <>
      <path d="M12 6.6c3.5 0 6.1 2.6 6.1 6.1 0 4.3-3.1 8.6-6.1 8.6s-6.1-4.3-6.1-8.6c0-3.5 2.6-6.1 6.1-6.1z" {...(rellena ? SOMBRA : {})} />
      {DRUPAS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} strokeWidth={1.25} />
      ))}
      <path d="M12 6.6V3.4M12 5.2 9.4 3.9M12 5.2l2.6-1.3" />
    </>
  );
const FRAMBUESA = drupa(false);
const MORA = drupa(true);

const ARANDANO = dibujo(
  <>
    <circle cx={12} cy={12.4} r={8.4} />
    <path d={estrella(12, 12.4, 3, 1.25, 5)} />
    <path d="M6.6 9.6a6 6 0 0 1 2.6-2.6" />
  </>
);

const BAYAS = dibujo(
  <>
    <circle cx={8.4} cy={15.6} r={3.6} />
    <circle cx={15.6} cy={15.6} r={3.6} />
    <circle cx={12} cy={9.4} r={3.6} />
    <path d="M12 5.8V3M12 4.2l2.6-1.2" />
  </>
);

const PASA = dibujo(
  <>
    <path d="M7.5 7.2C8.9 5.6 10.6 5 12 5s3.1.6 4.5 2.2c1.6 1.8 2.1 4.2 1.8 6.6-.4 3.4-2.8 6-6.3 6.2-3.5-.2-5.9-2.8-6.3-6.2-.3-2.4.2-4.8 1.8-6.6z" />
    <path d="M8.8 9.8c1.2.7 2.2.2 3.2-.3s2.2-.9 3.2-.1M8.4 13.4c1.2.6 2.4.1 3.6-.4s2.3-.7 3.6.1M9.6 16.6c.9.4 1.8.2 2.6-.2s1.6-.4 2.3.1" />
  </>
);
const CIRUELA_PASA = dibujo(
  <>
    <path d="M7.5 8.2C8.9 6.6 10.6 6 12 6s3.1.6 4.5 2.2c1.6 1.8 2.1 4.2 1.8 6.6-.4 3.4-2.8 5.6-6.3 5.8-3.5-.2-5.9-2.4-6.3-5.8-.3-2.4.2-4.8 1.8-6.6z" {...SOMBRA} />
    <path d="M9 11.2c1.2.7 2.2.2 3.2-.3s2.2-.9 3.2-.1M9.4 14.8c1.2.6 2.4.1 3.6-.4s2.3-.7 3.2.1" />
    <path d="M12 6c0-1.3.4-2.4 1.3-3.2" />
  </>
);

const COCO = dibujo(
  <>
    <path d="M3.5 11.5h17" />
    <path d="M4 11.5a8 8 0 0 0 16 0" />
    <path d="M6.8 11.5a5.2 5.2 0 0 0 10.4 0" />
    <path d="M5.7 15.6l1.3-.6M9 18.4l.7-1.1M15 18.4l-.7-1.1M18.3 15.6l-1.3-.6" />
  </>
);

const GRANADA = dibujo(
  <>
    <circle cx={12} cy={13.7} r={7.3} />
    <path d="M9.4 6.8 9 4.2l1.8 1.1L12 3.6l1.2 1.7L15 4.2l-.4 2.6" />
    <path d="M8.4 12.4a4 4 0 0 1 2.8-3" />
  </>
);

const PINA = dibujo(
  <>
    <path d="M12 8.6c2.9 0 5.2 2.9 5.2 6.4s-2.3 6.4-5.2 6.4-5.2-2.9-5.2-6.4 2.3-6.4 5.2-6.4z" />
    <path d="M9 11.2l6.4 6.4M8.6 15.4l3.6 3.6M11.6 9.2l4.8 4.8M15 11.2l-6.4 6.4M15.4 15.4l-3.6 3.6M12.4 9.2 7.6 14" />
    <path d="M12 8.6c-.4-1.8-.2-3.5.6-5.1M12 8.6c-1-1.2-2.4-2-4-2.2M12 8.6c1-1.2 2.4-2 4-2.2" />
  </>
);

const DURAZNO = dibujo(
  <>
    <path d="M12 7.5c-3.9-.2-7 2.8-7 6.6 0 3.9 3.1 7.1 7 7.1s7-3.2 7-7.1c0-3.8-3.1-6.8-7-6.6z" />
    <path d="M12 7.5c-1.7 1.6-2.4 4.2-1.8 7" />
    <path d="M12 7.5c0-1.4.3-2.6 1-3.6" />
    <path d="M13 3.9c1.6-.9 3.6-.8 5 .3-1.3 1.3-3.4 1.5-5-.3z" />
  </>
);

const PERA = dibujo(
  <>
    <path d="M12 6c-1.8 0-2.8 1.5-2.8 3.2 0 1.2-.7 2.1-1.6 3C6.5 13.3 5.8 14.7 5.8 16.4c0 2.9 2.7 5.1 6.2 5.1s6.2-2.2 6.2-5.1c0-1.7-.7-3.1-1.8-4.2-.9-.9-1.6-1.8-1.6-3C14.8 7.5 13.8 6 12 6z" />
    <path d="M12 6V3.4" />
    <path d="M12.4 4.4c1-.9 2.4-1.2 3.6-.8-.6 1.2-2.1 1.7-3.6.8z" />
  </>
);

const NARANJA = dibujo(
  <>
    <circle cx={12} cy={13.3} r={7.6} />
    <path d="M12 5.7V4.3" />
    <path d="M12.2 5.4c.3-1.7 1.7-2.9 3.6-3-.3 1.8-1.7 2.9-3.6 3z" />
    {[punto(9, 11.2, 0.55), punto(14.6, 10.8, 0.55), punto(10.8, 15.6, 0.55), punto(15.4, 14.9, 0.55), punto(8.4, 16.4, 0.55)]}
  </>
);

const LIMON = dibujo(
  <g transform="rotate(-35 12 12)">
    <path d="M3.4 12c1.8-3.7 5.1-5.8 8.6-5.8s6.8 2.1 8.6 5.8c-1.8 3.7-5.1 5.8-8.6 5.8S5.2 15.7 3.4 12z" />
    <path d="M3.4 12H2.2M20.6 12h1.2" />
    <path d="M7.8 10.6c1.1-1 2.5-1.6 3.9-1.8" />
  </g>
);

const ACIDO = dibujo(
  <>
    <path d={gota(12, 3, 18)} />
    <path d="M9.4 14.2l1.3-1.3 1.3 1.3 1.3-1.3 1.3 1.3" />
  </>
);

const VINAGRE = dibujo(
  <>
    <path d="M10 2.8h4" />
    <path d="M10.6 2.8v3L8 9.3v9.7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9.3l-2.6-3.5v-3" />
    <path d="M8 13.4h8" />
  </>
);

const WHISKEY = dibujo(
  <>
    <path d="M5.5 6h13l-1.4 13.2A2 2 0 0 1 15.1 21H8.9a2 2 0 0 1-2-1.8z" />
    <path d="M6.6 13h10.8" />
    <path d="M9.4 10.4l2.6-1 1 2.6-2.6 1z" />
  </>
);

const FERMENTADO = dibujo(
  <>
    <path d="M6.5 4.5h11v3h-11z" />
    <path d="M7.5 7.5h9v11a2.5 2.5 0 0 1-2.5 2.5h-4a2.5 2.5 0 0 1-2.5-2.5z" />
    <circle cx={10.2} cy={16.6} r={1.1} />
    <circle cx={13.7} cy={13.7} r={1.4} />
    <circle cx={11.2} cy={11.3} r={0.8} />
  </>
);

const SOBREMADURO = dibujo(
  <>
    <circle cx={11} cy={12.6} r={6.4} {...SOMBRA} />
    <path d="M11 6.2c0-1.6.6-2.8 1.8-3.6" />
    <path d={gota(17.6, 15.6, 5.6)} />
  </>
);

const ACEITUNA = dibujo(
  <>
    <path d="M3 20.5c5-2 9-6.5 11.5-13" />
    <ellipse cx={9.2} cy={12.4} rx={2.6} ry={3.5} transform="rotate(35 9.2 12.4)" />
    <ellipse cx={16.4} cy={13.6} rx={2.6} ry={3.5} transform="rotate(-25 16.4 13.6)" />
    <path d="M14.6 7.2c2-1.2 4.4-1.4 6.4-.6-1.6 1.6-4.2 2-6.4.6z" />
  </>
);

const VAINA = dibujo(
  <>
    <path d="M3.5 16.5C6 10 11.5 5.5 20.5 4c-.8 7.5-6.2 13.6-13.8 14.4-1.5.2-2.6-.4-3.2-1.9z" />
    <circle cx={8.4} cy={14.2} r={1.7} />
    <circle cx={11.8} cy={11.3} r={1.7} />
    <circle cx={15.2} cy={8.6} r={1.6} />
  </>
);

const PAPEL = dibujo(
  <>
    <path d="M6.5 3h7.5l4 4v14H6.5z" />
    <path d="M14 3v4h4" />
    <path d="M9 11h6M9 14.5h6M9 18h3.8" />
  </>
);

const RANCIO = dibujo(
  <>
    <path d={gota(10, 4, 16.5)} />
    <path d="M17.2 4.6c.9.9-.9 1.8 0 2.7M19.6 7.2c.9.9-.9 1.8 0 2.7" />
    {[punto(9.2, 15.2, 0.7), punto(11.4, 13, 0.55)]}
  </>
);

const TRONCO = dibujo(
  <>
    <ellipse cx={17} cy={12} rx={3.2} ry={4.6} />
    <ellipse cx={17} cy={12} rx={1.3} ry={2} />
    <path d="M17 7.4H6.6C4.6 7.4 3 9.5 3 12s1.6 4.6 3.6 4.6H17" />
    <path d="M6.8 10.4h5M8.4 13.8h4.4" />
  </>
);

const MOHO = dibujo(
  <>
    <circle cx={8} cy={8.8} r={2.4} />
    <circle cx={15.8} cy={7.6} r={1.7} />
    <circle cx={13.4} cy={14.6} r={2.8} />
    <circle cx={6.8} cy={16.2} r={1.4} />
    <circle cx={18.4} cy={16.4} r={1.5} />
    {[punto(8, 8.8, 0.6), punto(13.4, 14.6, 0.7), punto(15.8, 7.6, 0.45)]}
  </>
);

const POLVO = dibujo(
  <>
    <path d="M6 14.5a3.4 3.4 0 0 1 1.5-6.4 4.6 4.6 0 0 1 8.8 1.1 2.9 2.9 0 0 1 1.7 5.3z" />
    {[punto(6.5, 18, 0.6), punto(9.5, 19.6, 0.6), punto(12.5, 17.8, 0.6), punto(15.5, 19.8, 0.6), punto(18, 17.6, 0.6)]}
  </>
);

const TIERRA = dibujo(
  <>
    <path d="M2.5 19.5c2.3-4.7 5.6-7 9.5-7s7.2 2.3 9.5 7z" />
    <circle cx={8.6} cy={16.9} r={1} />
    <circle cx={13} cy={15.6} r={0.8} />
    <circle cx={16} cy={17.5} r={1.1} />
    <path d="M12 12.5V9.8M12 10.8c-1-.9-2.2-1.1-3.2-.7.6 1 1.9 1.4 3.2.7z" />
  </>
);

const AMARGO = dibujo(
  <>
    <path d={gota(12, 3, 18)} {...SOMBRA} />
    <path d="M9.5 15.2h5" />
  </>
);

const SALERO = dibujo(
  <>
    <path d="M8.4 10h7.2l-1 10.5a1 1 0 0 1-1 .9h-3.2a1 1 0 0 1-1-.9z" />
    <path d="M8.4 10a3.6 3.6 0 0 1 7.2 0" />
    {[punto(10.8, 7.7, 0.55), punto(13.2, 7.7, 0.55), punto(12, 6.4, 0.55), punto(5, 4.6, 0.55), punto(6.6, 2.8, 0.55), punto(4.2, 7.4, 0.5)]}
  </>
);

const LLANTA = dibujo(
  <>
    <circle cx={12} cy={12} r={8.6} />
    <circle cx={12} cy={12} r={3.6} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <path key={a} d="M12 3.4v2.6" transform={`rotate(${a} 12 12)`} />
    ))}
  </>
);

const CHILE = dibujo(
  <>
    <path d="M17.6 7.2c1.1 2.5.6 5.6-1.6 8.4-2.6 3.3-6.8 5.3-11.8 5.4 2.9-1.6 5-3.9 6.2-6.7 1.4-3.3 3.3-6.3 7.2-7.1z" />
    <path d="M17.6 7.2c-.1-1.8.6-3.3 2.2-4.2" />
    <path d="M15 7.5c.9-1 2.1-1.2 3.4-.6" />
  </>
);

const PIMIENTA = dibujo(
  <>
    <circle cx={8} cy={15.2} r={3.2} />
    <circle cx={15.8} cy={15.6} r={3.2} />
    <circle cx={11.8} cy={8.4} r={3.2} />
    <path d="M6.6 13.6a1.6 1.6 0 0 1 1.6-.9M14.4 14a1.6 1.6 0 0 1 1.6-.9M10.4 6.8a1.6 1.6 0 0 1 1.6-.9" />
  </>
);

const ANIS = dibujo(
  <>
    <path d={estrella(12, 12, 9.2, 3.7, 8)} />
    <circle cx={12} cy={12} r={1.4} />
  </>
);

const NUEZ_MOSCADA = dibujo(
  <>
    <ellipse cx={12} cy={12} rx={6} ry={7.6} />
    <path d="M9 5.6c1.6 2.2 1.8 4.6.6 7-1 2.1-.8 4 .4 5.8M15 5.6c-1.6 2.2-1.8 4.6-.6 7 1 2.1.8 4-.4 5.8M6.4 11.2c2.2.6 4.2.4 5.6-.6 1.4 1 3.4 1.2 5.6.6" />
  </>
);

const CANELA = dibujo(
  <>
    <rect x={1.9} y={7.7} width={15.2} height={3.6} rx={1.8} transform="rotate(-45 9.5 9.5)" />
    <rect x={6.9} y={12.7} width={15.2} height={3.6} rx={1.8} transform="rotate(-45 14.5 14.5)" />
    <path d="M6.9 13.4l7.2-7.2M11.9 18.4l7.2-7.2" strokeOpacity={0.55} />
  </>
);

const CLAVO = dibujo(
  <>
    <path d="M12 21.5V11" />
    <path d="M9.6 11h4.8l-.8-2.6h-3.2z" />
    <path d="M10.4 8.4 8.3 6.8M13.6 8.4l2.1-1.6" />
    <circle cx={12} cy={5.5} r={2.3} />
  </>
);

const TABACO = dibujo(
  <>
    <path d="M12 2.8c4.6 3.4 6.6 7.8 5.8 12.4-.6 3.2-2.8 5.6-5.8 6.2-3-.6-5.2-3-5.8-6.2C5.4 10.6 7.4 6.2 12 2.8z" />
    <path d="M12 6v15.4" />
    <path d="M12 10.2l2.8-2M12 10.2 9.2 8.2M12 14l3.4-2.2M12 14l-3.4-2.2M12 17.8l2.8-1.8M12 17.8l-2.8-1.8" />
  </>
);

const PIPA = dibujo(
  <>
    <path d="M11.4 8.6h8.8v5.4a4.4 4.4 0 0 1-4.4 4.4 4.4 4.4 0 0 1-4.4-4.4z" />
    <path d="M11.4 11.8 2.6 10v2.2l8.8 1.8" />
    <path d="M15.8 6c-1-1 1-2.2 0-3.4" />
  </>
);

const HUMO = dibujo(
  <>
    <path d="M8 20.5c-1.8-1.8 1.8-3.4 0-5.2s1.8-3.4 0-5.2" />
    <path d="M12.5 20.5c-1.8-1.8 1.8-3.4 0-5.2s1.8-3.4 0-5.2 1.8-3.4 0-5.2" />
    <path d="M17 20.5c-1.8-1.8 1.8-3.4 0-5.2s1.8-3.4 0-5.2" />
  </>
);

/** La cebada de la malta: la espiga con sus granos en dos filas y las barbas largas (lo que la distingue del trigo). */
const CEBADA = dibujo(
  <>
    <path d="M12 22V8" />
    {[8.4, 11.8, 15.2].map((y) => (
      <path key={y} d={`M12 ${y + 2.4}c-1.9-.3-3-1.7-3-3.6 1.9.3 3 1.7 3 3.6zM12 ${y + 2.4}c1.9-.3 3-1.7 3-3.6-1.9.3-3 1.7-3 3.6z`} />
    ))}
    <path d="M9.2 8.4 7.4 2.6M14.8 8.4l1.8-5.8M12 8V2" />
  </>
);

const MANI = dibujo(
  <>
    <path d="M12 3.2c-2.3 0-4 1.8-4 4.1 0 1.4.7 2.3.7 3.4 0 1-1.4 2-1.4 4.1 0 3.2 2.1 6 4.7 6s4.7-2.8 4.7-6c0-2.1-1.4-3.1-1.4-4.1s.7-2 .7-3.4c0-2.3-1.7-4.1-4-4.1z" />
    {[punto(10.5, 6.6, 0.55), punto(13.5, 7.2, 0.55), punto(12, 9.3, 0.55), punto(10.3, 15, 0.55), punto(13.7, 14.4, 0.55), punto(12, 17.6, 0.55)]}
  </>
);

const ALMENDRA = dibujo(
  <>
    <path d="M12 2.6c3.6 2.9 5.8 7 5.8 10.9 0 4.1-2.6 7.2-5.8 7.9-3.2-.7-5.8-3.8-5.8-7.9 0-3.9 2.2-8 5.8-10.9z" />
    <path d="M10.2 9.4c.6.4 1.2.4 1.8 0M12.4 12.6c.6.4 1.2.4 1.8 0M9.8 15.4c.6.4 1.2.4 1.8 0M12.6 18c.5.3 1 .3 1.5 0" />
  </>
);

const MAZORCA = dibujo(
  <>
    <path d="M12 2.8c3.4 1.8 5.4 5.4 5.4 9.6s-2 7.8-5.4 9.6c-3.4-1.8-5.4-5.4-5.4-9.6s2-7.8 5.4-9.6z" />
    <path d="M12 3.4v18M9.1 5.6c-1.2 4.4-1.2 9.2 0 13.6M14.9 5.6c1.2 4.4 1.2 9.2 0 13.6" />
  </>
);

const barra = (amarga: boolean) =>
  dibujo(
    <>
      <path d="M6 3.5h8.2a2.6 2.6 0 0 0 3.8 3.4v13.6H6z" {...(amarga ? SOMBRA : {})} />
      <path d="M6 9.2h12M6 14.8h12M12 3.5v17" />
    </>
  );
const CHOCOLATE = barra(false);
const CHOCOLATE_AMARGO = barra(true);

const TARRO_MIEL = dibujo(
  <>
    <path d="M5 6.5h14v2.5H5z" />
    <path d="M6.2 9h11.6v7.4a4.6 4.6 0 0 1-4.6 4.6h-2.4a4.6 4.6 0 0 1-4.6-4.6z" />
    <path d="M14.6 9v2.6a1.1 1.1 0 0 0 2.2 0V9" />
    <path d="M8.8 15h4" />
  </>
);

const MIEL = dibujo(
  <>
    <path d="M3.4 20.6 12.2 11.8" />
    <g transform="rotate(-45 15 9)">
      <rect x={11} y={5.8} width={8} height={6.4} rx={2.6} />
      <path d="M13.2 5.8v6.4M15 5.8v6.4M16.8 5.8v6.4" />
    </g>
    <path d={gota(18.6, 15.4, 5.6)} />
  </>
);

const MELAZA = dibujo(
  <>
    <path d="M10 2.8h4" />
    <path d="M10.6 2.8v2.6c-2 .8-3.4 2.6-3.4 4.8v8.6a2.2 2.2 0 0 0 2.2 2.2h5.2a2.2 2.2 0 0 0 2.2-2.2v-8.6c0-2.2-1.4-4-3.4-4.8V2.8" />
    <path d="M7.2 13.2h9.6" />
    <path d="M7.2 13.2v5.6a2.2 2.2 0 0 0 2.2 2.2h5.2a2.2 2.2 0 0 0 2.2-2.2v-5.6z" {...SOMBRA} stroke="none" />
  </>
);

const MAPLE = dibujo(
  <>
    <path d="M12 2.4l1.4 3.2 2.4-.8-.6 3.8 4-1.2-1.2 3 3.2 1.2-2.8 1.8.6 2.4-4.4-1-2.6 1.6-2.6-1.6-4.4 1 .6-2.4-2.8-1.8 3.2-1.2-1.2-3 4 1.2-.6-3.8 2.4.8z" />
    <path d="M12 15.6v6" />
  </>
);

/** Vainilla: un atado de tres vainas largas con su cinta. */
const VAINILLA = dibujo(
  <>
    <path d="M3.6 18.4C7.2 12.6 12 7.8 18.6 3.4c-3.2 6-8 10.8-15 15z" />
    <path d="M5.6 20.6C9.4 14.8 14.2 10 20.8 5.8c-3.2 6-8 10.8-15.2 14.8z" />
    <path d="M7.6 21.6c3.4-4.6 7.4-8.4 13-11.6" />
    <path d="M6.4 13.6l4 4" />
  </>
);

const cubo = (morena: boolean) =>
  dibujo(
    <>
      <path d="M12 2.8 19.5 7v9L12 20.2 4.5 16V7z" {...(morena ? SOMBRA : {})} />
      <path d="M4.5 7 12 11.2 19.5 7M12 11.2v9" />
    </>
  );
const AZUCAR = cubo(false);
const AZUCAR_MORENA = cubo(true);

// ── Lo descriptivo: tipo de acidez y texturas en boca ──
const ACIDEZ_DULCE = dibujo(
  <>
    <path d="M3.5 12.5h17a8.5 8.5 0 0 1-17 0z" />
    <path d="M12 12.5v8.2M12 12.5l-5.2 5.4M12 12.5l5.2 5.4" />
    <path d={gota(9, 3, 6.2)} />
    <path d={gota(15, 5, 5)} />
  </>
);

const ACIDEZ_SECA = dibujo(
  <>
    <path d="M4 20c0-6 4-11.6 12-13 .4 8-4.4 12.6-12 13z" />
    <path d="M4 20c3-3 6-5.6 9.4-8" />
    <path d={gota(19.4, 2.4, 5.6)} />
  </>
);

const TEXTURA = dibujo(
  <>
    <path d="M3 7.5c3-2.4 6-2.4 9 0s6 2.4 9 0" />
    <path d="M3 12.5c3-2.4 6-2.4 9 0s6 2.4 9 0" />
    <path d="M3 17.5c3-2.4 6-2.4 9 0s6 2.4 9 0" />
  </>
);

const ASPERO = dibujo(
  <>
    <path d="M3 10.5l2.2-2.4 2.2 3 2.2-3 2.2 3 2.2-3 2.2 3 2.2-3 2.2 2.4" />
    {[punto(5, 15.4, 0.75), punto(8.6, 17.4, 0.75), punto(12, 15.2, 0.75), punto(15.4, 17.6, 0.75), punto(19, 15.4, 0.75), punto(7, 20.2, 0.6), punto(17, 20.2, 0.6)]}
  </>
);

const ACEITE = dibujo(
  <>
    <path d={gota(12, 3, 18)} />
    <path d="M8.6 15.2a3.4 3.4 0 0 0 2.4 3" />
  </>
);

const SEDA = dibujo(
  <>
    <path d="M3 9c3-3.4 6-3.4 9 0s6 3.4 9 0" />
    <path d="M3 15c3-3.4 6-3.4 9 0s6 3.4 9 0" />
  </>
);

/** Astringente («deja seca la boca»): la tierra cuarteada bajo el sol. */
const ASTRINGENTE = dibujo(
  <>
    <circle cx={16.5} cy={6.5} r={2.4} />
    <path d="M16.5 2.2v.9M16.5 9.9v.9M12.2 6.5h.9M19.9 6.5h.9M13.5 3.5l.6.6M18.9 8.9l.6.6M13.5 9.5l.6-.6M18.9 4.1l.6-.6" />
    <path d="M2.8 19h18.4" />
    <path d="M5.6 19l1.6-2.4-1-1.8M10.8 19l1-2.8-1.2-1.6M16.4 19l-.8-2 1.4-1.6" />
  </>
);

const METAL = dibujo(
  <>
    <path d="M3.5 17h17l-3.4-8H6.9z" />
    <path d="M6.9 9 8.4 6h7.2l1.5 3" />
    <path d="M9.2 12.6h3.6" />
  </>
);

// ── La tabla: id de la rueda → ícono ─────────────────────────────────────────────────────────────────────────────────

const L = {
  cereza: deLucide(Cherry),
  uva: deLucide(Grape),
  manzana: deLucide(Apple),
  rodaja: deLucide(Citrus),
  copa: deLucide(Wine),
  llama: deLucide(Flame),
  brasas: deLucide(FlameKindling),
  trigo: deLucide(Wheat),
  hoja: deLucide(Leaf),
  hojaVerde: deLucide(LeafyGreen),
  brote: deLucide(Sprout),
  frijol: deLucide(Bean),
  nuez: deLucide(Nut),
  caramelo: deLucide(Candy),
  destellos: deLucide(Sparkles),
  caldo: deLucide(Soup),
  huella: deLucide(PawPrint),
  pastilla: deLucide(Pill),
  combustible: deLucide(Fuel),
  caja: deLucide(Package),
  matraz: deLucide(FlaskConical),
  frasco: deLucide(FlaskRound),
  olor: deLucide(Wind),
};

/** Un ícono por punto de la rueda, con el MISMO id que guarda `lot_evaluations.rueda` (familia · subcategoría · `sub|nota`). */
export const ICONO_DE_LA_RUEDA: Readonly<Record<string, IconoDeSabor>> = {
  // Floral
  floral: FLOR,
  "floral-floral": FLOR,
  "floral-floral|manzanilla": MANZANILLA,
  "floral-floral|rosa": ROSA,
  "floral-floral|jazmin": FLOR,
  "floral-te": TE,
  "floral-te|te-negro": TE,
  // Frutal
  frutal: FRESA,
  "frutal-bayas": BAYAS,
  "frutal-bayas|mora": MORA,
  "frutal-bayas|frambuesa": FRAMBUESA,
  "frutal-bayas|arandano": ARANDANO,
  "frutal-bayas|fresa": FRESA,
  "frutal-seca": PASA,
  "frutal-seca|pasas": PASA,
  "frutal-seca|ciruela-pasa": CIRUELA_PASA,
  "frutal-otras": L.manzana,
  "frutal-otras|coco": COCO,
  "frutal-otras|cereza": L.cereza,
  "frutal-otras|granada": GRANADA,
  "frutal-otras|pina": PINA,
  "frutal-otras|uva": L.uva,
  "frutal-otras|manzana": L.manzana,
  "frutal-otras|durazno": DURAZNO,
  "frutal-otras|pera": PERA,
  "frutal-citricos": NARANJA,
  "frutal-citricos|toronja": L.rodaja,
  "frutal-citricos|naranja": NARANJA,
  "frutal-citricos|limon": LIMON,
  "frutal-citricos|lima": L.rodaja,
  // Ácido / Fermentado
  acido: ACIDO,
  "acido-acidos": ACIDO,
  "acido-acidos|acido-acetico": VINAGRE,
  "acido-acidos|acido-butirico": L.matraz,
  "acido-acidos|acido-isovalerico": L.matraz,
  "acido-acidos|acido-citrico": L.rodaja,
  "acido-acidos|acido-malico": L.manzana,
  "acido-fermentado": FERMENTADO,
  "acido-fermentado|vinoso": L.copa,
  "acido-fermentado|whiskey": WHISKEY,
  "acido-fermentado|fermentado": FERMENTADO,
  "acido-fermentado|sobremaduro": SOBREMADURO,
  // Verde / Vegetal
  verde: L.hoja,
  "verde-crudo": L.brote,
  "verde-crudo|aceite-de-oliva": ACEITUNA,
  "verde-crudo|crudo": L.brote,
  "verde-vegetal": L.hojaVerde,
  "verde-vegetal|verde": L.hoja,
  "verde-vegetal|vaina-de-chicharo": VAINA,
  "verde-vegetal|fresco": L.hoja,
  "verde-vegetal|verde-oscuro": L.hojaVerde,
  "verde-vegetal|vegetal": L.hojaVerde,
  "verde-vegetal|heno": L.trigo,
  "verde-vegetal|herbaceo": L.brote,
  "verde-frijol": L.frijol,
  "verde-frijol|a-frijol": L.frijol,
  // Otros
  otros: L.matraz,
  "otros-papel": PAPEL,
  "otros-papel|rancio": RANCIO,
  "otros-papel|carton": L.caja,
  "otros-papel|papel": PAPEL,
  "otros-papel|amaderado": TRONCO,
  "otros-papel|mohoso-humedo": MOHO,
  "otros-papel|polvoso-mohoso": POLVO,
  "otros-papel|terroso-mohoso": TIERRA,
  "otros-papel|animal": L.huella,
  "otros-papel|caldo-de-carne": L.caldo,
  "otros-papel|fenolico": L.frasco,
  "otros-quimico": L.matraz,
  "otros-quimico|amargo": AMARGO,
  "otros-quimico|salado": SALERO,
  "otros-quimico|medicinal": L.pastilla,
  "otros-quimico|petroleo": L.combustible,
  "otros-quimico|skunky": L.olor,
  "otros-quimico|caucho": LLANTA,
  // Especias
  especias: CHILE,
  "especias-pungente": CHILE,
  "especias-pungente|pungente": CHILE,
  "especias-pungente|pimienta": PIMIENTA,
  "especias-oscuras": CANELA,
  "especias-oscuras|anis": ANIS,
  "especias-oscuras|nuez-moscada": NUEZ_MOSCADA,
  "especias-oscuras|canela": CANELA,
  "especias-oscuras|clavo-de-olor": CLAVO,
  // Tostado
  tostado: L.llama,
  "tostado-tabaco": TABACO,
  "tostado-tabaco|tabaco-de-pipa": PIPA,
  "tostado-tabaco|tabaco": TABACO,
  "tostado-quemado": L.llama,
  "tostado-quemado|acre": L.llama,
  "tostado-quemado|cenizo": L.brasas,
  "tostado-quemado|ahumado": HUMO,
  "tostado-quemado|curtido": L.llama,
  "tostado-quemado|tostado-intenso": L.llama,
  "tostado-cereal": L.trigo,
  "tostado-cereal|grano": L.trigo,
  "tostado-cereal|malta": CEBADA,
  // Frutos secos / Cacao
  cacao: CHOCOLATE,
  "cacao-secos": L.nuez,
  "cacao-secos|cacahuate": MANI,
  "cacao-secos|avellana": L.nuez,
  "cacao-secos|almendra": ALMENDRA,
  "cacao-cacao": MAZORCA,
  "cacao-cacao|chocolate": CHOCOLATE,
  "cacao-cacao|chocolate-amargo": CHOCOLATE_AMARGO,
  // Dulce
  dulce: TARRO_MIEL,
  "dulce-morena": AZUCAR_MORENA,
  "dulce-morena|melaza": MELAZA,
  "dulce-morena|jarabe-de-maple": MAPLE,
  "dulce-morena|caramelizado": L.caramelo,
  "dulce-morena|miel": MIEL,
  "dulce-vainilla": VAINILLA,
  "dulce-vainilla|vainilla": VAINILLA,
  "dulce-vainilla|vainillina": VAINILLA,
  "dulce-vainilla|dulce-general": AZUCAR,
  "dulce-vainilla|aromatico-dulce": L.destellos,
};

/** El ícono de reserva: un grano de café (lo que no esté en la tabla, que el guardián impide). */
export const ICONO_DE_RESERVA: IconoDeSabor = deLucide(Bean);

/** El ícono de un punto de la rueda: el suyo, el de su subcategoría, el de su familia o el de reserva. */
export function iconoDeLaRueda(id: string): IconoDeSabor {
  if (ICONO_DE_LA_RUEDA[id]) return ICONO_DE_LA_RUEDA[id];
  const [sub] = id.split("|");
  if (ICONO_DE_LA_RUEDA[sub]) return ICONO_DE_LA_RUEDA[sub];
  const familia = sub.split("-")[0];
  return ICONO_DE_LA_RUEDA[familia] ?? ICONO_DE_RESERVA;
}

/** Pinta el ícono de un punto de la rueda. Se LLAMA (no se monta como `<Componente />`): los íconos son funciones puras
 *  sin estado, y así ninguna pantalla «crea un componente durante el render». */
export function IconoDeNota({ id, ...p }: PropsDeIcono & { id: string }) {
  return iconoDeLaRueda(id)(p);
}

/** La acidez del formato descriptivo: «dulce» (jugosa, frutal) o «seca» (herbal, agria); sin tipo, la gota. */
export const ICONO_DE_ACIDEZ: Readonly<Record<"dulce" | "seca" | "", IconoDeSabor>> = { dulce: ACIDEZ_DULCE, seca: ACIDEZ_SECA, "": ACIDO };

/** La sensación en boca: una por textura del formato (`TEXTURAS_EN_BOCA`); sin textura, las capas. */
export const ICONO_DE_TEXTURA: Readonly<Record<"rough" | "oily" | "smooth" | "drying" | "metallic" | "", IconoDeSabor>> = {
  rough: ASPERO,
  oily: ACEITE,
  smooth: SEDA,
  drying: ASTRINGENTE,
  metallic: METAL,
  "": TEXTURA,
};
