import type { Metadata } from "next";
import { QuoteDetail } from "@/components/cotizador/QuoteDetail";
import { QUOTE_BASE_PATH } from "@/lib/cotizador/types";

export const metadata: Metadata = { title: "Cotización logística · ECP", robots: { index: false, follow: false } };

// Mismo marco que el de lotes: `QuoteDetail` elige el motor por `quote.kind`, y
// para `logistico` muestra el aviso de que su cálculo aún no existe.
export default async function CotizacionLogisticaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteDetail id={id} basePath={QUOTE_BASE_PATH.logistico} />;
}
