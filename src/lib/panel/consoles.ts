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

export type PanelNavLink = { href: string; label: string; exact?: boolean; ownerOnly?: boolean };
/** `ownerOnly` en el grupo oculta TODO el grupo; en un link, solo ese link.
 *  `label` opcional: sin label, el grupo se dibuja como un simple bloque
 *  separado por un divisor (submenús del BCP, 2026-07-21). */
export type PanelNavGroup = { label?: string; links: PanelNavLink[]; ownerOnly?: boolean };

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
    // Tres submenús (2026-07-21), sin encabezado — separados por un divisor:
    //   comercial (Panel · Club · Catálogo) · cadena (Productores/Fincas/Lotes)
    //   · competencia (Nominados · Arena · Galardonados).
    // Contratos y Subastas Tyrian ya no son entradas propias: viven como
    // pestañas dentro del Catálogo Cherry Picked. Leads → OCP, Buzón → ECP.
    nav: [
      {
        links: [
          { href: "/bcp", label: "Panel", exact: true },
          { href: "/bcp/club", label: "Kaffetal Club" },
          { href: "/bcp/catalogo", label: "Catálogo Cherry Picked" },
          // Black Stock (V4 · vía paralela): la clase de volumen — pipeline de
          // negociaciones Black + inventario adquirido que alimenta la pestaña
          // Black de Cherry Picked Green.
          { href: "/bcp/black-stock", label: "Black Stock" },
          // CRM Co-Create (V4 · Fase 1): el outlet Co-Create es negocio núcleo,
          // así que su kanban vive aquí — no en el OCP como el resto de leads.
          { href: "/bcp/co-create", label: "CRM Co-Create" },
        ],
      },
      {
        links: [
          { href: "/bcp/productores", label: "Productores" },
          { href: "/bcp/fincas", label: "Fincas" },
          { href: "/bcp/lotes", label: "Lotes" },
        ],
      },
      {
        links: [
          { href: "/bcp/nominados", label: "Nominados" },
          { href: "/bcp/arena", label: "Arena" },
          { href: "/bcp/galardonados", label: "Galardonados" },
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
        links: [
          { href: "/ecp", label: "Panel", exact: true },
          // Grados de Calidad (2026-08-05): LA definición. Estaban en tres
          // sitios con tres respuestas distintas —dos de ellas material de
          // cliente—; ahora se miran aquí y lo demás copia.
          { href: "/ecp/grados", label: "Grados de Calidad" },
          // El Buzón se movió del BCP a ECP (2026-07-21): el correo de la red es
          // material de dirección, no operación diaria.
          { href: "/ecp/buzon", label: "Buzón de entrada" },
          // Directorio del Café (2026-07-24): la capa de personas de la red. Aquí
          // se verifican las fichas (Aceptar/Revisar/Rechazar → Código de
          // Verificado) y se modera el muro.
          { href: "/ecp/directorio", label: "Directorio del Café" },
          // Coffeed (2026-07-30): el muro de noticias de la red y su línea de
          // producción editorial. Nació como módulo del socio Estudio de
          // Contenido y se movió AQUÍ por decisión del owner: la narrativa se
          // dirige desde dentro, y su producción es lo que se delega — no al
          // revés. Lo que se publica aquí aparece en KR, Cherry Picked y el DC.
          { href: "/ecp/coffeed", label: "Coffeed" },
          // CRMs de captación (V4 · Fase 1): CTC Tech y Varietales son capa
          // estratégica, así que sus kanbans viven aquí (regla Fase 0: el CRM
          // vive en la consola dueña del dominio).
          { href: "/ecp/ctc-tech", label: "CRM CTC Tech" },
          { href: "/ecp/varietales", label: "CRM Varietales" },
          // Herramientas (2026-08-02): renombrada y movida de "IT y Plataforma"
          // a Dirección — desde la Fase 4 de V4 es un PRODUCTO de la red
          // (superficie pública propia), no tooling interno; aquí se administra
          // su Disponibilidad.
          { href: "/ecp/herramientas", label: "Herramientas del café" },
          // Terratalento (CONSTRUIDO 2026-08-02): el servicio del RECOLECTOR —
          // superficie propia (terratalento.ctcexport.com, identidad única del
          // ecosistema, patrón Directorio) donde crea su perfil y se postula;
          // las fincas publican "Jornadas de Recolecta" desde su hub de
          // Kaffetal Regal, y aquí el ECP hace el MATCH (llamar / confirmar
          // cupos / descartar) y ve el roster completo.
          { href: "/ecp/terratalento", label: "Terratalento" },
        ],
      },
      {
        // IT y Plataforma (2026-07-18): la administración de identidades salió del
        // BCP. El BCP sigue siendo la RAÍZ de identidad del modelo de negocio (cada
        // productor, comprador y lote nace ahí), pero administrar *la plataforma en
        // sí* —quién opera las consolas, qué socios existen, cómo está documentado
        // el sistema— es dirección, no operación diaria. Owner-only, como antes.
        label: "ECP · IT y Plataforma",
        // El gate es POR LINK, no por grupo: leer el mapa del sistema y repartir
        // credenciales son riesgos distintos. La documentación es material de
        // referencia sin secretos (estructura, no llaves) — cualquier operador
        // con acceso a una consola gana entendiéndola. Emitir credenciales de
        // colaboradores y socios sigue siendo cosa de owner.
        links: [
          { href: "/ecp/documentacion", label: "Documentación del sistema" },
          // Automatizaciones (2026-08-05): el registro de lo que corre en Make y
          // el pulso de la espina de integración. Va aquí porque es
          // infraestructura, no operación. Ver docs/INTEGRACIONES_PLAN.md.
          { href: "/ecp/automatizaciones", label: "Automatizaciones" },
          { href: "/ecp/mapa", label: "Mapa de Trabajo", ownerOnly: true },
          // "Herramientas internas" se renombró y subió al grupo de Dirección
          // (2026-08-02) — ver el comentario allá.
          { href: "/ecp/usuarios", label: "Usuarios y credenciales", ownerOnly: true },
        ],
      },
      {
        // GVG-Space (2026-07-27): el espacio PERSONAL del owner dentro de la
        // consola — submódulos propios (CV App Manager) tras su propio candado
        // suave (patrón Admin Lock + cookie firmada). Owner-only y sin
        // encabezado: un divisor lo separa del resto de la consola a propósito.
        ownerOnly: true,
        links: [{ href: "/ecp/gvg", label: "GVG-Space", ownerOnly: true }],
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
        links: [
          { href: "/ocp", label: "Panel", exact: true },
          // Leads (2026-07-21 BCP→OCP; V4 Fase 1: solo queda `general`) — la
          // recepción de la red. Los pilares de servicio viven en su consola
          // dueña: cocreate → BCP, tech y varietales → ECP.
          { href: "/ocp/leads", label: "Leads · Recepción" },
          // Los socios se administran donde se OPERAN (2026-07-20): el OCP es el
          // espejo de las interfaces de partner, así que dar de alta y de baja
          // una credencial de nodo pertenece aquí, no a la consola de dirección.
          // Sigue siendo owner-only, y la page lo impone aparte del nav.
          { href: "/ocp/socios", label: "Socios de la red", ownerOnly: true },
        ],
      },
      {
        // Cotizadores (2026-08-04): cotizar es operación —se hace contra un
        // productor o un cliente concreto, con números que salen de la cadena
        // real— así que viven en el OCP y no en el ECP, que fija la política de
        // precios. Dos módulos sobre UNA tabla `quotes` con `kind` de
        // discriminador; comparten destinatario, código, vigencia e historial.
        label: "OCP · Cotizadores",
        links: [
          { href: "/ocp/cotizador-lotes", label: "Lotes de café" },
          { href: "/ocp/cotizador-logistico", label: "Logístico" },
          // Costo de empaque (2026-08-06): la calculadora del banco público, con
          // memoria. Su casa PRINCIPAL es esta, no la lista de herramientas.
          { href: "/ocp/cotizador-empaque", label: "Costo de empaque" },
          // Las referencias con las que cotizan las dos calculadoras. Salió de la
          // Configuración de Mermas para poder consultarse y crecer por su cuenta.
          { href: "/ocp/anclas-mercado", label: "Anclas de mercado" },
        ],
      },
    ],
  },
};

export const CONSOLE_ORDER: PanelConsoleKey[] = ["bcp", "ecp", "ocp"];
