import "server-only";

// ── OCP · Transcripciones · transcribir en la NUBE (AssemblyAI) ──────────────
// La alternativa al worker del equipo con GPU: el mismo trabajo, transcrito y
// diarizado por un servicio, para que una nota subida a las 11 de la noche no
// espere a que el PC esté encendido.
//
// Flujo, pensado para el tope de 300 s por función de Vercel: NADA espera aquí.
//   1. `submitToAssembly` firma una URL del audio en Storage y manda el trabajo
//      (una petición de menos de un segundo) → fila `processing` con `provider_job_id`.
//   2. AssemblyAI llama a /api/transcripciones/callback cuando termina, con la
//      cabecera secreta que le dimos → `ingestAssemblyResult` escribe el resultado.
//   3. Red de seguridad: mientras el detalle sondea, `pollAssemblyJob` pregunta
//      por el estado. Cubre un webhook perdido y el desarrollo en local, donde
//      AssemblyAI no puede alcanzar localhost.
//
// El audio SALE a un tercero por una URL firmada de 6 h. Es la diferencia con la
// vía local, y está dicho en la interfaz: quien elige el botón, lo elige sabiendo.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { collapseBlocks, mapAssemblyUtterances, speakerOrder } from "./model";
import type { TranscriptJobOptions } from "./types";

const API = "https://api.assemblyai.com/v2/transcript";
const BUCKET = "kaffetal-media";
/** Tiempo que la URL del audio queda accesible para que el proveedor la descargue. */
const AUDIO_URL_TTL_S = 6 * 3600;
export const WEBHOOK_HEADER = "x-ctc-transcripts-secret";

export type CloudResult = { ok: true } | { ok: false; error: string };

export function assemblyApiKey(): string {
  return (process.env.ASSEMBLYAI_API_KEY ?? "").trim();
}
export function assemblyWebhookSecret(): string {
  return (process.env.ASSEMBLYAI_WEBHOOK_SECRET ?? "").trim();
}
export function cloudConfigured(): boolean {
  return !!assemblyApiKey();
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://ctcexport.com").replace(/\/$/, "");
}

const MISSING_KEY =
  "La transcripción en la nube no está configurada: falta ASSEMBLYAI_API_KEY en el entorno " +
  "(Vercel → Settings → Environment Variables, y .env.local para desarrollo). " +
  "Mientras tanto, el worker del equipo con GPU sigue funcionando.";

/** `job_options` del formulario → cuerpo de la petición de AssemblyAI. */
export function assemblyBody(
  audioUrl: string,
  opts: TranscriptJobOptions,
  webhook?: { url: string; header: string; value: string }
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    speaker_labels: true,      // el motivo entero de este módulo
    punctuate: true,
    format_text: true,
  };
  if (opts.language) body.language_code = opts.language;
  else body.language_detection = true;
  // `speakers_expected` solo cuando se sabe de verdad; si no, el rango.
  if (opts.num_speakers) body.speakers_expected = opts.num_speakers;
  else if (opts.min_speakers || opts.max_speakers) {
    body.speaker_options = {
      ...(opts.min_speakers ? { min_speakers_expected: opts.min_speakers } : {}),
      ...(opts.max_speakers ? { max_speakers_expected: opts.max_speakers } : {}),
    };
  }
  if (webhook?.url) {
    body.webhook_url = webhook.url;
    body.webhook_auth_header_name = webhook.header;
    body.webhook_auth_header_value = webhook.value;
  }
  return body;
}

type Row = {
  id: string; audio_path: string | null; status: string; provider: string;
  provider_job_id: string | null; job_options: unknown; source_name: string | null;
};

async function loadRow(id: string): Promise<Row | null> {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("transcripts")
    .select("id, audio_path, status, provider, provider_job_id, job_options, source_name")
    .eq("id", id)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/** Manda el trabajo. No espera al resultado: vuelve en cuanto AssemblyAI acusa recibo. */
export async function submitToAssembly(id: string): Promise<CloudResult> {
  const key = assemblyApiKey();
  if (!key) return { ok: false, error: MISSING_KEY };
  const row = await loadRow(id);
  if (!row) return { ok: false, error: "La transcripción ya no existe." };
  if (!row.audio_path) return { ok: false, error: "Esta transcripción no tiene audio guardado; no hay nada que mandar." };
  if (row.status === "ready") return { ok: false, error: "Esta transcripción ya está lista." };

  const service = createServiceRoleClient();
  const { data: signed, error: signErr } = await service.storage
    .from(BUCKET)
    .createSignedUrl(row.audio_path, AUDIO_URL_TTL_S);
  if (signErr || !signed?.signedUrl) return { ok: false, error: "No se pudo firmar el enlace del audio para el proveedor." };

  const secret = assemblyWebhookSecret();
  const opts = (row.job_options && typeof row.job_options === "object" ? row.job_options : {}) as TranscriptJobOptions;
  const body = assemblyBody(
    signed.signedUrl,
    opts,
    secret ? { url: `${siteUrl()}/api/transcripciones/callback`, header: WEBHOOK_HEADER, value: secret } : undefined
  );

  let res: Response;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: { authorization: key, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: `No se pudo contactar con AssemblyAI: ${(e as Error).message}` };
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    return { ok: false, error: `AssemblyAI rechazó el trabajo: ${detail}` };
  }
  const jobId = typeof json.id === "string" ? json.id : "";
  if (!jobId) return { ok: false, error: "AssemblyAI no devolvió un id de trabajo." };

  const { error } = await service
    .from("transcripts")
    .update({
      provider: "assemblyai",
      provider_job_id: jobId,
      status: "processing",
      worker: "AssemblyAI",
      error: null,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Trae el trabajo del proveedor y, si terminó, lo escribe en la fila. */
export async function ingestAssemblyResult(jobId: string): Promise<CloudResult> {
  const key = assemblyApiKey();
  if (!key) return { ok: false, error: MISSING_KEY };
  const service = createServiceRoleClient();
  const { data: rowData } = await service
    .from("transcripts")
    .select("id, status")
    .eq("provider_job_id", jobId)
    .maybeSingle();
  const row = rowData as { id: string; status: string } | null;
  if (!row) return { ok: false, error: `Ningún trabajo local corresponde a ${jobId}.` };

  let res: Response;
  try {
    res = await fetch(`${API}/${encodeURIComponent(jobId)}`, { headers: { authorization: key } });
  } catch (e) {
    return { ok: false, error: `No se pudo consultar AssemblyAI: ${(e as Error).message}` };
  }
  if (!res.ok) return { ok: false, error: `AssemblyAI respondió HTTP ${res.status} al pedir el resultado.` };
  const job = (await res.json()) as Record<string, unknown>;
  const status = typeof job.status === "string" ? job.status : "";

  if (status === "error") {
    const detail = typeof job.error === "string" ? job.error : "sin detalle";
    await service
      .from("transcripts")
      .update({ status: "error", error: `AssemblyAI: ${detail}`, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: false, error: detail };
  }
  if (status !== "completed") return { ok: true }; // queued/processing: nada que escribir todavía

  const segments = mapAssemblyUtterances(job.utterances);
  if (!segments.length) {
    // Audio sin habla: se guarda como lista y vacía, igual que en la vía local.
    await service
      .from("transcripts")
      .update({
        status: "ready", segments: [], segment_count: 0, speakers: [], full_text: "",
        processed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return { ok: true };
  }

  const speakers = speakerOrder(segments);
  const fullText = collapseBlocks(segments).map((b) => b.text).join(" ").trim();
  const durationSeconds =
    typeof job.audio_duration === "number" ? job.audio_duration : segments[segments.length - 1]?.end ?? null;
  const language = typeof job.language_code === "string" ? job.language_code : null;

  const { error } = await service
    .from("transcripts")
    .update({
      status: "ready",
      segments,
      segment_count: segments.length,
      speakers,
      language,
      duration_seconds: durationSeconds,
      full_text: fullText,
      meta: {
        source_kind: "audio_upload",
        provider: "assemblyai",
        model: typeof job.speech_model === "string" ? job.speech_model : "assemblyai",
        confidence: typeof job.confidence === "number" ? job.confidence : null,
        job_id: jobId,
      },
      error: null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Red de seguridad: pregunta por un trabajo que sigue `processing` (webhook perdido, o local). */
export async function pollAssemblyJob(id: string): Promise<CloudResult> {
  const row = await loadRow(id);
  if (!row || row.provider !== "assemblyai" || !row.provider_job_id) return { ok: true };
  if (row.status !== "processing") return { ok: true };
  return ingestAssemblyResult(row.provider_job_id);
}
