import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPartnerSlug } from "@/lib/partners/partners";
import { requirePartner } from "@/lib/partners/requirePartner";
import { CoffeedStudio } from "@/components/coffeed/CoffeedStudio";

export const metadata: Metadata = { title: "Coffeed · Estudio de Contenido", robots: { index: false, follow: false } };

// Las Server Actions heredan el segment config de la page (lección GVG):
// las etapas con Sonnet (propuestas/expansión/guion) pueden superar el timeout
// por defecto de Vercel.
export const maxDuration = 300;

// Coffeed es el módulo de UN solo socio: la ruta vive bajo el segmento
// dinámico /socios/[partner]/panel, pero cualquier slug que no sea
// estudio-contenido es un 404 — y la credencial se re-verifica igual.
export default async function CoffeedPage({ params }: { params: Promise<{ partner: string }> }) {
  const { partner } = await params;
  if (!isPartnerSlug(partner) || partner !== "estudio-contenido") notFound();
  const identity = await requirePartner("estudio-contenido");

  return <CoffeedStudio orgName={identity.orgName} panelHref="/socios/estudio-contenido/panel" />;
}
