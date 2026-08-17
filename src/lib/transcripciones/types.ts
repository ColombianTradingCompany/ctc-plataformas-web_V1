// ── OCP · Transcripciones · tipos ────────────────────────────────────────────
// La transcripción la produce la herramienta LOCAL ogg_transcriber (faster-whisper
// + pyannote, en el equipo del owner porque necesita GPU); la plataforma guarda
// el resultado y le añade lo que la máquina no sabe: asunto, fecha, notas y el
// nombre de cada hablante.

export type TranscriptSegment = {
  /** "SPEAKER_00", "SPEAKER_01"... — o "SPEAKER" cuando se transcribió sin diarizar. */
  speaker: string;
  start: number;
  end: number;
  text: string;
  /** p. ej. ["repetition"] cuando la herramienta colapsó un "no, no, no…" alucinado. */
  flags?: string[];
};

/** Un bloque = segmentos consecutivos del mismo hablante, ya juntos. Se deriva, no se guarda. */
export type TranscriptBlock = { speaker: string; start: number; end: number; text: string };

/**
 * pending: audio subido, esperando al worker del equipo con GPU ·
 * processing: reclamado por el worker · ready: transcrita · error: ver `error`.
 * Las que entran por JSON o texto nacen `ready`.
 */
export type TranscriptStatus = "pending" | "processing" | "ready" | "error";

/** local = worker del equipo con GPU (gratis, nada sale) · assemblyai = servicio en la nube. */
export type TranscriptProvider = "local" | "assemblyai";

/** Pistas que el owner da al subir el audio; el worker se las pasa a la herramienta. */
export type TranscriptJobOptions = {
  language?: string;      // "es", "en"... (vacío = detectar)
  num_speakers?: number;  // exacto, si se sabe
  min_speakers?: number;
  max_speakers?: number;
};

export type TranscriptSummary = {
  id: string;
  subject: string;
  /** La fecha de la conversación (YYYY-MM-DD), no la de la carga. */
  recordedOn: string;
  notes: string | null;
  sourceName: string | null;
  language: string | null;
  durationSeconds: number | null;
  /** Claves en orden de aparición. */
  speakers: string[];
  /** Nombres puestos a mano: {"SPEAKER_00": "Don Luis"}. */
  speakerNames: Record<string, string>;
  segmentCount: number;
  status: TranscriptStatus;
  /** Quién la transcribe: el equipo con GPU del owner o el servicio en la nube. */
  provider: TranscriptProvider;
  /** Ruta del audio en el bucket (null cuando entró por JSON/texto). */
  audioPath: string | null;
  audioSizeBytes: number | null;
  jobOptions: TranscriptJobOptions;
  error: string | null;
  worker: string | null;
  claimedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Transcript = TranscriptSummary & {
  segments: TranscriptSegment[];
  fullText: string;
  meta: Record<string, unknown>;
};

/** Lo que acepta `createTranscript`: el JSON de la herramienta ya validado. */
export type TranscriptPayload = {
  segments: TranscriptSegment[];
  speakers: string[];
  language: string | null;
  durationSeconds: number | null;
  sourceName: string | null;
  meta: Record<string, unknown>;
};

export type TranscriptResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Un equipo que corre el worker (`python -m ogg_transcriber.worker`) y late.
 * La plataforma NUNCA llama a esa máquina: es ella la que pregunta y la que se
 * anuncia, por eso funciona detrás de un router doméstico sin abrir nada.
 * `online` se deriva del latido: si no se sabe de él, se le da por apagado.
 */
export type TranscriptWorker = {
  worker: string;
  online: boolean;
  status: "idle" | "busy";
  /** Segundos desde el último latido. */
  secondsAgo: number;
  device: string | null;
  gpu: string | null;
  toolVersion: string | null;
  currentJob: string | null;
};
