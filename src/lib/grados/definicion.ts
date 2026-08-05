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
// Notion debe MIRAR a esto, no al revés (ver docs/INTEGRACIONES_PLAN.md, §1).

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
    scaMax: 82.99,
    colorVar: "--t-black",
    hex: "#1A1C1E",
    claseLote: "Cosechas de temporada verificadas",
    variedad: "Variedades comunes",
    criterios: ["Cosechas de temporada verificadas", "Calidad buena habitual", "Variedades comunes"],
  },
  {
    id: "red",
    nombre: "Red",
    lema: "The soul of the harvest",
    scaMin: 83,
    scaMax: 84.99,
    colorVar: "--t-red",
    hex: "#B01F24",
    claseLote: "Cosechas de temporada verificadas",
    variedad: "Variedades comunes o exóticas",
    criterios: ["Cosechas de temporada verificadas", "Calidad sobresaliente", "Variedades comunes o exóticas"],
  },
  {
    id: "blue",
    nombre: "Blue",
    lema: "The edge of perfection",
    scaMin: 85,
    scaMax: 86.99,
    colorVar: "--t-blue",
    hex: "#1F4FB0",
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
    scaMin: 87,
    scaMax: 87.99,
    colorVar: "--t-gold",
    hex: "#A87A14",
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

/** El grado que le corresponde a un puntaje, o null si está fuera de la escala.
 *
 *  ⚠️ ATENCIÓN — el puntaje da la BANDA, no el grado entero. Los criterios
 *  cualitativos (clase de lote, rareza de variedad, disponibilidad por malla)
 *  son parte de la definición: un café de 88 en un macrolote de variedad común
 *  cumple la banda de Tyrian pero no su descripción. Por eso esto se llama
 *  `bandaPorPuntaje` y no `gradoPorPuntaje`: decide la Jornada, esto orienta.
 *  Ver la nota de decisión pendiente al final del archivo. */
export function bandaPorPuntaje(sca: number): Grado | null {
  if (!Number.isFinite(sca)) return null;
  return GRADOS.find((g) => sca >= g.scaMin && sca <= g.scaMax) ?? null;
}

/** ¿La escala cubre 80–100 sin huecos ni solapes? Lo comprueba el guardián
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

// ── DECISIONES PENDIENTES DEL OWNER ─────────────────────────────────────────
// 1. ¿El puntaje ES el grado, o es la banda y el comité decide dentro de ella?
//    Los criterios cualitativos sugieren lo segundo, y la Jornada está
//    construida sobre voto de comité. Mientras no se cierre, la Jornada sigue
//    mandando y esto es orientación.
// 2. «Mix» existe hoy SOLO en el Cotizador Logístico, no en el enum `lot_grade`.
//    Falta decidir si es un grado, un concepto de empaque, o una comodidad de
//    cotización que no debe llegar nunca a un lote.
