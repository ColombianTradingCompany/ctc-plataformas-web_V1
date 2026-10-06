// ── Grados de Calidad CTC · LA definición ────────────────────────────────────
// FUENTE ÚNICA. Cualquier sitio que hable de grados —la Arena, el catálogo de
// Cherry Picked, Kaffetal Regal, los cotizadores, Notion— tiene que salir de
// aquí. Si hay que cambiar un umbral, se cambia en este archivo y punto.
//
// ⚠️ V5.160 (owner, 2026-10-06): «La definición de la franja [SCA de dos en dos] es OBSOLETA. Debemos retirarla de TODOS
// LADOS y dejar solo la regla del Punto y la Tríada.» Desde esta versión EL GRADO SE LEE DE LOS PUNTOS CTC
// (`src/lib/pvc/escala.ts`, decisión #1 del plan PVC, §9.1): la taza es el suelo y el surplus es la altura. Cada grado es
// una BANDA DE PUNTOS (Black 1000–1399 · Red 1400–1599 · Blue 1600–1799 · Gold 1800–2000 · Tyrian 2001–2500), y los
// puntos salen del Punto SCA de la taza × el multiplicador de la Tríada (variedad · proceso · reconocimiento, cada una C/B/A).
// Las bandas SCA que vivían aquí (80–81,99 · 82–83,99 · 84–85,99 · 86–87,99 · 88–100; V4.44 del 2026-08-19) ya no existen
// en el código: un café COMÚN (CCC) entra en Black desde SCA 82, es Red desde 84, Blue desde 88, Gold desde 89 y nunca es
// Tyrian; con surplus las bandas se adelantan (BCC a 86 ya es Blue). `escalaEsContinua` ahora afirma que las bandas de
// puntos embaldosan 1000–2500. Historia de los umbrales anteriores: Log V37 (V4.44) y CHANGELOG hasta la V5.159.
//
// LAS TRES REGLAS (owner, 2026-08-05) siguen, leídas sobre los puntos:
// 1. EL PUNTAJE MANDA — ahora «los puntos mandan»: el grado se lee de los puntos y no se negocia ni lo elige un comité.
// 2. LOS CRITERIOS CUALITATIVOS entran por la Tríada (variedad, proceso, reconocimiento) y por eso SÍ cambian el grado;
//    el resto (clase de lote, disponibilidad por malla) sigue siendo guía de VALOR dentro de la banda.
// 3. DOS DECIMALES COMO MÁXIMO en el Punto SCA. Ver `puntajeValido`.
//
// Notion debe MIRAR a esto, no al revés (ver docs/INTEGRACIONES_PLAN.md, §1).

import { BANDAS_PUNTOS, PUNTOS_MAX, PUNTOS_MIN, SCA_MINIMO_ESCALA, puntosCtc, scaMinimoPara, type Puntaje, type Triada } from "@/lib/pvc/escala";

export type GradoId = "black" | "red" | "blue" | "gold" | "tyrian";

export type Grado = {
  id: GradoId;
  nombre: string;
  /** El lema. Es copy de cliente: se cita tal cual. */
  lema: string;
  /** V5.160: la BANDA DE PUNTOS del grado (`escala.ts`), cerrada por ambos extremos. */
  puntosMin: number;
  puntosMax: number;
  /** El Punto SCA desde el que un café COMÚN (tríada CCC) alcanza este grado; null si no lo alcanza nunca (Tyrian). */
  scaDesdeComun: number | null;
  /** Token de color del sistema de diseño (globals.css). */
  colorVar: string;
  hex: string;
  /** El sello del grado (public/images/shared/grados/). Los cinco vienen del
   *  material de marca del owner y se sirven cuadrados sobre blanco: el arte
   *  original llega con recortes distintos (228×227, 237×219…) y sin fondo
   *  transparente, así que se normalizó a 420×420 para que el sello no salte
   *  de sitio al pasar de un grado a otro. Va aquí, y no en cada superficie,
   *  por la misma razón que los rangos SCA: es LA cara del grado. */
  logo: string;
  /** Clase de lote típica de este grado. */
  claseLote: string;
  /** Qué se espera de la variedad. */
  variedad: string;
  /** El resto de criterios, tal y como los enunció el owner. */
  criterios: string[];
};

const CCC: Triada = { variedad: "C", proceso: "C", reconocimiento: "C" };
/** El SCA desde el que un café común alcanza cada banda (se calcula de la escala, no se escribe a mano). */
// Sobre la rejilla del Punto (0,25): 87,99 redondearía a 1600 y diría «Blue desde 87,99», que no es un Punto que exista.
const SCA_DESDE_COMUN = Object.fromEntries(BANDAS_PUNTOS.map((b) => [b.id, scaMinimoPara(b.nombre, CCC, 0.25)])) as Record<GradoId, number | null>;

/** De menor a mayor. El ORDEN importa: coincide con el enum `lot_grade` de
 *  Postgres (black → red → blue → gold → tyrian) y con la escalera visual. */
export const GRADOS: Grado[] = [
  {
    id: "black",
    nombre: "Black",
    lema: "The essence of origin",
    puntosMin: 1000,
    puntosMax: 1399,
    scaDesdeComun: SCA_DESDE_COMUN.black,
    colorVar: "--t-black",
    hex: "#1A1C1E",
    logo: "/images/shared/grados/black.webp",
    claseLote: "Cosechas de temporada verificadas",
    variedad: "Variedades comunes",
    criterios: ["Cosechas de temporada verificadas", "Calidad buena habitual", "Variedades comunes"],
  },
  {
    id: "red",
    nombre: "Red",
    lema: "The soul of the harvest",
    puntosMin: 1400,
    puntosMax: 1599,
    scaDesdeComun: SCA_DESDE_COMUN.red,
    colorVar: "--t-red",
    hex: "#B01F24",
    logo: "/images/shared/grados/red.webp",
    claseLote: "Cosechas de temporada verificadas",
    variedad: "Variedades comunes o exóticas",
    criterios: ["Cosechas de temporada verificadas", "Calidad sobresaliente", "Variedades comunes o exóticas"],
  },
  {
    id: "blue",
    nombre: "Blue",
    lema: "The edge of perfection",
    puntosMin: 1600,
    puntosMax: 1799,
    scaDesdeComun: SCA_DESDE_COMUN.blue,
    colorVar: "--t-blue",
    hex: "#1F4FB0",
    logo: "/images/shared/grados/blue.webp",
    claseLote: "Macrolotes de origen único",
    variedad: "Variedades comunes o exóticas",
    criterios: [
      "Macrolotes de origen único",
      "Calidad superior",
      "Variedades comunes o exóticas",
      "Disponibilidad por malla",
    ],
  },
  {
    id: "gold",
    nombre: "Gold",
    lema: "The standard of excellence",
    puntosMin: 1800,
    puntosMax: 2000,
    scaDesdeComun: SCA_DESDE_COMUN.gold,
    colorVar: "--t-gold",
    hex: "#A87A14",
    logo: "/images/shared/grados/gold.webp",
    claseLote: "Microlotes exclusivos",
    variedad: "Variedades raras o exóticas",
    criterios: [
      "Microlotes exclusivos",
      "Cafés excepcionales",
      "Variedades raras o exóticas",
      "Calidad de competencia",
      "Disponibilidad por malla",
    ],
  },
  {
    id: "tyrian",
    nombre: "Tyrian",
    lema: "The highest rarity tier",
    puntosMin: 2001,
    puntosMax: 2500,
    scaDesdeComun: SCA_DESDE_COMUN.tyrian,
    colorVar: "--t-tyrian",
    hex: "#66023C",
    logo: "/images/shared/grados/tyrian.webp",
    claseLote: "Nanolotes raros",
    variedad: "Variedades raras",
    criterios: [
      "Nanolotes raros",
      "Cafés verdaderamente únicos",
      "Variedades raras",
      "Perfiles premiados",
      "Disponibilidad por malla",
    ],
  },
];

export const GRADO_POR_ID: Record<GradoId, Grado> = Object.fromEntries(
  GRADOS.map((g) => [g.id, g])
) as Record<GradoId, Grado>;

/** El Punto SCA mínimo con el que un café entra en la escala (puerta 0 de `escala.ts`). Por debajo no hay
 *  grado: no es que sea "peor que Black", es que no es café de especialidad. */
export const SCA_MINIMO = SCA_MINIMO_ESCALA;
export const SCA_MAXIMO = 100;
/** Los extremos de la escala de puntos (las bandas embaldosan de 1000 a 2500). */
export { PUNTOS_MIN, PUNTOS_MAX };

/** Los decimales que admite un puntaje de la casa. Regla 3 del owner. */
export const SCA_DECIMALES = 2;

/** Redondea a la precisión de la casa. Un puntaje con más decimales es un error
 *  de captura, no un puntaje distinto: 81.995 se registra como 82. */
export function redondeaPuntaje(sca: number): number {
  return Math.round(sca * 100) / 100;
}

/** ¿Es un Punto que la casa puede escribir? Dentro de escala y con dos
 *  decimales como mucho. Sirve para VALIDAR una entrada antes de guardarla. */
export function puntajeValido(sca: number): boolean {
  if (!Number.isFinite(sca)) return false;
  if (sca < SCA_MINIMO || sca > SCA_MAXIMO) return false;
  return redondeaPuntaje(sca) === sca;
}

/** EL grado de unos puntos CTC, o null si quedan por debajo de Black (o fuera de la escala). */
export function gradoPorPuntos(puntos: number): Grado | null {
  if (!Number.isFinite(puntos)) return null;
  const p = Math.round(puntos);
  return GRADOS.find((g) => p >= g.puntosMin && p <= g.puntosMax) ?? null;
}

/** EL grado de un lote: su Punto SCA (redondeado a dos decimales) × su Tríada → puntos → banda. Devuelve también los
 *  puntos y la puerta que actuó, para que la pantalla lo explique. Los puntos MANDAN (regla 1): esto no propone un grado
 *  para que alguien lo confirme después — lo determina. */
export function gradoDelLote(sca: number, triada: Triada): { grado: Grado | null; puntaje: Puntaje } {
  const puntaje = puntosCtc(Number.isFinite(sca) ? redondeaPuntaje(sca) : NaN, triada);
  return { grado: puntaje.banda ? GRADO_POR_ID[puntaje.banda.id as GradoId] ?? null : null, puntaje };
}

// ── «Mix» ───────────────────────────────────────────────────────────────────
// El Cotizador Logístico ofrece «Mix» junto a los cinco grados. NO es un sexto
// grado: significa que la carga cotizada no proviene de un solo grado. Por eso
// no está en el enum `lot_grade` de Postgres y no debe llegar nunca a un lote —
// un lote tiene un puntaje, y un puntaje tiene un grado. Vive donde tiene
// sentido: en una cotización, que puede cubrir varias calidades a la vez.
export const MIX = "Mix" as const;

/** ¿Es un grado de verdad? Devuelve false para «Mix». Úsalo antes de escribir
 *  cualquier cosa en una columna `lot_grade`. */
export function esGradoValido(v: string): v is GradoId {
  return v in GRADO_POR_ID;
}

/** ¿Las bandas de puntos embaldosan 1000–2500 sin huecos ni solapes? Lo comprueba el guardián
 *  `scripts/qa-grados-check.mjs`; se expone para poder afirmarlo en la UI. */
export function escalaEsContinua(): boolean {
  if (GRADOS[0].puntosMin !== PUNTOS_MIN || GRADOS[GRADOS.length - 1].puntosMax !== PUNTOS_MAX) return false;
  for (let i = 1; i < GRADOS.length; i++) {
    if (GRADOS[i].puntosMin !== GRADOS[i - 1].puntosMax + 1) return false;
  }
  return true;
}

// ── LO QUE QUEDA POR ALINEAR ────────────────────────────────────────────────
// · LA TRÍADA DE UN LOTE se deriva de su Ficha (`src/lib/pvc/triadaDelLote.ts`): la variedad contra el catálogo semilla
//   de `escala.ts` hasta que el comité publique el marco de mercado (plan PVC §11.2); el proceso por sus palabras; los
//   reconocimientos contados. Cuando exista el marco, la variedad se lee de ahí.
// · LA BASE FÍSICA (§9.1.b: factor, humedad, densidad) da el DERECHO al grado y no da puntos. Se exhibe
//   (`revisarBaseFisica`); todavía no cierra la puerta — decisión del owner pendiente.
// · LAS DOS PÁGINAS DE NOTION («Conceptos Fundamentales» y «Pitch Go To Market») siguen publicando umbrales SCA viejos.
//   Se actualizan DESDE aquí (docs/INTEGRACIONES_PLAN.md, §1).
