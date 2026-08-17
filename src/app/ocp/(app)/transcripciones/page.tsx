import type { Metadata } from "next";
import { TranscriptsBoard } from "@/components/transcripciones/TranscriptsBoard";
import { listTranscripts } from "@/lib/transcripciones/actions";

export const metadata: Metadata = { title: "Transcripciones · OCP", robots: { index: false, follow: false } };

// Transcripciones (2026-08-17). Las conversaciones —notas de voz de WhatsApp,
// llamadas grabadas— transcritas con hablantes por la herramienta LOCAL
// ogg_transcriber (reference_html_tools/_whatsapp-transcript-html: faster-
// whisper + pyannote, corre en el equipo con GPU). La plataforma no transcribe:
// guarda el resultado y le pone lo humano — asunto, fecha, notas y el nombre
// de cada voz. Vive con los cotizadores porque son conversaciones de
// operación: con un productor, un cliente, un aliado.
export default async function TranscripcionesPage() {
  const rows = await listTranscripts();
  return <TranscriptsBoard initial={rows ?? []} />;
}
