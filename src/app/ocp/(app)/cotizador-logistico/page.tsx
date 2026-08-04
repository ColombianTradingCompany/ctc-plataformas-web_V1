import type { Metadata } from "next";
import { QuotesBoard } from "@/components/cotizador/QuotesBoard";

export const metadata: Metadata = { title: "Cotizador Logístico · OCP", robots: { index: false, follow: false } };

// Cotizador Logístico (2026-08-04). El andamiaje está completo —tabla, código,
// destinatario, vigencia, historial— y comparte todo con el de lotes. Falta SOLO
// el motor de cálculo, que sale del HTML de referencia del owner
// (reference_ocp_modules/), igual que el de lotes salió de la V15 de mermas.
export default function CotizadorLogisticoPage() {
  return (
    <QuotesBoard
      kind="logistico"
      basePath="/ocp/cotizador-logistico"
      title="Cotizador Logístico"
      subtitle="Cotizaciones de transporte y logística contra un cliente o un productor. El andamiaje ya guarda, numera y archiva; el motor de cálculo entra cuando llegue el HTML de referencia."
      totalLabel="Total"
    />
  );
}
