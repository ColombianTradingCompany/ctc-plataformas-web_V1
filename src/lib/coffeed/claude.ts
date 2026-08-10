import "server-only";

// ── Coffeed · el cliente de Claude, compartido ───────────────────────────────
// Fetch crudo a la API de Anthropic (patrón GVG/asesor). Vive aparte de
// aiActions desde el 2026-08-03 porque ya no lo usa una sola app: el Source
// Wrapper barre y redacta, Datawave busca las cifras de un episodio, y ambos
// necesitan el MISMO endurecimiento (reintentos, timeout, rescate del JSON).
// Duplicarlo era garantizar que solo una de las dos copias tuviera los
// arreglos aprendidos en vivo.
//
// NO lleva "use server": exporta constantes además de funciones, y un módulo
// de actions solo puede exportar async (lección del 2026-07-30).

type SearchResult = { type?: string; url?: string; title?: string };
type AnthropicBlock = { type: string; text?: string; content?: SearchResult[] };

import { registrarConsumo, usoDesdeAnthropic } from "@/lib/ai/consumo";

const API = "https://api.anthropic.com/v1/messages";
export const MODEL_CHEAP = "claude-haiku-4-5-20251001";
export const MODEL_WRITE = "claude-sonnet-5";

export const NO_KEY = "ANTHROPIC_API_KEY no está configurada en el servidor.";

// Dos cosas que este modelo NO admite, ambas verificadas en vivo contra la API:
//   · el prefill de assistant del prototipo (empezar la respuesta en "[") →
//     400 «This model does not support assistant message prefill» (2026-07-29).
//     El no-preámbulo se pide en el system y parseJson() rescata el primer
//     bloque JSON si el modelo igual antepone texto.
//   · el parámetro `fallbacks` que sí usa GVG con claude-opus-5 → 400
//     «'claude-sonnet-5' does not support the `fallbacks` parameter» (2026-07-30).
//     No copiar la cabecera de GVG a ciegas: el fallback es cosa de opus.
// ⚠️ TIEMPO (2026-07-30, medido en vivo): el `fetch` de Node (undici) corta a
// los 300 s de headersTimeout y el error que sale es un escueto «fetch failed».
// Un barrido de 14 medios en UNA petición con búsqueda web tardaba 5,1 min y
// moría justo ahí. La regla: cada petición tiene que caber MUY por debajo de
// ese techo — de ahí una llamada por medio y este timeout explícito, que falla
// rápido y deja que el reintento haga su trabajo.
// Una llamada con dos búsquedas web tarda ~40 s medidos (2026-07-30). 90 s da
// margen de sobra y acota el peor caso del barrido entero.
const REQUEST_TIMEOUT_MS = 90_000;

export type ClaudeSource = { url: string; title: string };

export type ClaudeOpts = {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  /** Búsqueda web del lado del servidor — solo donde hace falta salir a mirar. */
  webSearch?: number;
  timeoutMs?: number;
  /** Cuántas veces se reintenta un TIMEOUT (los 529/429 tienen su propia
   *  cuenta). Por defecto 1. Ponerlo a 0 cuando quien llama ya tiene su propio
   *  presupuesto de tiempo y no puede permitirse el doble: el peor caso real de
   *  una llamada es `timeoutMs × (1 + timeoutRetries)`, y esa multiplicación es
   *  fácil de olvidar al subir el techo — pasó el 2026-08-05, subir de 90 a
   *  150 s puso el peor caso en 300 s, justo el límite de la función. */
  timeoutRetries?: number;
  /** Qué parte de la plataforma está gastando, para el libro de consumo
   *  (`lib/ai/consumo.ts`). Opcional a propósito: sin él la llamada funciona
   *  igual y se anota como "desconocido" — anotar el gasto nunca puede ser
   *  requisito para poder gastar. Usa las constantes de `USOS`. */
  superficie?: string;
};

/** El texto Y las fuentes que la búsqueda web consultó.
 *  Datawave las CITA (una cifra sin procedencia no se publica), así que no
 *  puede usar `claude()` a secas, que se queda solo con el texto. */
export async function claudeSourced(opts: ClaudeOpts): Promise<{ text: string; sources: ClaudeSource[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error(NO_KEY);
  const t0 = Date.now();

  // 529 (overloaded) y 429 son transitorios y frecuentes — visto en vivo el
  // 2026-07-29. Dos reintentos con espera; cualquier otro error corta ya.
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 3000));
    let res: Response;
    try {
      res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: opts.model,
          max_tokens: opts.maxTokens ?? 2000,
          system: opts.system,
          ...(opts.webSearch ? { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: opts.webSearch }] } : {}),
          messages: [{ role: "user", content: opts.user }],
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      lastErr = timedOut ? "La petición tardó más de lo permitido y se abortó." : `Fallo de red: ${(e as Error).message}`;
      // Un timeout se reintenta UNA sola vez por defecto. Reintentarlo tres
      // veces multiplica la espera sin cambiar nada (la consulta lenta sigue
      // siendo lenta) y es lo que hacía que un barrido se fuera a diez minutos.
      if (timedOut && attempt >= (opts.timeoutRetries ?? 1)) break;
      continue;
    }
    if (res.ok) {
      const data = (await res.json()) as { content?: AnthropicBlock[]; stop_reason?: string; usage?: unknown };
      // El gasto se anota ANTES de cualquier salida por error: una respuesta
      // cortada por max_tokens ya se pagó entera, y si se anotara después del
      // `throw` sería justo el gasto caro el que no quedaría registrado.
      void registrarConsumo({
        proveedor: "anthropic",
        modelo: opts.model,
        superficie: opts.superficie ?? "desconocido",
        uso: usoDesdeAnthropic(data.usage),
        ok: data.stop_reason !== "max_tokens",
        error: data.stop_reason === "max_tokens" ? "cortada por max_tokens" : null,
        duracionMs: Date.now() - t0,
      });
      // Un JSON cortado a la mitad falla en parseJson con un error críptico de
      // posición; aquí se nombra la causa real (2026-07-30, visto en vivo con
      // las 3 propuestas y max_tokens corto).
      if (data.stop_reason === "max_tokens") {
        throw new Error("La respuesta se cortó por longitud (max_tokens). Reintenta: si se repite, hay que subir el tope de este paso.");
      }
      const blocks = data.content ?? [];
      const text = blocks
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("");

      const seen = new Set<string>();
      const sources: ClaudeSource[] = [];
      for (const b of blocks) {
        if (b.type !== "web_search_tool_result" || !Array.isArray(b.content)) continue;
        for (const r of b.content) {
          if (r?.type === "web_search_result" && r.url && !seen.has(r.url)) {
            seen.add(r.url);
            sources.push({ url: r.url, title: r.title || r.url });
          }
        }
      }
      return { text, sources: sources.slice(0, 5) };
    }
    lastErr = `Claude ${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (res.status !== 529 && res.status !== 429) break;
  }
  // Una llamada que nunca llegó a responder no gastó tokens, pero SÍ gastó
  // tiempo — y un patrón de fallos es justo lo que hay que poder ver en el
  // tablero cuando la factura no cuadra con lo que se produjo.
  void registrarConsumo({
    proveedor: "anthropic",
    modelo: opts.model,
    superficie: opts.superficie ?? "desconocido",
    uso: { tokens_entrada: 0, tokens_salida: 0 },
    ok: false,
    error: lastErr.slice(0, 300),
    duracionMs: Date.now() - t0,
  });
  throw new Error(lastErr);
}

/** El caso común: solo el texto. Lo usa todo el Source Wrapper. */
export async function claude(opts: ClaudeOpts): Promise<string> {
  return (await claudeSourced(opts)).text;
}

export function parseJson<T>(raw: string): T {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    // Rescate: quedarse con el primer bloque {...} o [...]
    const m = clean.match(/[[{][\s\S]*[\]}]/);
    if (!m) throw new Error("Claude no devolvió JSON parseable");
    return JSON.parse(m[0]) as T;
  }
}
