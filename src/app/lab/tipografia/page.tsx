import type { Metadata } from "next";
import {
  Fraunces,
  Playfair_Display,
  Instrument_Serif,
  DM_Serif_Display,
  Bodoni_Moda,
  Cormorant_Garamond,
  Zilla_Slab,
  Archivo_Black,
} from "next/font/google";
import { TipografiaLab, type FontOption } from "@/components/lab/TipografiaLab";

// ── Laboratorio de tipografía del titular (2026-08-11) ───────────────────────
// Pedido del owner: poder probar el titular del hero con distintas familias y
// tamaños sin que cada prueba sea un despliegue.
//
// POR QUÉ ES UNA RUTA DE VERDAD Y NO UNA MAQUETA SUELTA: `next/font` solo carga
// familias declaradas en tiempo de compilación, así que la única forma de ver
// las candidatas CON SU TIPOGRAFÍA REAL —y no una sustituta del sistema— es que
// vivan en el proyecto. Las ocho de abajo se cargan SOLO en esta ruta; ninguna
// entra en el bundle de las páginas públicas.
//
// No está enlazada desde ningún sitio y `robots.ts` la excluye.
//
// ⚠️ NO BORRAR (decisión del owner, 2026-08-13). Nació para una pregunta
// concreta —qué familia lleva el titular— y esa pregunta ya se respondió (se
// queda Fraunces). Pero el owner decidió CONSERVAR la ruta y convertirla en un
// pequeño taller para probar estilos y piezas reutilizables sin que cada prueba
// sea un despliegue. Es decir: dejó de ser un laboratorio de un solo uso
// pendiente de limpieza, y pasó a ser infraestructura de trabajo.
//
// Si algún día se amplía, el sitio natural es añadir vistas hermanas bajo
// `app/lab/` reusando este mismo patrón: la ruta paga el coste de compilar sus
// dependencias (aquí, ocho familias) y ninguna llega al bundle público.

export const metadata: Metadata = {
  title: "Laboratorio de tipografía · CTC",
  robots: { index: false, follow: false },
};

// `display:"swap"` en todas: es un laboratorio, importa ver algo ya.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--lab-fraunces", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--lab-playfair", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--lab-instrument", display: "swap" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--lab-dmserif", display: "swap" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--lab-bodoni", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], variable: "--lab-cormorant", display: "swap" });
const zilla = Zilla_Slab({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], variable: "--lab-zilla", display: "swap" });
const archivo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--lab-archivo", display: "swap" });

// `variable` da el nombre de la variable CSS; `hasItalic` evita prometer una
// cursiva que la familia no trae y que el navegador sintetizaría inclinando la
// redonda — que se nota, y mal.
const FONTS: FontOption[] = [
  { id: "fraunces", name: "Fraunces", note: "La actual · serif variable con óptica", varName: "--lab-fraunces", hasItalic: true, weights: [400, 500, 600, 700, 800, 900] },
  { id: "playfair", name: "Playfair Display", note: "Alto contraste, editorial clásico", varName: "--lab-playfair", hasItalic: true, weights: [400, 500, 600, 700, 800, 900] },
  { id: "instrument", name: "Instrument Serif", note: "Ligera y afilada, muy de revista", varName: "--lab-instrument", hasItalic: true, weights: [400] },
  { id: "dmserif", name: "DM Serif Display", note: "Serif de titular, redonda y sólida", varName: "--lab-dmserif", hasItalic: true, weights: [400] },
  { id: "bodoni", name: "Bodoni Moda", note: "Didona: contraste extremo, de lujo", varName: "--lab-bodoni", hasItalic: true, weights: [400, 500, 600, 700, 800, 900] },
  { id: "cormorant", name: "Cormorant Garamond", note: "Garalda delicada, aire de libro", varName: "--lab-cormorant", hasItalic: true, weights: [400, 600, 700] },
  { id: "zilla", name: "Zilla Slab", note: "Egipcia: robusta, de imprenta", varName: "--lab-zilla", hasItalic: true, weights: [400, 600, 700] },
  { id: "archivo", name: "Archivo Black", note: "Palo seco pesado, sin serif", varName: "--lab-archivo", hasItalic: false, weights: [400] },
];

export default function LabTipografiaPage() {
  const shell = [
    fraunces.variable,
    playfair.variable,
    instrument.variable,
    dmSerif.variable,
    bodoni.variable,
    cormorant.variable,
    zilla.variable,
    archivo.variable,
  ].join(" ");

  // `data-theme` NO es decorativo: los tokens de color (--card, --line, --paper…)
  // están declarados bajo `[data-theme="…"]` en globals.css, no en `:root`. Sin
  // el atributo, `background:var(--card)` y `border:1px solid var(--line)` son
  // declaraciones INVÁLIDAS y el navegador las tira enteras — los botones salían
  // sin fondo y sin borde, con el radio y el relleno puestos. Es el tema de CTC
  // Home porque el titular que se está probando es el suyo.
  return (
    <div className={shell} data-theme="ctc-home">
      <TipografiaLab fonts={FONTS} />
    </div>
  );
}
