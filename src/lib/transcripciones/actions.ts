"use server";

// ── OCP · Transcripciones · Server Actions ───────────────────────────────────
// El archivo de conversaciones transcritas. La transcripción en sí la hace la
// herramienta local ogg_transcriber (GPU del owner); aquí se GUARDA el JSON
// que produce y se le pone lo humano: asunto, fecha, notas y el nombre de cada
// hablante. Tabla `transcripts`, service-role-only (RLS activo, cero políticas):
// todo pasa por estas actions, cada una detrás de `requireConsoleWrite("ocp")`.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { collapseBlocks, speakerOrder } from "./model";
import type { Transcript, TranscriptPayload, TranscriptResult, TranscriptSegment, TranscriptSummary } from "./types";

const NO_AUTH: TranscriptResult = { ok: false, error: "Tu sesión del OCP no está activa. Vuelve a iniciar sesión." };
const LIST_PATH = "/ocp/transcripciones";

const SUMMARY_COLS =
  "id, subject, recorded_on, notes, source_name, language, duration_seconds, speakers, speaker_names, segment_count, created_at, updated_at";

type SummaryRow = {
  id: string; subject: string; recorded_on: string; notes: string | null; source_name: string | null;
  language: string | null; duration_seconds: string | number | null; speakers: unknown; speaker_names: unknown;
  segment_count: number; created_at: string; updated_at: string;
};
type FullRow = SummaryRow & { segments: unknown; full_text: string; meta: unknown };

const asStrArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const asNames = (v: unknown): Record<string, string> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === "string") as [string, string][])
    : {};

const toSummary = (r: SummaryRow): TranscriptSummary => ({
  id: r.id,
  subject: r.subject,
  recordedOn: r.recorded_on,
  notes: r.notes,
  sourceName: r.source_name,
  language: r.language,
  durationSeconds: r.duration_seconds == null ? null : Number(r.duration_seconds),
  speakers: asStrArray(r.speakers),
  speakerNames: asNames(r.speaker_names),
  segmentCount: r.segment_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toTranscript = (r: FullRow): Transcript => ({
  ...toSummary(r),
  segments: Array.isArray(r.segments) ? (r.segments as TranscriptSegment[]) : [],
  fullText: r.full_text ?? "",
  meta: r.meta && typeof r.meta === "object" ? (r.meta as Record<string, unknown>) : {},
});

const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00`).getTime());

export async function listTranscripts(): Promise<TranscriptSummary[] | null> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return null;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("transcripts")
    .select(SUMMARY_COLS)
    .order("recorded_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  return ((data ?? []) as SummaryRow[]).map(toSummary);
}

export async function getTranscript(id: string): Promise<Transcript | null> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return null;
  const service = createServiceRoleClient();
  const { data } = await service
    .from("transcripts")
    .select(`${SUMMARY_COLS}, segments, full_text, meta`)
    .eq("id", id)
    .maybeSingle();
  return data ? toTranscript(data as FullRow) : null;
}

/** Nueva transcripción: lo humano (asunto, fecha, notas) + el JSON ya validado en el cliente con `parseToolJson`. */
export async function createTranscript(input: {
  subject: string;
  recordedOn: string;
  notes?: string;
  payload: TranscriptPayload;
}): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const subject = (input.subject ?? "").trim();
  if (!subject) return { ok: false, error: "Falta el asunto." };
  if (subject.length > 200) return { ok: false, error: "El asunto es demasiado largo (máx. 200 caracteres)." };
  if (!validDate(input.recordedOn ?? "")) return { ok: false, error: "Falta la fecha de la conversación." };
  const segments = Array.isArray(input.payload?.segments) ? input.payload.segments : [];
  if (!segments.length) return { ok: false, error: "La transcripción no trae segmentos con texto." };

  const speakers = input.payload.speakers?.length ? input.payload.speakers : speakerOrder(segments);
  const fullText = collapseBlocks(segments).map((b) => b.text).join(" ").trim();
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("transcripts")
    .insert({
      subject,
      recorded_on: input.recordedOn,
      notes: input.notes?.trim() || null,
      source_name: input.payload.sourceName,
      language: input.payload.language,
      duration_seconds: input.payload.durationSeconds,
      speakers,
      speaker_names: {},
      segments,
      segment_count: segments.length,
      full_text: fullText,
      meta: input.payload.meta ?? {},
      created_by: who.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(LIST_PATH);
  return { ok: true, id: (data as { id: string }).id };
}

/** Asunto, fecha y notas se corrigen cuando haga falta; el contenido transcrito no se edita aquí. */
export async function updateTranscriptInfo(
  id: string,
  input: { subject: string; recordedOn: string; notes?: string }
): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const subject = (input.subject ?? "").trim();
  if (!subject) return { ok: false, error: "Falta el asunto." };
  if (subject.length > 200) return { ok: false, error: "El asunto es demasiado largo (máx. 200 caracteres)." };
  if (!validDate(input.recordedOn ?? "")) return { ok: false, error: "La fecha no es válida." };
  const service = createServiceRoleClient();
  const { error } = await service
    .from("transcripts")
    .update({ subject, recorded_on: input.recordedOn, notes: input.notes?.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return { ok: true, id };
}

/** "SPEAKER_00" → "Don Luis". Vacío = volver a la etiqueta automática. */
export async function renameSpeaker(id: string, speakerKey: string, name: string): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const key = (speakerKey ?? "").trim();
  if (!key) return { ok: false, error: "Falta el hablante." };
  const clean = (name ?? "").trim().slice(0, 80);
  const service = createServiceRoleClient();
  const { data: row, error: readErr } = await service.from("transcripts").select("speaker_names").eq("id", id).maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!row) return { ok: false, error: "La transcripción ya no existe." };
  const names = asNames((row as { speaker_names: unknown }).speaker_names);
  if (clean) names[key] = clean;
  else delete names[key];
  const { error } = await service
    .from("transcripts")
    .update({ speaker_names: names, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return { ok: true, id };
}

export async function deleteTranscript(id: string): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { error } = await service.from("transcripts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(LIST_PATH);
  return { ok: true };
}
