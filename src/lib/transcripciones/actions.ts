"use server";

// ── OCP · Transcripciones · Server Actions ───────────────────────────────────
// El archivo de conversaciones transcritas. La transcripción en sí la hace la
// herramienta local ogg_transcriber (GPU del owner); aquí se GUARDA el JSON
// que produce y se le pone lo humano: asunto, fecha, notas y el nombre de cada
// hablante. Tabla `transcripts`, service-role-only (RLS activo, cero políticas):
// todo pasa por estas actions, cada una detrás de `requireConsoleWrite("ocp")`.

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { MAX_AUDIO_BYTES, collapseBlocks, isAudioName, speakerOrder, storageSafeName } from "./model";
import type {
  Transcript, TranscriptJobOptions, TranscriptPayload, TranscriptResult, TranscriptSegment, TranscriptStatus,
  TranscriptSummary, TranscriptWorker,
} from "./types";

type WorkerRow = {
  worker: string; status: string; current_job: string | null; device: string | null; gpu: string | null;
  tool_version: string | null; poll_seconds: number | null; last_seen_at: string;
};

const NO_AUTH = { ok: false as const, error: "Tu sesión del OCP no está activa. Vuelve a iniciar sesión." };
const LIST_PATH = "/ocp/transcripciones";
/** El bucket privado de la casa; el prefijo transcripts/ no lo alcanza ningún JWT de usuario (políticas {uid}/...). */
const BUCKET = "kaffetal-media";
const AUDIO_PREFIX = "transcripts";

// Un solo literal a propósito: supabase-js tipa el resultado a partir del texto del
// select y una concatenación lo deja en GenericStringError.
const SUMMARY_COLS =
  "id, subject, recorded_on, notes, source_name, language, duration_seconds, speakers, speaker_names, segment_count, status, provider, audio_path, audio_size_bytes, job_options, error, worker, claimed_at, processed_at, created_at, updated_at";

type SummaryRow = {
  id: string; subject: string; recorded_on: string; notes: string | null; source_name: string | null;
  language: string | null; duration_seconds: string | number | null; speakers: unknown; speaker_names: unknown;
  segment_count: number; status: string; provider: string; audio_path: string | null; audio_size_bytes: string | number | null;
  job_options: unknown; error: string | null; worker: string | null; claimed_at: string | null; processed_at: string | null;
  created_at: string; updated_at: string;
};
type FullRow = SummaryRow & { segments: unknown; full_text: string; meta: unknown };

const asStrArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const asNames = (v: unknown): Record<string, string> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === "string") as [string, string][])
    : {};
const asStatus = (v: string): TranscriptStatus =>
  v === "pending" || v === "processing" || v === "error" ? v : "ready";
const asJobOptions = (v: unknown): TranscriptJobOptions => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const o = v as Record<string, unknown>;
  const out: TranscriptJobOptions = {};
  if (typeof o.language === "string" && o.language) out.language = o.language;
  for (const k of ["num_speakers", "min_speakers", "max_speakers"] as const) {
    if (typeof o[k] === "number" && (o[k] as number) > 0) out[k] = o[k] as number;
  }
  return out;
};

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
  status: asStatus(r.status),
  provider: r.provider === "assemblyai" ? "assemblyai" : "local",
  audioPath: r.audio_path,
  audioSizeBytes: r.audio_size_bytes == null ? null : Number(r.audio_size_bytes),
  jobOptions: asJobOptions(r.job_options),
  error: r.error,
  worker: r.worker,
  claimedAt: r.claimed_at,
  processedAt: r.processed_at,
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
  const { data: row } = await service.from("transcripts").select("audio_path").eq("id", id).maybeSingle();
  const { error } = await service.from("transcripts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  const audioPath = (row as { audio_path: string | null } | null)?.audio_path;
  if (audioPath) {
    // El audio se va con la fila. Si Storage falla, la fila ya no existe: queda un
    // huérfano inofensivo bajo transcripts/, no un enlace roto en la interfaz.
    await service.storage.from(BUCKET).remove([audioPath]);
  }
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// ── Subir el AUDIO al OCP: lo transcribe el equipo con GPU (worker local) ─────
// El navegador sube directo a Storage con una URL firmada (así una llamada de una
// hora no pasa por la Server Action) y después se crea la fila `pending`. El
// worker (`python -m ogg_transcriber.worker` en el equipo del owner) la reclama,
// baja el audio, transcribe y escribe el resultado en la misma fila.

/** Paso 1: la URL firmada. El nombre se sanea; la carpeta es un uuid para que dos archivos iguales no choquen. */
export async function prepareAudioUpload(input: {
  fileName: string;
  sizeBytes: number;
}): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const name = (input.fileName ?? "").trim();
  if (!isAudioName(name)) {
    return { ok: false, error: `«${name || "?"}» no es un audio reconocido (.ogg, .opus, .m4a, .mp3, .wav…).` };
  }
  if (!(input.sizeBytes > 0)) return { ok: false, error: "El archivo está vacío." };
  if (input.sizeBytes > MAX_AUDIO_BYTES) {
    return { ok: false, error: `El archivo pesa ${(input.sizeBytes / 1048576).toFixed(0)} MB; el tope es 100 MB.` };
  }
  const path = `${AUDIO_PREFIX}/${randomUUID()}/${storageSafeName(name)}`;
  const service = createServiceRoleClient();
  const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida a Storage." };
  return { ok: true, path, token: data.token };
}

/** Paso 2 (tras el PUT del navegador): la fila en cola. Nace `pending`, sin segmentos. */
export async function createAudioTranscript(input: {
  subject: string;
  recordedOn: string;
  notes?: string;
  path: string;
  fileName: string;
  sizeBytes: number;
  mime?: string;
  options?: TranscriptJobOptions;
}): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const subject = (input.subject ?? "").trim();
  if (!subject) return { ok: false, error: "Falta el asunto." };
  if (subject.length > 200) return { ok: false, error: "El asunto es demasiado largo (máx. 200 caracteres)." };
  if (!validDate(input.recordedOn ?? "")) return { ok: false, error: "Falta la fecha de la conversación." };
  const path = (input.path ?? "").trim();
  if (!path.startsWith(`${AUDIO_PREFIX}/`) || path.includes("..")) return { ok: false, error: "Ruta de audio no válida." };

  const service = createServiceRoleClient();
  // El objeto tiene que estar: si el PUT falló a medias, mejor decirlo ahora que dejar
  // una fila que el worker no podrá procesar.
  const dir = path.slice(0, path.lastIndexOf("/"));
  const file = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await service.storage.from(BUCKET).list(dir, { search: file, limit: 5 });
  if (!listed?.some((o) => o.name === file)) {
    return { ok: false, error: "El audio no llegó a Storage. Vuelve a subirlo." };
  }

  const opts = asJobOptions(input.options ?? {});
  const { data, error } = await service
    .from("transcripts")
    .insert({
      subject,
      recorded_on: input.recordedOn,
      notes: input.notes?.trim() || null,
      source_name: (input.fileName ?? "").trim() || file,
      language: opts.language ?? null,
      status: "pending",
      audio_path: path,
      audio_size_bytes: input.sizeBytes > 0 ? Math.round(input.sizeBytes) : null,
      audio_mime: input.mime?.trim() || null,
      job_options: opts,
      speakers: [],
      speaker_names: {},
      segments: [],
      segment_count: 0,
      full_text: "",
      meta: { source_kind: "audio_upload" },
      created_by: who.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(LIST_PATH);
  return { ok: true, id: (data as { id: string }).id };
}

/** Volver a poner en cola una que acabó en error (o que lleva horas «Transcribiendo»). */
export async function retryTranscript(id: string): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: row } = await service.from("transcripts").select("status, audio_path").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "La transcripción ya no existe." };
  const r = row as { status: string; audio_path: string | null };
  if (!r.audio_path) return { ok: false, error: "Esta transcripción no tiene audio guardado; no hay nada que reintentar." };
  if (r.status !== "error" && r.status !== "processing") return { ok: false, error: "Solo se reintenta una que esté en error." };
  const { error } = await service
    .from("transcripts")
    .update({ status: "pending", error: null, claimed_at: null, worker: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return { ok: true, id };
}

/**
 * Los equipos que corren el worker y siguen vivos.
 *
 * La plataforma no puede preguntarle a una máquina si está encendida —no la
 * alcanza, y no hace falta que la alcance— así que se fía del latido que el
 * propio worker deja cada ~15 s. Sin latido reciente, se le da por apagado:
 * es la lectura prudente, y es justo lo que el owner necesita saber antes de
 * dejar una nota esperando toda la noche.
 */
export async function listTranscriptWorkers(): Promise<TranscriptWorker[]> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return [];
  const service = createServiceRoleClient();
  const { data } = await service
    .from("transcript_workers")
    .select("worker, status, current_job, device, gpu, tool_version, poll_seconds, last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(20);
  const now = Date.now();
  return ((data ?? []) as WorkerRow[]).map((r) => {
    const secondsAgo = Math.max(0, Math.round((now - new Date(r.last_seen_at).getTime()) / 1000));
    // Tres latidos perdidos = apagado. El worker late cada 15 s y pregunta cada
    // `poll_seconds`; se toma el mayor de los dos para no declarar muerto a uno
    // que solo va lento.
    const beat = Math.max(15, r.poll_seconds ?? 20);
    return {
      worker: r.worker,
      online: secondsAgo <= beat * 3,
      status: r.status === "busy" ? "busy" : "idle",
      secondsAgo,
      device: r.device,
      gpu: r.gpu,
      toolVersion: r.tool_version,
      currentJob: r.current_job,
    };
  });
}

/**
 * El paquete de la herramienta, para instalarla en OTRO equipo.
 *
 * Lo sube a mano `Empaquetar.ps1` desde la carpeta de la herramienta (bucket
 * privado, enlace firmado de 1 h — no queda público). El ZIP **no lleva
 * credenciales**: quien lo instale las escribe en su equipo. Si nadie lo ha
 * empaquetado todavía, se devuelve null y el botón no aparece, en vez de dar un
 * enlace roto.
 */
export async function getTranscriberDownload(): Promise<
  { url: string; sizeKb: number; updatedAt: string | null } | null
> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return null;
  const service = createServiceRoleClient();
  const dir = "tools/transcriptor";
  const file = "transcriptor-ctc-ultimo.zip";
  const { data: listed } = await service.storage.from(BUCKET).list(dir, { search: file, limit: 5 });
  const obj = listed?.find((o) => o.name === file);
  if (!obj) return null;
  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(`${dir}/${file}`, 3600, {
    download: "transcriptor-ctc.zip",
  });
  if (error || !data?.signedUrl) return null;
  const size = (obj.metadata as { size?: number } | null)?.size ?? 0;
  return {
    url: data.signedUrl,
    sizeKb: Math.max(1, Math.round(size / 1024)),
    updatedAt: (obj as { updated_at?: string }).updated_at ?? null,
  };
}

/** Mandar este trabajo a la nube (AssemblyAI) en vez de esperar al equipo con GPU. */
export async function sendTranscriptToCloud(id: string): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const { submitToAssembly } = await import("./cloud");
  const r = await submitToAssembly(id);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return { ok: true, id };
}

/** ¿Está configurada la nube? La interfaz esconde el botón si no lo está. */
export async function isCloudConfigured(): Promise<boolean> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return false;
  const { cloudConfigured } = await import("./cloud");
  return cloudConfigured();
}

/**
 * Red de seguridad del sondeo del detalle: si el trabajo está en la nube y sigue
 * `processing`, se le pregunta al proveedor. Cubre un webhook perdido y el
 * desarrollo en local (donde AssemblyAI no puede llamar a localhost).
 */
export async function refreshCloudStatus(id: string): Promise<TranscriptResult> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const { pollAssemblyJob } = await import("./cloud");
  const r = await pollAssemblyJob(id);
  return r.ok ? { ok: true, id } : { ok: false, error: r.error };
}

/** Enlace firmado (1 h) para escuchar/descargar el audio original desde el detalle. */
export async function getAudioUrl(id: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NO_AUTH;
  const service = createServiceRoleClient();
  const { data: row } = await service.from("transcripts").select("audio_path").eq("id", id).maybeSingle();
  const path = (row as { audio_path: string | null } | null)?.audio_path;
  if (!path) return { ok: false, error: "Esta transcripción no tiene audio guardado." };
  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return { ok: false, error: "No se pudo firmar el enlace del audio." };
  return { ok: true, url: data.signedUrl };
}
