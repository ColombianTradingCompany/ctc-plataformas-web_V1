// ── Las 5 interfaces del panel del productor (V5.16, owner 2026-08-21) ──────
// El panel dejó de ser una rejilla de tarjetas: ahora son CINCO interfaces
// detrás de una barra de navegación inferior fija — Mensajes · Ecosistema ·
// Mi Perfil · Evaluaciones · Contratos (Mi Perfil al centro, como el "home").
// Cada interfaz es un componente en esta carpeta; la pestaña activa vive en
// KaffetalExperience (no aquí) porque los DRILL-INS participan de la pila del
// botón "Atrás" del teléfono — cambiar de pestaña NO empuja historial, abrir
// una lista completa (drill) SÍ.

import type { DashboardModule } from "../AppDashboard";

export type PanelTab = "perfil" | "evaluaciones" | "contratos" | "ecosistema" | "mensajes";

/** Un drill-in: la vista de lista completa de una sección de Mi Perfil. */
export type PanelDrill = { kind: "fincas" } | { kind: "lotes" };

export const TAB_META: Record<PanelTab, { nav: string; titulo: string; sub: string }> = {
  mensajes: {
    nav: "Mensajes",
    titulo: "Mensajes y Notificaciones",
    sub: "Comuníquese con nosotros y manténgase al tanto de lo que sucede en su cuenta.",
  },
  ecosistema: {
    nav: "Ecosistema",
    titulo: "Ecosistema de Valor",
    sub: "Plataformas y servicios adicionales de la red CTCx.",
  },
  perfil: {
    nav: "Mi Perfil",
    titulo: "Mi Perfil de Productor",
    // El sub de Mi Perfil es el saludo con nombre; lo pinta el shell.
    sub: "",
  },
  evaluaciones: {
    nav: "Evaluaciones",
    titulo: "Evaluar mi Café",
    sub: "Pasos para llevar su café al mundo.",
  },
  contratos: {
    nav: "Contratos",
    titulo: "Contratos y Compras",
    sub: "Lleve sus lotes galardonados al mercado global.",
  },
};

/** Orden de la barra inferior (owner: Mi Perfil al centro). */
export const TAB_ORDER: PanelTab[] = ["mensajes", "ecosistema", "perfil", "evaluaciones", "contratos"];

// ── El contrato `?m=<módulo>` (V4.34) sigue vivo ────────────────────────────
// Los enlaces de vuelta de la concha de herramientas (y cualquier marcador
// viejo) traen `?m=lotes`, `?m=arena`… con las claves de la rejilla retirada.
// Cada clave vieja aterriza en su pestaña nueva; las que eran listas grandes
// aterrizan además con el drill abierto.
export const LEGACY_MODULE_TO_TAB: Record<DashboardModule, PanelTab> = {
  info: "perfil",
  fincas: "perfil",
  lotes: "perfil",
  arena: "evaluaciones",
  cert: "evaluaciones",
  contratos: "contratos",
  servicios: "ecosistema",
  herramientas: "ecosistema",
  coffeed: "ecosistema",
  jornadas: "ecosistema",
  retro: "mensajes",
  solicitudes: "mensajes",
};

export const LEGACY_MODULE_TO_DRILL: Partial<Record<DashboardModule, PanelDrill>> = {
  fincas: { kind: "fincas" },
  lotes: { kind: "lotes" },
};

export function esModuloLegado(m: string): m is DashboardModule {
  return m in LEGACY_MODULE_TO_TAB;
}
