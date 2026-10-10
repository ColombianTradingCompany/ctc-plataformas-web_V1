import type { Metadata } from "next";

// ── /scaj2026 · el formulario de leads de la feria SCAJ 2026 (V6.2, Interfaz de Leads) ───────────────────────────────────────
// Página pública, sin sesión, pensada para el celular del visitante que escanea el QR del stand. Tema de la casa matriz y
// `noindex`: es una puerta de la feria, no una página para buscadores. La ruta es la del registro (`src/lib/leadForms/registro.ts`).

export const metadata: Metadata = {
  title: "SCAJ 2026 · Colombian Trading Company",
  description: "Tell us what you look for in a coffee · Cuéntanos qué buscas en un café · どんなコーヒーをお探しですか",
  robots: { index: false, follow: false },
};

export default function Scaj2026Layout({ children }: { children: React.ReactNode }) {
  return <div data-theme="ctc-home">{children}</div>;
}
