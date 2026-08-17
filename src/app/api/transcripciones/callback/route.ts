import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WEBHOOK_HEADER, assemblyWebhookSecret, ingestAssemblyResult } from "@/lib/transcripciones/cloud";

// ── Webhook de AssemblyAI (OCP · Transcripciones) ────────────────────────────
// Lo llama el proveedor cuando termina un trabajo. El cuerpo es mínimo
// (`{transcript_id, status}`), así que aquí solo se comprueba quién llama y se
// va a buscar el resultado completo con nuestra clave — el webhook no trae la
// transcripción, y aunque la trajera no nos fiaríamos de un cuerpo sin firmar.
//
// Autenticación: AssemblyAI devuelve la cabecera secreta que le dimos al enviar
// (`webhook_auth_header_name`/`_value`). Comparación en tiempo constante.
//
// Sin secreto configurado el endpoint responde 503 y NO procesa: un webhook
// abierto dejaría que cualquiera dispare peticiones contra nuestra cuenta.

export const dynamic = "force-dynamic";

function authorized(req: NextRequest, secret: string): boolean {
  const got = req.headers.get(WEBHOOK_HEADER) ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = assemblyWebhookSecret();
  if (!secret) {
    console.error("[transcripciones/callback] ASSEMBLYAI_WEBHOOK_SECRET sin configurar; se ignora la llamada.");
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }
  if (!authorized(req, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const jobId = typeof payload.transcript_id === "string" ? payload.transcript_id : "";
  if (!jobId) return NextResponse.json({ error: "missing transcript_id" }, { status: 400 });

  const r = await ingestAssemblyResult(jobId);
  if (!r.ok) {
    // 200 a propósito: el fallo ya quedó escrito en la fila (status=error) y se ve
    // en el OCP. Devolver 5xx solo haría que AssemblyAI reintente sobre algo que
    // no va a cambiar por reintentarlo.
    console.error("[transcripciones/callback] %s: %s", jobId, r.error);
    return NextResponse.json({ ok: false, error: r.error });
  }
  return NextResponse.json({ ok: true });
}
