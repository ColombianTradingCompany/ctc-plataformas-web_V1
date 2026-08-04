import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudioConsole } from "@/components/coffeed/StudioConsole";
import { StudioAppShell } from "@/components/coffeed/StudioAppShell";
import { getStudioIdentity } from "@/lib/coffeed/studioGate";
import { STUDIO_PARTNER_SLUG } from "@/lib/coffeed/studioApps";

export const metadata: Metadata = { title: "Source Wrapper · Estudio de Contenido", robots: { index: false, follow: false } };

// Las Server Actions heredan el segment config de la page (lección GVG): el
// barrido de 7 días, la extracción y la redacción del post son llamadas largas
// con búsqueda web y se pasan del timeout por defecto de Vercel.
export const maxDuration = 300;

export default async function SourceWrapperPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  // El taller es de UN solo nodo: cualquier otro socio ni siquiera lo ve.
  if (partner !== STUDIO_PARTNER_SLUG) notFound();

  const identity = await getStudioIdentity();
  if (!identity) redirect(`/socios/${STUDIO_PARTNER_SLUG}/acceso`);

  return (
    <StudioAppShell app="source-wrapper" identity={identity}>
      <StudioConsole />
    </StudioAppShell>
  );
}
