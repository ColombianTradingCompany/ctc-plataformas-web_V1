// ── CTC Web Platform · the internal consoles ────────────────────────────────
// Single source of truth for the three INTERNAL consoles that share ONE login
// (the "master key") and ONE session. They are PARALLEL surfaces, each with its
// own route tree and shell — NOT tabs inside one panel. See the vision board
// (`reference_html-vision-board/ctc-arquitectura-v3.html`, tab "BCP · credenciales"):
//
//   BCP · Base Control Panel        — identity root + the lot passport. Creates
//                                     every credentialed account and defines what
//                                     each credential reaches. "La matriz de
//                                     permisos hecha software."
//   ECP · Executive Control Panel   — direction: pricing, primas, finances, the
//                                     reservations book, partner on/off-boarding,
//                                     network-health KPIs. The only place the whole
//                                     model is visible at once.
//   OCP · Operational Control Panel — the mirror of every partner interface:
//                                     dispatch, tracking, exceptions, relevos.
//                                     What the ECP directs, the OCP executes.
//
// External PARTNER interfaces (Centro de Calidad, Agente de Carga, Agente de
// Nacionalización, Master Roaster, Estudio de Contenido) are a SEPARATE identity
// tier (see docs/BCP_USER_ADMIN_PLAN.md) — they are credentialed by BCP but are
// not consoles listed here, and their operators are never `bcp_admin`.

export type PanelConsoleKey = "bcp" | "ecp" | "ocp";

export type PanelNavLink = { href: string; label: string; exact?: boolean };
export type PanelNavGroup = { label: string; links: PanelNavLink[]; ownerOnly?: boolean };

export type PanelConsole = {
  key: PanelConsoleKey;
  code: string; // "BCP"
  name: string; // "Base Control Panel"
  tagline: string; // one-line role
  /** Accent used to distinguish the console in the switcher (on the dark rail). */
  accent: string;
  /** Where entering this console lands. */
  home: string;
  nav: PanelNavGroup[];
};

export const CONSOLES: Record<PanelConsoleKey, PanelConsole> = {
  bcp: {
    key: "bcp",
    code: "BCP",
    name: "Base Control Panel",
    tagline: "Identidad y pasaporte del lote",
    accent: "#D3B8FA", // corporate lavender
    home: "/bcp",
    nav: [
      {
        label: "BCP · Negocio",
        links: [
          { href: "/bcp", label: "Panel", exact: true },
          { href: "/bcp/productores", label: "Productores" },
          { href: "/bcp/club", label: "Kaffetal Club" },
          { href: "/bcp/fincas", label: "Fincas" },
          { href: "/bcp/lotes", label: "Lotes" },
          { href: "/bcp/nominados", label: "Nominados" },
          { href: "/bcp/arena", label: "Arena" },
          { href: "/bcp/evaluaciones", label: "Evaluaciones" },
          { href: "/bcp/contratos", label: "Contratos" },
          { href: "/bcp/catalogo", label: "Catálogo Cherry Picked" },
          { href: "/bcp/subastas", label: "Subastas Tyrian" },
          { href: "/bcp/leads", label: "Leads CTC Home" },
          { href: "/bcp/buzon", label: "Buzón de entrada" },
        ],
      },
      {
        // Identity is BCP's job in the v3 model ("cada cuenta nace en el BCP").
        // Owner-only: only a founder/owner manages collaborators.
        label: "Administración",
        ownerOnly: true,
        links: [
          { href: "/bcp/usuarios", label: "Usuarios y credenciales" },
          { href: "/bcp/socios", label: "Socios de la red" },
        ],
      },
    ],
  },
  ecp: {
    key: "ecp",
    code: "ECP",
    name: "Executive Control Panel",
    tagline: "Dirección: precios, primas, finanzas, salud de la red",
    accent: "#FFCD00", // corporate gold
    home: "/ecp",
    nav: [
      {
        label: "ECP · Dirección",
        links: [{ href: "/ecp", label: "Panel", exact: true }],
      },
    ],
  },
  ocp: {
    key: "ocp",
    code: "OCP",
    name: "Operational Control Panel",
    tagline: "Operación: despacho, seguimiento, excepciones, relevos",
    accent: "#5B8DEF", // corporate blue
    home: "/ocp",
    nav: [
      {
        label: "OCP · Operación",
        links: [{ href: "/ocp", label: "Panel", exact: true }],
      },
    ],
  },
};

export const CONSOLE_ORDER: PanelConsoleKey[] = ["bcp", "ecp", "ocp"];
