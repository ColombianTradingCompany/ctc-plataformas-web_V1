import { TEXTOS_EN } from "./en";
import { TEXTOS_ES, type TextosDelOs } from "./es";

// ── CTCx OS · qué textos pinta una vista (F3) · PURO ─────────────────────────
// Una fuente por idioma (`es.ts`, `en.ts`) y una sola puerta para leerlas. Mientras no exista el
// conmutador ES/EN del juego (pista de idiomas, CAN-29), todo pide el español: el idioma por defecto.

export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = "es";

const TEXTOS: Record<Idioma, TextosDelOs> = { es: TEXTOS_ES, en: TEXTOS_EN };

export function textosDelOs(idioma: Idioma = IDIOMA_POR_DEFECTO): TextosDelOs {
  return TEXTOS[idioma];
}

export type { TextosDelOs };
