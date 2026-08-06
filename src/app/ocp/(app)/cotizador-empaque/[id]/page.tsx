import type { Metadata } from "next";
import { QuoteDetail } from "@/app/ocp/(app)/cotizador-lotes/[id]/QuoteDetail";

export const metadata: Metadata = { title: "Costo de empaque · OCP", robots: { index: false, follow: false } };

// El mismo marco que los otros dos cotizadores: `QuoteDetail` monta la
// herramienta que corresponda al `kind` (aquí, la calculadora de costo de
// empaque del banco público) y se encarga del destinatario y del historial.
export default async function CotizacionEmpaquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteDetail id={id} basePath="/ocp/cotizador-empaque" />;
}
