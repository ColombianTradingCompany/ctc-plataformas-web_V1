import type { Metadata } from "next";
import { CourierBoard } from "@/components/cotizador/CourierBoard";

export const metadata: Metadata = { title: "Cotizador Courier · ECP", robots: { index: false, follow: false } };

// Cotizador Courier (2026-09-23, brief `herramientas-internas-cotizador-courier.md`). El costo para CTCx
// de un envío FedEx de café: la guía pública de tarifas menos el acuerdo firmado (confidencial: vive solo
// en las tablas `courier_*`) más el combustible de la semana.
export default function CotizadorCourierPage() {
  return <CourierBoard />;
}
