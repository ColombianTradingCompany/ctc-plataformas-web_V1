import type { Metadata } from "next";
import { QuotesBoard } from "@/components/cotizador/QuotesBoard";
import { QUOTE_BASE_PATH } from "@/lib/cotizador/types";

export const metadata: Metadata = { title: "Cotizador Logístico · ECP", robots: { index: false, follow: false } };

// Cotizador Logístico (2026-08-04). Comparte el andamiaje con el de lotes —tabla, código, destinatario, vigencia,
// historial— y su MOTOR es la calculadora CoGS V19 del owner, embebida íntegra por `AppFrame.tsx`
// (`/ocp-apps/cotizador-logistico.html`): al guardar se archiva su estado completo y se lee su precio de venta.
// Hasta 2026-11-05 el subtítulo decía que el motor «entra cuando llegue el HTML de referencia»; llevaba semanas
// funcionando. Las tarifas siguen escritas a mano dentro del HTML: darles fuente y fecha es la primera tanda del
// brief del Modelo Logístico (`docs/componentes/briefs/herramientas-internas-modelo-logistico.md`), que espera al owner.
export default function CotizadorLogisticoPage() {
  return (
    <QuotesBoard
      kind="logistico"
      basePath={QUOTE_BASE_PATH.logistico}
      title="Cotizador Logístico"
      subtitle="Cotizaciones de transporte y logística contra un cliente o un productor. El costo y el precio de venta salen de la calculadora CoGS (V19) del owner, íntegra; aquí se guardan, se numeran y quedan como historial."

    />
  );
}
