import type { Metadata } from "next";
import { AnclasBoard } from "@/components/cotizador/AnclasBoard";

export const metadata: Metadata = { title: "Anclas de mercado · OCP", robots: { index: false, follow: false } };

// Anclas de mercado (2026-08-04). El precio interno de la FNC sale de la
// Configuración de la Calculadora de Mermas y pasa a módulo propio: la
// herramienta lo sigue USANDO, pero consultarlo, corregirlo y acumular el
// histórico se hace aquí. Se actualiza solo una vez al día (vercel.json).
export default function AnclasPage() {
  return <AnclasBoard />;
}
