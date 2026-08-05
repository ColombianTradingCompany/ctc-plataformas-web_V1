// ── Coffeed · Gemini, SOLO para vídeo ────────────────────────────────────────
// Hermano pequeño de `claude.ts`, con un único trabajo: leer un vídeo de
// YouTube de verdad. La búsqueda web de Anthropic no ve un vídeo — la
// extracción trabajaba de oídas con el titular y las marcas de tiempo que
// escribía no estaban ancladas en nada, que en Coffeed es descalificante:
// la premisa entera es que cada afirmación señala su fuente.
//
// Gemini ingiere la URL del vídeo (audio E imagen) vía la Interactions API:
//   POST /v1beta/interactions
//   { model, input: [{type:"text",…},{type:"video",uri:"https://youtube…"}] }
//
// Límites del nivel gratuito que importan (docs, 2026-08): 8 horas de vídeo de
// YouTube al día, solo vídeos PÚBLICOS. Para 2-3 piezas por capítulo, sobra.
//
// ⚠️ La forma de la RESPUESTA REST no está documentada con claridad
// (el SDK expone `output_text`; el REST aparenta ser `steps[].content[].text`).
// Por eso `textoDe()` prueba las formas conocidas y quien llama tiene SIEMPRE
// una caída al camino de texto: si esto falla, la extracción sale peor, no
// se rompe.

const API = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODELO = "gemini-3.5-flash";
const TIMEOUT_MS = 150_000;

const NO_KEY = "GEMINI_API_KEY sin configurar";

export function geminiDisponible(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type Nodo = Record<string, unknown>;

/** Saca el texto de la respuesta sin casarse con una forma exacta: primero los
 *  campos documentados, y si no, un recorrido que junta cualquier `text`. */
function textoDe(data: Nodo): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text;
  const out: string[] = [];
  const visita = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(visita);
    if (!n || typeof n !== "object") return;
    const o = n as Nodo;
    // `text` suelto SOLO si no es un bloque de otra cosa (thought, etc.).
    if (typeof o.text === "string" && (o.type === "text" || o.type === undefined)) out.push(o.text);
    for (const k of ["steps", "content", "output", "outputs", "parts", "candidates"]) {
      if (k in o) visita(o[k]);
    }
  };
  visita(data);
  return out.join("");
}

/**
 * Le pasa el VÍDEO a Gemini con un prompt y devuelve el texto. Lanza con un
 * mensaje nombrable si algo va mal — quien llama decide si cae al camino de
 * texto o aborta.
 */
export async function geminiVideo(opts: { videoUrl: string; system: string; user: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error(NO_KEY);

  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: MODELO,
      // La Interactions API no muestra campo de sistema en los ejemplos: las
      // instrucciones van delante del encargo, separadas con claridad.
      input: [
        { type: "text", text: `${opts.system}\n\n---\n\n${opts.user}` },
        { type: "video", uri: opts.videoUrl },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const cuerpo = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Gemini respondió ${res.status}: ${cuerpo}`);
  }
  const data = (await res.json()) as Nodo;
  const texto = textoDe(data).trim();
  if (!texto) {
    // La forma de la respuesta cambió o vino vacía. Se nombra la causa para el
    // log; la extracción caerá al camino de texto y la pieza no se pierde.
    throw new Error("Gemini devolvió una respuesta sin texto reconocible.");
  }
  return texto;
}
