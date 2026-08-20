import type { Metadata } from "next";
import "@/app/bcp/tailwind.css";
import { InternalAuthShell } from "@/components/panel/InternalAuthShell";

// La superficie de recuperación es UNA para las once puertas de la red, así que
// se viste con el envoltorio neutro de la casa (paleta CTC + barra legal + la
// insignia de versión) en vez de con la piel de ninguna plataforma: quien llega
// aquí puede venir de Kaffetal Regal, de la tienda o del login maestro.
//
// `robots: noindex` como todas las pantallas de acceso: es una herramienta para
// quien ya tiene cuenta, no una página que CTC quiera en un buscador.
export const metadata: Metadata = {
  title: "Recuperar acceso · CTC",
  robots: { index: false, follow: false },
};

export default function RecuperarAccesoLayout({ children }: { children: React.ReactNode }) {
  return <InternalAuthShell>{children}</InternalAuthShell>;
}
