import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DatawaveStudio } from "@/components/coffeed/datawave/DatawaveStudio";
import { StudioAppShell } from "@/components/coffeed/StudioAppShell";
import { getStudioIdentity } from "@/lib/coffeed/studioGate";
import { STUDIO_PARTNER_SLUG } from "@/lib/coffeed/studioApps";

export const metadata: Metadata = { title: "Datawave · Estudio de Contenido", robots: { index: false, follow: false } };

// Las Server Actions heredan el segment config de la page (lección GVG):
// construir un episodio sale a buscar cifras a la web y es la llamada más larga
// de la app — muy por encima del timeout por defecto de Vercel.
export const maxDuration = 300;

export default async function DatawavePage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (partner !== STUDIO_PARTNER_SLUG) notFound();

  const identity = await getStudioIdentity();
  if (!identity) redirect(`/socios/${STUDIO_PARTNER_SLUG}/acceso`);

  return (
    <StudioAppShell app="datawave" identity={identity}>
      <DatawaveStudio />
    </StudioAppShell>
  );
}
