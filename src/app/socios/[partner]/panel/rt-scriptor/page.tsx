import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RTScriptor } from "@/components/coffeed/rtscriptor/RTScriptor";
import { StudioAppShell } from "@/components/coffeed/StudioAppShell";
import { getStudioIdentity } from "@/lib/coffeed/studioGate";
import { STUDIO_PARTNER_SLUG } from "@/lib/coffeed/studioApps";
import { loadWorkshop } from "@/lib/coffeed/rtScriptorActions";

export const metadata: Metadata = {
  title: "RT-Scriptor · Estudio de Contenido",
  robots: { index: false, follow: false },
};

// Las Server Actions heredan el segment config de la page (lección GVG/Datawave).
// Aquí la llamada larga es «Analizar y empujar»: sale a Claude con el guion
// entero y el techo por defecto de Vercel se queda corto.
export const maxDuration = 300;

export default async function RtScriptorPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (partner !== STUDIO_PARTNER_SLUG) notFound();

  const identity = await getStudioIdentity();
  if (!identity) redirect(`/socios/${STUDIO_PARTNER_SLUG}/acceso`);

  const workshop = await loadWorkshop();
  if (!workshop) redirect(`/socios/${STUDIO_PARTNER_SLUG}/acceso`);

  return (
    <StudioAppShell app="rt-scriptor" identity={identity}>
      <RTScriptor initial={workshop} />
    </StudioAppShell>
  );
}
