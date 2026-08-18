import type { Metadata } from "next";
import { QuotesBoard } from "@/components/cotizador/QuotesBoard";

export const metadata: Metadata = { title: "Cotizador de Lotes · OCP", robots: { index: false, follow: false } };

// Cotizador de Lotes de Café (2026-08-04). La matemática viene de la Calculadora
// de Mermas V15 y desde aquí evoluciona por su cuenta — ver src/lib/cotizador/lote/model.ts.
export default function CotizadorLotesPage() {
  return (
    <QuotesBoard
      kind="lote"
      basePath="/ecp/cotizador-lotes"
      title="Cotizador de Lotes de Café"
      subtitle="Cuánto cuesta llevar un lote de un estado del café a otro, y a qué precio se cotiza. Las mermas por etapa y las curvas de costo salen de la Calculadora de Mermas; aquí se guardan contra un productor o un cliente y quedan como historial."

    />
  );
}
