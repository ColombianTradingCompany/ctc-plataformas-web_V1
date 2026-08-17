// ── OCP · Transcripciones · modelo puro ──────────────────────────────────────
// Sin React, sin Supabase: lo que se puede probar con node. Aquí vive la
// lectura del JSON que produce ogg_transcriber, el agrupado en bloques por
// hablante (el mismo `collapse_blocks` de la herramienta, portado) y los
// formatos de salida (texto para copiar/descargar).

import type { TranscriptBlock, TranscriptPayload, TranscriptSegment, TranscriptStatus } from "./types";

export const MAX_PAYLOAD_SEGMENTS = 20_000; // ~10 h de conversación; más es un error de archivo, no un uso real
export const UNKNOWN_SPEAKER = "SPEAKER";

// ---------------------------------------------------------- audio (subida al OCP)
/** Mismo conjunto que `ALLOWED_EXTENSIONS` de la herramienta (ogg_transcriber/audio.py). */
export const AUDIO_EXTENSIONS = [
  ".ogg", ".oga", ".opus",                    // WhatsApp
  ".m4a", ".aac", ".mp3", ".wav", ".flac",    // grabadoras
  ".amr", ".3gp", ".wma", ".webm", ".mp4",    // teléfonos / otras apps
] as const;
/** Tope del bucket kaffetal-media (100 MB/archivo). Una nota de WhatsApp de 22 min son 3 MB. */
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

export function fileExt(name: string): string {
  const m = /\.[^./\\]+$/.exec(name || "");
  return m ? m[0].toLowerCase() : "";
}
export const isAudioName = (name: string) => (AUDIO_EXTENSIONS as readonly string[]).includes(fileExt(name));
export const isJsonName = (name: string) => fileExt(name) === ".json";

/** Nombre seguro para Storage (misma receta que gvg/coffeed): ASCII, sin espacios raros, ≤120. */
export function storageSafeName(name: string): string {
  return (name || "audio")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // quita las tildes que NFKD separo (rango de diacriticos combinantes)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-120) || "audio";
}

export const STATUS_LABEL: Record<TranscriptStatus, string> = {
  pending: "Pendiente",
  processing: "Transcribiendo",
  ready: "Lista",
  error: "Error",
};

/** Idiomas que ofrece el formulario (código Whisper). Vacío = detectar. */
export const LANGUAGE_OPTIONS = [
  { code: "", label: "Detectar" },
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "pt", label: "Portugués" },
  { code: "fr", label: "Francés" },
  { code: "de", label: "Alemán" },
  { code: "it", label: "Italiano" },
] as const;

/** 0 → "00:00", 75.4 → "01:15", 3725 → "1:02:05" (igual que la herramienta). */
export function fmtTs(seconds: number): string {
  const total = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "22 min" / "1 h 05 min" / "43 s" para listas y KPIs. */
export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")} min`;
}

export function speakerOrder(segments: TranscriptSegment[]): string[] {
  const seen: string[] = [];
  for (const s of segments) {
    const k = s.speaker || UNKNOWN_SPEAKER;
    if (!seen.includes(k)) seen.push(k);
  }
  return seen;
}

/** Segmentos consecutivos del mismo hablante → un bloque legible. */
export function collapseBlocks(segments: TranscriptSegment[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];
  for (const seg of segments) {
    const text = (seg.text || "").trim();
    if (!text) continue;
    const speaker = seg.speaker || UNKNOWN_SPEAKER;
    const last = blocks[blocks.length - 1];
    if (last && last.speaker === speaker) {
      last.text = `${last.text} ${text}`.trim();
      last.end = Math.max(last.end, seg.end);
    } else {
      blocks.push({ speaker, start: seg.start, end: seg.end, text });
    }
  }
  return blocks;
}

/** "SPEAKER_00" → el nombre puesto a mano si lo hay; si no, "Hablante 1". */
export function speakerLabel(key: string, names: Record<string, string>): string {
  const custom = names[key]?.trim();
  if (custom) return custom;
  const m = /^SPEAKER_(\d+)$/.exec(key);
  if (m) return `Hablante ${Number(m[1]) + 1}`;
  if (key === UNKNOWN_SPEAKER) return "Voz";
  return key;
}

/** Texto plano con etiquetas de hablante (y opcionalmente [mm:ss - mm:ss]). */
export function transcriptToText(
  segments: TranscriptSegment[],
  names: Record<string, string>,
  opts: { timestamps?: boolean } = {}
): string {
  const blocks = collapseBlocks(segments);
  if (!blocks.length) return "(sin habla detectada)\n";
  return (
    blocks
      .map((b) => {
        const ts = opts.timestamps ? `[${fmtTs(b.start)} - ${fmtTs(b.end)}] ` : "";
        return `${ts}${speakerLabel(b.speaker, names)}: ${b.text}`;
      })
      .join("\n\n") + "\n"
  );
}

// ---------------------------------------------------------- lectura del JSON
type ParseOk = { ok: true; payload: TranscriptPayload };
type ParseErr = { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/**
 * Valida el `.transcript.json` que escribe `python -m ogg_transcriber.cli --json`.
 * Solo exige `segments` con texto; lo demás (idioma, duración, hablantes, meta)
 * se toma si viene y se deriva si no. Nunca lanza: devuelve {ok:false, error}.
 */
export function parseToolJson(raw: unknown): ParseOk | ParseErr {
  if (!isObj(raw)) return { ok: false, error: "El archivo no es un JSON de transcripción (se esperaba un objeto)." };
  const rawSegs = raw.segments;
  if (!Array.isArray(rawSegs)) return { ok: false, error: "El JSON no trae `segments`. ¿Es el archivo .transcript.json de la herramienta?" };
  if (rawSegs.length > MAX_PAYLOAD_SEGMENTS) return { ok: false, error: `Demasiados segmentos (${rawSegs.length}); revisa el archivo.` };

  const segments: TranscriptSegment[] = [];
  for (const s of rawSegs) {
    if (!isObj(s)) continue;
    const text = typeof s.text === "string" ? s.text.trim() : "";
    if (!text) continue;
    const start = num(s.start);
    const end = Math.max(start, num(s.end, start));
    const seg: TranscriptSegment = {
      speaker: typeof s.speaker === "string" && s.speaker.trim() ? s.speaker.trim() : UNKNOWN_SPEAKER,
      start: Math.round(start * 1000) / 1000,
      end: Math.round(end * 1000) / 1000,
      text,
    };
    if (Array.isArray(s.flags) && s.flags.length) seg.flags = s.flags.filter((f): f is string => typeof f === "string");
    segments.push(seg);
  }
  if (!segments.length) return { ok: false, error: "La transcripción no tiene ningún segmento con texto." };

  const meta = isObj(raw.meta) ? raw.meta : {};
  const declaredSpeakers = Array.isArray(raw.speakers) ? raw.speakers.filter((x): x is string => typeof x === "string") : [];
  const speakers = declaredSpeakers.length ? declaredSpeakers : speakerOrder(segments);
  const lastEnd = segments.reduce((m, s) => Math.max(m, s.end), 0);
  const durationSeconds = num(meta.duration_seconds, 0) || lastEnd || null;

  return {
    ok: true,
    payload: {
      segments,
      speakers,
      language: typeof raw.language === "string" && raw.language ? raw.language : null,
      durationSeconds,
      sourceName: typeof meta.source === "string" && meta.source ? meta.source : null,
      // `path` es la ruta local del owner: no aporta nada en la plataforma.
      meta: Object.fromEntries(Object.entries(meta).filter(([k]) => k !== "path")),
    },
  };
}

/**
 * Texto pegado a mano (sin JSON): cada párrafo pasa a ser un segmento sin tiempos.
 * Si las líneas empiezan por "Nombre:" se respeta como hablante.
 */
export function parsePlainText(text: string): ParseOk | ParseErr {
  const paras = text.split(/\n\s*\n|\r\n\s*\r\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!paras.length) return { ok: false, error: "El texto está vacío." };
  const segments: TranscriptSegment[] = paras.map((p) => {
    const m = /^([^:\n]{1,40}):\s+(.+)$/.exec(p);
    return m
      ? { speaker: m[1].trim(), start: 0, end: 0, text: m[2].trim() }
      : { speaker: UNKNOWN_SPEAKER, start: 0, end: 0, text: p };
  });
  return {
    ok: true,
    payload: { segments, speakers: speakerOrder(segments), language: null, durationSeconds: null, sourceName: null, meta: { source_kind: "pasted_text" } },
  };
}
