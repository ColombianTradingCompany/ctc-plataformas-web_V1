import type { Metadata } from "next";
import { GradosBoard } from "@/components/panel/GradosBoard";

export const metadata: Metadata = { title: "Grados de Calidad · ECP", robots: { index: false, follow: false } };

// Grados de Calidad CTC (2026-08-05). LA página de referencia: los grados
// estaban definidos en tres sitios con tres respuestas distintas, dos de ellas
// material de cliente. Fuente única en src/lib/grados/definicion.ts.
//
// Vive dentro de Direccionamiento desde el 2026-08-10 — la vieja URL
// (/ecp/grados) sigue viva como redirección.
export default function GradosPage() {
  return <GradosBoard />;
}
