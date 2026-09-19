import type { Metadata } from "next";
import { AutomatizacionesBoard } from "@/components/panel/AutomatizacionesBoard";

export const metadata: Metadata = { title: "Automatizaciones · ECP", robots: { index: false, follow: false } };

// ECP · IT y Plataforma · Automatizaciones (2026-08-05, F0 del plan de
// integraciones). El registro de qué automatismos existen, para qué y si siguen
// vivos, más el pulso de la espina de eventos. Ver docs/INTEGRACIONES_PLAN.md.
export default function AutomatizacionesPage() {
  return <AutomatizacionesBoard />;
}
