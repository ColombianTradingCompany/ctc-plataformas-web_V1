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
