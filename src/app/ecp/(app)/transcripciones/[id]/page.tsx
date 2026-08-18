import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TranscriptDetail } from "@/components/transcripciones/TranscriptDetail";
import { getTranscript } from "@/lib/transcripciones/actions";

export const metadata: Metadata = { title: "Transcripción · OCP", robots: { index: false, follow: false } };

export default async function TranscripcionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranscript(id);
  if (!t) notFound();
  return <TranscriptDetail initial={t} />;
}
