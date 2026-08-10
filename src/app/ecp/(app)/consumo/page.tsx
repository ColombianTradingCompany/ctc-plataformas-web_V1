import type { Metadata } from "next";
import { ConsumoBoard } from "@/components/panel/ConsumoBoard";

export const metadata: Metadata = { title: "Consumo de IA · ECP", robots: { index: false, follow: false } };

// ECP · IT y Plataforma → Consumo de IA (2026-08-10). El gasto en modelos era
// invisible: siete vías distintas llamando a Anthropic y a Gemini sin que nada
// lo anotara. Ahora cada llamada deja fila en `ai_usage` y esto la lee.
export const dynamic = "force-dynamic";

export default function ConsumoPage() {
  return <ConsumoBoard />;
}
