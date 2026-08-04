import type { Metadata } from "next";
import { QuoteDetail } from "@/app/ocp/(app)/cotizador-lotes/[id]/QuoteDetail";

export const metadata: Metadata = { title: "Cotización logística · OCP", robots: { index: false, follow: false } };

// Mismo marco que el de lotes: `QuoteDetail` elige el motor por `quote.kind`, y
// para `logistico` muestra el aviso de que su cálculo aún no existe.
export default async function CotizacionLogisticaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteDetail id={id} basePath="/ocp/cotizador-logistico" />;
}
