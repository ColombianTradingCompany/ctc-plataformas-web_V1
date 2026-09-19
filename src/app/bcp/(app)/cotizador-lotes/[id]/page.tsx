import type { Metadata } from "next";
import { QuoteDetail } from "@/components/cotizador/QuoteDetail";
import { QUOTE_BASE_PATH } from "@/lib/cotizador/types";

export const metadata: Metadata = { title: "Cotización · BCP", robots: { index: false, follow: false } };

export default async function CotizacionLotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteDetail id={id} basePath={QUOTE_BASE_PATH.lote} />;
}
