import type { Metadata } from "next";
import { CourierBoard } from "@/components/cotizador/CourierBoard";

export const metadata: Metadata = { title: "Cotizador Courier · ECP", robots: { index: false, follow: false } };

// Cotizador Courier (2026-09-23, brief `herramientas-internas-cotizador-courier.md`). El costo para CTCx
// de un envío FedEx de café: la guía pública de tarifas menos el acuerdo firmado (confidencial: vive solo
// en las tablas `courier_*`) más el combustible de la semana.
//
// Dos entradas desde el LCP · CRM CP CaaS (V5.73): `?lead=<id>` abre el cotizador para ESE item CaaS (lo que
// se guarde queda vinculado a su tarjeta) y `?abrir=<id>` abre una cotización guardada.
export default async function CotizadorCourierPage({ searchParams }: { searchParams: Promise<{ lead?: string; abrir?: string }> }) {
  const { lead, abrir } = await searchParams;
  const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
  return <CourierBoard leadInicial={uuid(lead)} abrirInicial={uuid(abrir)} />;
}
