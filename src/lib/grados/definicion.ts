// ── Grados de Calidad CTC · LA definición ────────────────────────────────────
// FUENTE ÚNICA. Cualquier sitio que hable de grados —la Arena, el catálogo de
// Cherry Picked, Kaffetal Regal, los cotizadores, Notion— tiene que salir de
// aquí. Si hay que cambiar un umbral, se cambia en este archivo y punto.
//
// POR QUÉ EXISTE (2026-08-05): los grados estaban definidos en TRES sitios con
// TRES respuestas distintas.
//   · Notion «Conceptos Fundamentales»: Black 80+ · Red 84+ · Blue 85+ · Gold 87+ · Tyrian 89+
//   · Notion «Pitch Go To Market»:      Black 80+ · Red 84+ · Blue 86+ · Gold 88+ · Tyrian 91+
//   · La plataforma:                    sin umbrales; el comité de la Jornada asignaba el grado
// Las dos páginas de Notion se contradecían entre sí, y las dos eran material
// que se le enseña a un cliente. El owner fijó los rangos definitivos y son los
// de abajo: **ninguna de las dos versiones anteriores era correcta**.
//
// ⚠️ CORRECCIÓN DEL OWNER (2026-08-19): LOS RANGOS DE ESTE ARCHIVO TAMBIÉN
// ESTABAN MAL. Decían Black 80–82.99 · Red 83–84.99 · Blue 85–86.99 · Gold
// 87–87.99 · Tyrian 88–100, y la escala de verdad es **de dos en dos**:
//
//     Black 80–82 · Red 82–84 · Blue 84–86 · Gold 86–88 · Tyrian 88+
//
// Escrita con la convención de este archivo —rango cerrado por ambos extremos y
// dos decimales como máximo— eso es 80–81.99 · 82–83.99 · 84–85.99 · 86–87.99 ·
// 88–100. El límite pertenece SIEMPRE al grado de arriba: un 84.00 es Blue, no
// Red, igual que un 88.00 es Tyrian. Es la única lectura que hace que las cinco
// bandas embaldosen sin solaparse.
//
// No fue un cambio de criterio: el archivo llevaba desde el 2026-08-05
// afirmando una escala que nadie había fijado así. Cambiarla mueve grados de
// lotes reales — ver el Log V37, V4.44.
//
// Notion debe MIRAR a esto, no al revés (ver docs/INTEGRACIONES_PLAN.md, §1).
//
// ── LAS TRES REGLAS (owner, 2026-08-05) ─────────────────────────────────────
// 1. EL PUNTAJE MANDA. El grado se lee del puntaje SCA y no se negocia. No es
//    una banda dentro de la cual alguien elige después: es el grado.
// 2. LOS CRITERIOS CUALITATIVOS SON GUÍA, NO PUERTA. Clase de lote, rareza de
//    variedad y disponibilidad por malla no cambian el grado — orientan el
//    VALOR dentro del rango. Un Blue de variedad exótica se cotiza en la parte
//    alta de Blue; sigue siendo Blue.
// 3. DOS DECIMALES COMO MÁXIMO. No existe un puntaje de 81.995. Esta regla es
//    la que hace que la escala no tenga huecos: las bandas cierran en .99, así
//    que un tercer decimal caería entre dos grados. Ver `puntajeValido`.

export type GradoId = "black" | "red" | "blue" | "gold" | "tyrian";

export type Grado = {
  id: GradoId;
  nombre: string;
  /** El lema. Es copy de cliente: se cita tal cual. */
  lema: string;
  /** Rango SCA cerrado por ambos extremos. */
  scaMin: number;
  scaMax: number;
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

/** De menor a mayor. El ORDEN importa: coincide con el enum `lot_grade` de
 *  Postgres (black → red → blue → gold → tyrian) y con la escalera visual. */
export const GRADOS: Grado[] = [
  {
    id: "black",
    nombre: "Black",
    lema: "The essence of origin",
    scaMin: 80,
    scaMax: 81.99,
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
    scaMin: 82,
    scaMax: 83.99,
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
    scaMin: 84,
    scaMax: 85.99,
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
    scaMin: 86,
    scaMax: 87.99,
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
    scaMin: 88,
    scaMax: 100,
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

/** El puntaje mínimo con el que un café entra en la escala. Por debajo no hay
 *  grado: no es que sea "peor que Black", es que no es café de especialidad. */
export const SCA_MINIMO = GRADOS[0].scaMin;
export const SCA_MAXIMO = GRADOS[GRADOS.length - 1].scaMax;

/** Los decimales que admite un puntaje de la casa. Regla 3 del owner. */
export const SCA_DECIMALES = 2;

/** Redondea a la precisión de la casa. Un puntaje con más decimales es un error
 *  de captura, no un puntaje distinto: 81.995 se registra como 82. */
export function redondeaPuntaje(sca: number): number {
  return Math.round(sca * 100) / 100;
}

/** ¿Es un puntaje que la casa puede escribir? Dentro de escala y con dos
 *  decimales como mucho. Sirve para VALIDAR una entrada antes de guardarla;
 *  `gradoPorPuntaje` es más indulgente a propósito (redondea). */
export function puntajeValido(sca: number): boolean {
  if (!Number.isFinite(sca)) return false;
  if (sca < SCA_MINIMO || sca > SCA_MAXIMO) return false;
  return redondeaPuntaje(sca) === sca;
}

/** EL grado de un puntaje, o null si está fuera de la escala.
 *
 *  El puntaje MANDA (regla 1 del owner, 2026-08-05): esto no propone un grado
 *  para que alguien lo confirme después — lo determina. Los criterios
 *  cualitativos de cada grado son guía de VALOR dentro del rango, no requisitos
 *  de entrada: un café de 88 en un macrolote de variedad común es Tyrian, y se
 *  cotizará en la parte baja de Tyrian.
 *
 *  Redondea a dos decimales antes de buscar, para que un tercer decimal —que no
 *  debería existir— no caiga en el hueco entre dos bandas. */
export function gradoPorPuntaje(sca: number): Grado | null {
  if (!Number.isFinite(sca)) return null;
  const p = redondeaPuntaje(sca);
  return GRADOS.find((g) => p >= g.scaMin && p <= g.scaMax) ?? null;
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

/** ¿La escala cubre 80–100 sin huecos ni solapes? Cierto SOLO bajo la regla de
 *  los dos decimales: el "hueco" entre 81.99 y 82 mide justo un centésimo, que
 *  es la resolución de la escala. Lo comprueba el guardián
 *  `scripts/qa-grados-check.mjs`; se expone para poder afirmarlo en la UI. */
export function escalaEsContinua(): boolean {
  for (let i = 1; i < GRADOS.length; i++) {
    const anterior = GRADOS[i - 1];
    const actual = GRADOS[i];
    if (actual.scaMin <= anterior.scaMax) return false; // solape
    if (Math.round((actual.scaMin - anterior.scaMax) * 100) !== 1) return false; // hueco
  }
  return true;
}

// ── LO QUE QUEDA POR ALINEAR ────────────────────────────────────────────────
// Las dudas de este archivo están cerradas (las tres reglas de arriba). Lo que
// sigue abierto es lo que TODAVÍA NO CITA esta definición:
//
// · LA JORNADA DE ARENA. Hoy el comité vota el grado directamente. Con la regla
//   1, lo que el comité aporta es el PUNTAJE; el grado se deriva. Cambiar eso
//   toca el flujo de la Jornada, así que no se ha tocado aquí: cuando se haga,
//   `gradoPorPuntaje` es la única función que debe decidirlo.
// · LAS DOS PÁGINAS DE NOTION («Conceptos Fundamentales» y «Pitch Go To
//   Market»). Siguen publicando umbrales viejos y contradictorios. Se
//   actualizan DESDE aquí (docs/INTEGRACIONES_PLAN.md, §1).
