// ── La escala de puntos CTC · «El Punto y la Tríada» ─────────────────────────
// El modelo del §9.1 de docs/PVC_BCP_PLAN.md, decidido por el owner el
// 2026-09-15 y afinado el 16.
//
// ⚠️ ESTO NO GOBIERNA TODAVÍA. La fuente única de grados sigue siendo
// `src/lib/grados/definicion.ts` (contrato de ALINEACION §1: Black 80–81.99 …
// Tyrian 88+, el puntaje manda). Este módulo es la escala QUE VIENE: existe
// para que el owner la valide con la calculadora antes de que la fase 2 la
// lleve a `definicion.ts`. Mientras tanto se exhibe y se calcula; no se
// escribe en ningún lote ni en ninguna oferta.
//
// PURO y sin `server-only`, como `motor.ts` y `lectura.ts`: lo importan la
// pantalla del BCP y el guardián `qa-pvc-escala.mjs`.
//
// LA DOCTRINA, en una línea: la taza es el suelo y el surplus es la altura. El
// SCA es el ancla —sin él no hay grado— pero no es lo único: tres atributos que
// la taza no puede ver (de qué planta viene, qué manos la beneficiaron, quién
// más la ha mirado) multiplican, porque el mismo atributo vale más cuanto mejor
// es la taza que lo sostiene.

export type Nivel = "C" | "B" | "A";
export type Atributo = "variedad" | "proceso" | "reconocimiento";
export type Triada = { variedad: Nivel; proceso: Nivel; reconocimiento: Nivel };

export const NIVELES: Nivel[] = ["C", "B", "A"];

/** El orden en que se escriben las letras: SIEMPRE variedad · proceso ·
 *  reconocimiento. «BCC» es variedad exótica con proceso y reconocimiento
 *  comunes. */
export const ORDEN_TRIADA: Atributo[] = ["variedad", "proceso", "reconocimiento"];

export const letras = (t: Triada): string => `${t.variedad}${t.proceso}${t.reconocimiento}`;

export const ATRIBUTOS: Record<Atributo, { nombre: string; niveles: Record<Nivel, string> }> = {
  variedad: {
    nombre: "Variedad",
    niveles: {
      C: "Regional / Tradicional",
      B: "Especial / Híbrido",
      A: "Exótica / Rara",
    },
  },
  proceso: {
    nombre: "Proceso",
    niveles: {
      C: "Lavado",
      B: "Honey · Natural · infusiones",
      A: "Experimental · fermentaciones · co-fermentaciones",
    },
  },
  reconocimiento: {
    nombre: "Reconocimiento",
    niveles: {
      C: "Ninguno",
      B: "1 a 3",
      A: "4 o más",
    },
  },
};

// ── Las bandas de puntos ────────────────────────────────────────────────────
// Se alejan a propósito de las cifras SCA: que un Gold sea «1800» y no «88»
// evita que la escala se lea como una tergiversación del puntaje.

export type BandaPuntos = { id: string; nombre: string; min: number; max: number; hex: string };

export const BANDAS_PUNTOS: BandaPuntos[] = [
  { id: "black", nombre: "Black", min: 1000, max: 1399, hex: "#1A1C1E" },
  { id: "red", nombre: "Red", min: 1400, max: 1599, hex: "#B01F24" },
  { id: "blue", nombre: "Blue", min: 1600, max: 1799, hex: "#1F4FB0" },
  { id: "gold", nombre: "Gold", min: 1800, max: 2000, hex: "#A87A14" },
  { id: "tyrian", nombre: "Tyrian", min: 2001, max: 2500, hex: "#66023C" },
];

export const PUNTOS_MIN = 1000;
export const PUNTOS_MAX = 2500;
/** El techo de un café sin surplus. Es la otra mitad de la definición de K. */
export const TECHO_COMUN = 1990;
/** Tyrian no se alcanza solo con la taza: exige este SCA **y** surplus. */
export const SCA_TYRIAN = 89;
/** Debajo de esto no hay café de especialidad, y no hay atributo que lo salve. */
export const SCA_MINIMO_ESCALA = 80;
/** Entre 80 y esto, un café común no entra; con surplus entra «como un 82». */
export const SCA_ENTRADA_PLENA = 82;

/** Las anclas de la línea CCC, calcadas de la gráfica del owner. El ancla de 86
 *  subió de 1500 a 1540 el 2026-09-16: con ella, una sola letra B a 86 ya es
 *  Blue (BCC:86 = 1606), que es lo que el owner pidió. */
export const ANCLAS: [number, number][] = [
  [82, 1000], [84, 1400], [86, 1540], [88, 1600], [89, 1800], [100, TECHO_COMUN],
];

/** Por debajo de 82 la línea sigue con la misma pendiente que 82→84: 200 puntos
 *  por punto SCA. Así CCC:80 = 600 — lejos de 1000 y proporcional, como pidió
 *  el owner (en su gráfica de ejemplo eran 500). */
const PENDIENTE_BAJA = 200;

export function baseSca(sca: number): number {
  if (!Number.isFinite(sca)) return 0;
  if (sca < ANCLAS[0][0]) return Math.max(0, ANCLAS[0][1] - PENDIENTE_BAJA * (ANCLAS[0][0] - sca));
  for (let i = 1; i < ANCLAS.length; i++) {
    const [x0, y0] = ANCLAS[i - 1], [x1, y1] = ANCLAS[i];
    if (sca <= x1) return y0 + ((y1 - y0) * (sca - x0)) / (x1 - x0);
  }
  return TECHO_COMUN;
}

export const peso = (n: Nivel): number => (n === "A" ? 2 : n === "B" ? 1 : 0);
export const pesoTotal = (t: Triada): number => peso(t.variedad) + peso(t.proceso) + peso(t.reconocimiento);

/** K no se elige a mano: es exactamente lo que lleva el techo de un café común
 *  (1990) al techo de la escala (2500) con las tres letras en A. De ahí salen
 *  +4,27 % por cada B y +8,54 % por cada A. */
export const K = (PUNTOS_MAX / TECHO_COMUN - 1) / 6;

export const multiplicador = (t: Triada): number => 1 + K * pesoTotal(t);

export type Puntaje = {
  puntos: number;
  base: number;
  mult: number;
  banda: BandaPuntos | null;
  /** Qué puerta actuó, si actuó alguna. Es lo que la pantalla explica. */
  puerta: null | "sin-especialidad" | "umbral-sin-surplus" | "umbral-con-surplus" | "tope-tyrian" | "techo";
};

/**
 * Los puntos de un lote. Las tres puertas del owner, cumplidas por
 * construcción:
 *
 *  · SCA < 80 → sin grado, sea cual sea el surplus (el multiplicador no aplica).
 *  · 80–81,99 → el café común se queda fuera (600–999); con al menos un B o un
 *    A entra «como si fuera un 82», que es continuo con lo que ese mismo
 *    surplus vale a 82.
 *  · Tyrian exige SCA ≥ 89 **y** surplus: un AAA de 88 se topa en 2000 (Gold) y
 *    un CCC no llega nunca.
 */
export function puntosCtc(sca: number, t: Triada): Puntaje {
  const base = baseSca(sca);
  const mult = multiplicador(t);
  const conSurplus = pesoTotal(t) > 0;

  if (!Number.isFinite(sca) || sca < SCA_MINIMO_ESCALA) {
    const p = Math.round(base);
    return { puntos: p, base, mult, banda: bandaDePuntos(p), puerta: "sin-especialidad" };
  }

  let puntos: number;
  let puerta: Puntaje["puerta"] = null;
  if (sca < SCA_ENTRADA_PLENA) {
    puntos = conSurplus ? Math.round(PUNTOS_MIN * mult) : Math.round(base);
    puerta = conSurplus ? "umbral-con-surplus" : "umbral-sin-surplus";
  } else {
    puntos = Math.round(base * mult);
  }

  const tyrianOk = sca >= SCA_TYRIAN && conSurplus;
  if (!tyrianOk && puntos > 2000) {
    puntos = 2000;
    puerta = "tope-tyrian";
  }
  if (puntos > PUNTOS_MAX) {
    puntos = PUNTOS_MAX;
    puerta = "techo";
  }
  return { puntos, base, mult, banda: bandaDePuntos(puntos), puerta };
}

export function bandaDePuntos(puntos: number): BandaPuntos | null {
  return BANDAS_PUNTOS.find((b) => puntos >= b.min && puntos <= b.max) ?? null;
}

/** El SCA mínimo con el que una tríada alcanza una banda. Es la tabla que
 *  enseña de un vistazo que el surplus adelanta las bandas pero nunca las
 *  regala, y que Tyrian tiene un suelo que no se mueve. */
export function scaMinimoPara(banda: string, t: Triada, paso = 0.01): number | null {
  for (let s = 78; s <= 100.0001; s = Math.round((s + paso) * 100) / 100) {
    const r = puntosCtc(s, t);
    if (r.banda?.nombre === banda) return s;
  }
  return null;
}

// ── La Base física: la puerta previa (§9.1.b) ───────────────────────────────
// No suma ni resta puntos. Da el DERECHO a que el lote lleve un grado. Un lote
// que no la cumple queda «apto en taza, pendiente de físico».

export const FACTOR_MINIMO = 94;
export const HUMEDAD_MIN = 10;
export const HUMEDAD_MAX = 12;

export type BaseFisica = {
  /** Factor de rendimiento. La casa pide > 94. */
  factor: number | null;
  /** Humedad en %. Entre 10 y 12. */
  humedad: number | null;
  /** ¿La densidad cae en el rango de referencia de su variedad? La tabla
   *  `DENSIDAD_REFERENCIA` por variedad está pendiente del comité, así que hoy
   *  esto se declara, no se calcula. */
  densidadEnRango: boolean | null;
};

export type ChequeoFisico = { id: keyof BaseFisica; nombre: string; ok: boolean | null; detalle: string };

export function revisarBaseFisica(b: BaseFisica): { cumple: boolean; pendiente: boolean; checks: ChequeoFisico[] } {
  const checks: ChequeoFisico[] = [
    {
      id: "factor",
      nombre: "Factor de rendimiento",
      ok: b.factor == null ? null : b.factor > FACTOR_MINIMO,
      detalle: `mayor que ${FACTOR_MINIMO}`,
    },
    {
      id: "humedad",
      nombre: "Humedad",
      ok: b.humedad == null ? null : b.humedad >= HUMEDAD_MIN && b.humedad <= HUMEDAD_MAX,
      detalle: `entre ${HUMEDAD_MIN} y ${HUMEDAD_MAX} %`,
    },
    {
      id: "densidadEnRango",
      nombre: "Densidad",
      ok: b.densidadEnRango,
      detalle: "dentro del rango de su variedad",
    },
  ];
  return {
    cumple: checks.every((c) => c.ok === true),
    pendiente: checks.some((c) => c.ok === null),
    checks,
  };
}

// ── El catálogo semilla de variedades (§9.1) ────────────────────────────────
// La clasificación DEFINITIVA saldrá del marco de mercado (`pvc_marco_mercado`,
// §11.2), que se publica en enero y julio. Esto es el fallback: lo que vale
// mientras no haya marco publicado, y lo que la pantalla enseña como referencia.
// Toda variedad fuera del catálogo se trata como C hasta que el comité la
// clasifique.

export const VARIEDADES_SEMILLA: Record<Nivel, string[]> = {
  C: ["Castillo", "Caturra", "Colombia", "Typica", "Mundo Novo", "Cenicafé 1", "Lempira", "Catimor", "Garnica"],
  B: ["Tabi", "Bourbon Rosado (Pink Bourbon)", "Pacamara", "Maragogype", "SL28 y SL34", "Java", "Maracaturra", "Ruiru 11", "Batian", "Sarchimor", "Obatá", "Catuaí", "Bourbon (Rojo y Amarillo)"],
  A: ["Geisha (Gesha)", "Chiroso", "Sudan Rume", "Wush Wush", "Eugenioides", "Laurina (Bourbon Pointu)", "Mokka", "Papayo", "Aji", "Purpurascens", "Sidra"],
};

/** Filas que el owner todavía no ha confirmado (§9.1): la tabla las deja en C o
 *  en B según la fuente, y la reunión G&G pedía moverlas. Se marcan en la
 *  pantalla en vez de decidirse en silencio. */
export const VARIEDADES_EN_DUDA = ["Caturra", "Catuaí", "Bourbon (Rojo y Amarillo)"];
