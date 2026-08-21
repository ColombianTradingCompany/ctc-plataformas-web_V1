import type { PanelTab } from "./panelTabs";

// Iconos de línea minimalistas (un solo lenguaje visual, currentColor) — la
// misma convención que tenía la rejilla de tarjetas: trazo 1.6, caja 24×24.
// Aquí viven los CINCO logos de la barra inferior (owner: «craft simple
// minimalistic logos for each one»).
export function LineIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const TAB_ICON: Record<PanelTab, React.ReactNode> = {
  // Bocadillo de conversación: todos los mensajes viven aquí.
  mensajes: (
    <LineIcon><path d="M20 12a7.2 7.2 0 0 1-9.9 6.7L5 20l1.3-4.4A7.2 7.2 0 1 1 20 12Z" /></LineIcon>
  ),
  // Tres nodos enlazados: la red de plataformas del ecosistema.
  ecosistema: (
    <LineIcon><circle cx="6.2" cy="7" r="2.6" /><circle cx="17.8" cy="7" r="2.6" /><circle cx="12" cy="17.4" r="2.6" /><path d="M8.8 7h6.4M7.4 9.3l3.3 5.8M16.6 9.3l-3.3 5.8" /></LineIcon>
  ),
  // Persona: el productor y lo suyo (información, fincas, lotes).
  perfil: (
    <LineIcon><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></LineIcon>
  ),
  // Roseta de galardón: el camino de la evaluación y sus resultados.
  evaluaciones: (
    <LineIcon><circle cx="12" cy="10" r="5" /><path d="M8.7 14.3 7 21l5-2.4L17 21l-1.7-6.7" /></LineIcon>
  ),
  // Documento firmado: ofertas y contratos.
  contratos: (
    <LineIcon><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 13h5M10 16.5h5" /></LineIcon>
  ),
};
