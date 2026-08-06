import "server-only";

// ── RT-Scriptor · fase 2: el fotograma como IMAGEN ───────────────────────────
//
// POR QUÉ AQUÍ Y NO EN MAKE. El plan decía «Gemini vía Make». Al ir a montarlo,
// las conexiones reales del equipo de Make son ClickUp, Canva, Gmail, Google,
// Notion y OpenAI: **no hay conexión de Gemini**. Y la plataforma SÍ tiene su
// clave (`GEMINI_API_KEY` en Vercel, la misma que ya lee vídeo en Coffeed), con
// una nota escrita en el registro del ECP que dice exactamente eso: la usa la
// plataforma, no Make. Así que el reparto correcto es el que ya existía:
//
//   Gemini  → aquí, con nuestra clave.
//   Canva   → en Make, que es donde vive ese OAuth y donde no lo tenemos.
//
// EL FOTOGRAMA DIBUJADO NO SE TIRA. Es la referencia de composición: el encuadre
// exacto —quién está dónde, con qué óptica, desde qué altura— que el modelo
// tiene que respetar. Se manda como imagen junto al prompt. Sin él, «primer
// plano de Ana a 175 cm» es una frase; con él, es un encuadre.
//
// ⚠️ SIN PROBAR EN VIVO. La clave vive solo en Vercel, así que esto no se ha
// ejecutado ni una vez desde local. Por eso está escrito para FALLAR BLANDO: si
// la llamada se cae, si el modelo no existe o si la respuesta viene con otra
// forma, el fotograma se queda en su dibujo y el error se anota en la fila. Un
// revelado nunca se queda sin imagen; a lo sumo se queda sin fotografía.
//
// ⚠️ EL NOMBRE DEL MODELO ES CONFIGURABLE A PROPÓSITO (`GEMINI_IMAGE_MODEL`).
// Los identificadores de los modelos de imagen cambian más deprisa que este
// repo, y hardcodear uno es garantizar que un día deje de funcionar sin que
// nadie sepa por qué. Si el log dice «modelo no encontrado», se cambia la
// variable en Vercel y no hay que desplegar nada.

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELO_POR_DEFECTO = "gemini-3-pro-image";
const TIMEOUT_MS = 120_000;

export function geminiImagenDisponible(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiImagenModelo(): string {
  return process.env.GEMINI_IMAGE_MODEL || MODELO_POR_DEFECTO;
}

type Nodo = Record<string, unknown>;

/** Saca la PRIMERA imagen de la respuesta sin casarse con una forma exacta.
 *  Mismo criterio que `textoDe` en gemini.ts: recorrer y quedarse con lo que
 *  parezca datos de imagen, en vez de exigir una ruta concreta que el día que
 *  cambie deja la función muerta sin decir por qué. */
function imagenDe(data: Nodo): { mime: string; b64: string } | null {
  let hit: { mime: string; b64: string } | null = null;
  const visita = (n: unknown): void => {
    if (hit) return;
    if (Array.isArray(n)) return n.forEach(visita);
    if (!n || typeof n !== "object") return;
    const o = n as Nodo;
    const inline = (o.inlineData ?? o.inline_data) as Nodo | undefined;
    if (inline && typeof inline.data === "string") {
      const mime = String(inline.mimeType ?? inline.mime_type ?? "image/png");
      if (mime.startsWith("image/")) {
        hit = { mime, b64: inline.data as string };
        return;
      }
    }
    for (const k of ["candidates", "content", "parts", "output", "outputs", "steps"]) {
      if (k in o) visita(o[k]);
    }
  };
  visita(data);
  return hit;
}

export type ImagenGenerada = { mime: string; bytes: Uint8Array };

/**
 * Una imagen a partir del prompt del fotograma y, si se le da, del dibujo de
 * previsualización como referencia de encuadre. Lanza con un mensaje nombrable;
 * quien llama decide si se queda con el dibujo.
 */
export async function geminiImagen(opts: { prompt: string; referenciaPng?: Uint8Array | null; aspect?: string }): Promise<ImagenGenerada> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY sin configurar");

  const modelo = geminiImagenModelo();
  const parts: Nodo[] = [
    {
      text:
        `Fotografía cinematográfica de este plano. RESPETA EL ENCUADRE de la imagen de referencia: ` +
        `es un storyboard con la posición exacta de la cámara y de cada persona, y la composición final debe coincidir.\n\n` +
        opts.prompt +
        `\n\nSin texto, sin marcas de agua, sin bordes. Relación de aspecto ${opts.aspect ?? "16:9"}.`,
    },
  ];
  if (opts.referenciaPng?.length) {
    parts.push({ inline_data: { mime_type: "image/png", data: Buffer.from(opts.referenciaPng).toString("base64") } });
  }

  const res = await fetch(`${API}/${modelo}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const cuerpo = (await res.text().catch(() => "")).slice(0, 300);
    // El 404 es el error que va a pasar de verdad, y merece decir qué hacer.
    if (res.status === 404) {
      throw new Error(`El modelo «${modelo}» no existe o no admite imagen. Cambia GEMINI_IMAGE_MODEL en Vercel. (${cuerpo})`);
    }
    throw new Error(`Gemini respondió ${res.status}: ${cuerpo}`);
  }

  const data = (await res.json()) as Nodo;
  const img = imagenDe(data);
  if (!img) throw new Error("Gemini respondió sin ninguna imagen reconocible.");
  return { mime: img.mime, bytes: Buffer.from(img.b64, "base64") };
}
