import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { costeUSD, type Uso } from "./precios";

// ── El registrador del consumo de IA ─────────────────────────────────────────
// Un solo sitio por el que pasan las CINCO vías de gasto de la plataforma:
//
//   lib/coffeed/claude.ts       → Direccionamiento, Coffeed, Datawave, RT-Scriptor
//   api/kaffetal-regal/next-step → el asesor «¿Y ahora qué?» de la Ficha
//   lib/arena/mejoras.ts        → las mejoras de Arena
//   lib/coffeed/gemini.ts       → extracción de vídeo
//   lib/coffeed/geminiImage.ts  → fotogramas de RT-Scriptor
//
// LA REGLA DE ORO: registrar el gasto NUNCA puede tumbar la operación que lo
// generó. Es la misma regla que `emitEvent()` de la espina de integración —
// esto no lanza jamás. Si la escritura falla, se anota en la consola y la
// llamada al modelo sigue su camino. Un libro de contabilidad con un hueco es
// un problema; una redacción que revienta porque no se pudo anotar el gasto es
// un problema peor.

export type ConsumoRegistrable = {
  proveedor: "anthropic" | "gemini";
  modelo: string;
  /** Qué parte de la plataforma gastó. Ver USOS abajo. */
  superficie: string;
  uso: Uso;
  ok?: boolean;
  error?: string | null;
  duracionMs?: number;
  actorId?: string | null;
};

/** Las superficies que gastan, en un sitio, para que el tablero no dependa de
 *  cadenas escritas a mano en siete archivos. */
export const USOS = {
  direccionamiento: "direccionamiento",
  coffeedRedaccion: "coffeed:redaccion",
  coffeedBarrido: "coffeed:barrido",
  coffeedVideo: "coffeed:video",
  datawave: "datawave",
  rtScriptor: "rt-scriptor",
  rtScriptorImagen: "rt-scriptor:imagen",
  krAsesor: "kr:asesor",
  arenaMejoras: "arena:mejoras",
  // `gvg:match` y `gvg:reporte` se retiran en V5.1: el CV App Manager se fue a
  // CommaaS y anota su gasto en el libro del hub. Las filas históricas de
  // `ai_usage` conservan esas cadenas y el tablero las sigue mostrando.
} as const;

export async function registrarConsumo(c: ConsumoRegistrable): Promise<void> {
  try {
    const uso: Uso = {
      tokens_entrada: c.uso.tokens_entrada || 0,
      tokens_salida: c.uso.tokens_salida || 0,
      tokens_cache_escritos: c.uso.tokens_cache_escritos || 0,
      tokens_cache_leidos: c.uso.tokens_cache_leidos || 0,
    };

    // El coste se calcula AQUÍ y se congela en la fila. Ver precios.ts.
    const costo = costeUSD(c.modelo, uso, new Date());

    const service = createServiceRoleClient();
    const { error } = await service.from("ai_usage").insert({
      proveedor: c.proveedor,
      modelo: c.modelo,
      superficie: c.superficie,
      ...uso,
      costo_usd: costo,
      ok: c.ok ?? true,
      error: c.error ?? null,
      duracion_ms: c.duracionMs ?? null,
      actor_id: c.actorId ?? null,
    });
    if (error) console.error("[consumo] no se pudo anotar:", error.message);
  } catch (e) {
    console.error("[consumo] no se pudo anotar:", e instanceof Error ? e.message : e);
  }
}

/** Lo que devuelve la API de Anthropic en `usage`, traducido a nuestras
 *  columnas. Los dos campos de caché son opcionales en la respuesta. */
export function usoDesdeAnthropic(u: unknown): Uso {
  const x = (u ?? {}) as Record<string, number | undefined>;
  return {
    tokens_entrada: x.input_tokens ?? 0,
    tokens_salida: x.output_tokens ?? 0,
    tokens_cache_escritos: x.cache_creation_input_tokens ?? 0,
    tokens_cache_leidos: x.cache_read_input_tokens ?? 0,
  };
}

/** Lo mismo para Gemini, que lo llama `usageMetadata` y cuenta distinto:
 *  `totalTokenCount` INCLUYE al prompt, así que la salida se deriva restando
 *  en vez de leerse — si se sumaran los dos campos tal cual, cada llamada
 *  contaría el prompt dos veces. */
export function usoDesdeGemini(u: unknown): Uso {
  const x = (u ?? {}) as Record<string, number | undefined>;
  const entrada = x.promptTokenCount ?? 0;
  const salida = x.candidatesTokenCount ?? Math.max(0, (x.totalTokenCount ?? 0) - entrada);
  return { tokens_entrada: entrada, tokens_salida: salida };
}
