import type { Metadata } from "next";
// Shared internal-panel Tailwind entry (see login/layout.tsx for the note).
import "@/app/bcp/tailwind.css";

export const metadata: Metadata = {
  title: "LCP · Lead Control Panel",
  robots: { index: false, follow: false },
};

// ⚠️ ESTE ARCHIVO FALTÓ AL NACER LA LCP (V5.59) y nada lo avisó: ni `tsc`, ni el build, ni un guardián.
// El layout raíz de cada consola —fuera de `(app)`— es quien pone `data-theme="bcp"`: sin él, la consola
// hereda los tokens de color de OTRO tema y todo el texto sale lavado sobre blanco (lo vio el owner, no
// una prueba: las consolas no se conducen en navegador). También lleva el Tailwind del panel y el
// `noindex`. Desde la V5.63 `qa-rutas-consolas` (h) exige uno por cada consola de `CONSOLE_ORDER`.
export default function LcpLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="bcp">{children}</div>;
}
