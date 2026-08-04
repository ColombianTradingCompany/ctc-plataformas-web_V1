import type { Metadata } from "next";
import { QuoteDetail } from "./QuoteDetail";

export const metadata: Metadata = { title: "Cotización · OCP", robots: { index: false, follow: false } };

export default async function CotizacionLotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteDetail id={id} basePath="/ocp/cotizador-lotes" />;
}
