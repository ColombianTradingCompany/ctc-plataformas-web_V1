// ── Tarifas de los modelos de IA · LA definición ─────────────────────────────
// FUENTE ÚNICA del precio por token. Módulo PURO (sin red, sin servidor) para
// que el guardián `scripts/qa-consumo-check.mjs` pueda comprobar la aritmética
// sin levantar nada.
//
// Precios en USD por MILLÓN de tokens, tarifa de primera parte de Anthropic
// (la misma que aplica en Microsoft Foundry; Bedrock y Vertex facturan aparte
// y no las usamos). Verificadas contra la documentación de la API el
// 2026-08-10 — si alguien las actualiza, que anote la fecha aquí.
//
// ⚠️ EL PRECIO SE CONGELA AL INSERTAR la fila de `ai_usage`, no se recalcula al
// leer. Cambiar una tarifa aquí afecta a lo que se gaste A PARTIR de ahora y
// NUNCA reescribe el histórico — misma regla que `arena_inscriptions`.

/** USD por millón de tokens. */
export type Tarifa = {
  entrada: number;
  salida: number;
  /** Escribir en la caché de prompt cuesta más que la entrada normal (TTL de 5 min). */
  factorEscrituraCache?: number;
  /** Leer de la caché es lo barato: la palanca de ahorro de verdad. */
  factorLecturaCache?: number;
  /** Precio de lanzamiento, si el modelo está en uno. */
  promo?: { entrada: number; salida: number; hasta: string };
  nota?: string;
};

const ESCRITURA_CACHE = 1.25; // TTL de 5 minutos (el de 1 h es 2x; no lo usamos)
const LECTURA_CACHE = 0.1;

export const TARIFAS: Record<string, Tarifa> = {
  // Los dos que la plataforma usa de verdad hoy.
  "claude-sonnet-5": {
    entrada: 3,
    salida: 15,
    // 📌 OJO AL CALENDARIO: hasta el 2026-08-31 Sonnet 5 va a precio de
    // lanzamiento. El 1 de septiembre la misma llamada cuesta un 50% más, sin
    // que nadie toque una línea de código. Es el modelo de MODEL_WRITE, o sea
    // el que pagan Direccionamiento, Coffeed, Datawave y RT-Scriptor.
    promo: { entrada: 2, salida: 10, hasta: "2026-08-31" },
  },
  "claude-opus-5": { entrada: 5, salida: 25, nota: "sin uso en CTC desde V5.1 (se fue con el CV App Manager)" },
  "claude-haiku-4-5": { entrada: 1, salida: 5, nota: "MODEL_CHEAP de Coffeed" },
  "claude-haiku-4-5-20251001": { entrada: 1, salida: 5 },

  // Los que no usamos ahora pero están a un cambio de constante de distancia.
  "claude-opus-4-8": { entrada: 5, salida: 25 },
  "claude-opus-4-7": { entrada: 5, salida: 25 },
  "claude-opus-4-6": { entrada: 5, salida: 25 },
  "claude-sonnet-4-6": { entrada: 3, salida: 15 },
  "claude-fable-5": { entrada: 10, salida: 50 },

  // GEMINI: A PROPÓSITO SIN TARIFA.
  // No se inventa un número. Los tokens se guardan igual y el coste queda en
  // NULL, que el tablero muestra como «sin tarifa». Para encenderlo: mirar el
  // precio real en Google AI Studio y añadir la entrada aquí — el histórico ya
  // guardado NO se recalcula, solo cuenta a partir de entonces.
};

/** Lo que hay que rellenar para que Gemini deje de aparecer sin coste. */
export const SIN_TARIFA_CONOCIDA = ["gemini-3.5-flash", "gemini-3-pro-image"];

export type Uso = {
  tokens_entrada: number;
  tokens_salida: number;
  tokens_cache_escritos?: number;
  tokens_cache_leidos?: number;
};

/** La tarifa vigente de un modelo en una fecha dada (aplica la promo si toca). */
export function tarifaVigente(modelo: string, fecha: Date): Tarifa | null {
  const t = TARIFAS[modelo];
  if (!t) return null;
  if (t.promo && fecha.toISOString().slice(0, 10) <= t.promo.hasta) {
    return { ...t, entrada: t.promo.entrada, salida: t.promo.salida };
  }
  return t;
}

/** El coste en USD de una llamada, o null si no hay tarifa publicada.
 *
 *  `null` NO es cero: significa «no lo sabemos». El tablero los cuenta aparte
 *  para que un total bajo nunca se lea como un total completo. */
export function costeUSD(modelo: string, uso: Uso, fecha: Date): number | null {
  const t = tarifaVigente(modelo, fecha);
  if (!t) return null;

  const porMillon = (tokens: number, precio: number) => (tokens / 1_000_000) * precio;

  const total =
    porMillon(uso.tokens_entrada, t.entrada) +
    porMillon(uso.tokens_salida, t.salida) +
    porMillon(uso.tokens_cache_escritos ?? 0, t.entrada * (t.factorEscrituraCache ?? ESCRITURA_CACHE)) +
    porMillon(uso.tokens_cache_leidos ?? 0, t.entrada * (t.factorLecturaCache ?? LECTURA_CACHE));

  // Seis decimales: una llamada barata de Haiku cuesta millonésimas de dólar y
  // redondear a céntimos la convertiría en cero.
  return Math.round(total * 1_000_000) / 1_000_000;
}

/** Para el tablero: "$0.0123" o "—" cuando no hay tarifa. */
export function formatoUSD(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "$0";
  if (v < 0.01) return `$${v.toFixed(6)}`;
  return `$${v.toFixed(4)}`;
}
