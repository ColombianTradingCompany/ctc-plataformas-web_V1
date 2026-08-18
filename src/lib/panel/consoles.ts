// ── CTC Web Platform · the internal consoles ────────────────────────────────
// Single source of truth for the three INTERNAL consoles that share ONE login
// (the "master key") and ONE session. They are PARALLEL surfaces, each with its
// own route tree and shell — NOT tabs inside one panel. See the vision board
// (`reference_html-vision-board/ctc-arquitectura-v3.html`, tab "BCP · credenciales"):
//
//   BCP · Base Control Panel        — «Business». El negocio: dirección,
//                                     configuración del sistema y red de socios.
//   OCP · Operational Control Panel — «Operation». La operación: del productor
//                                     al catálogo — el pasaporte del lote entero
//                                     y los tableros CRM de Cherry Picked.
//   ECP · Executive Control Panel   — «Execution». La ejecución: plataformas,
//                                     contacto y caja de herramientas interna.
//                                     (La sigla conserva *Executive*: es la
//                                     decisión F1 del owner, 2026-08-17.)
//
// ⚠️ Ese es el reparto al que VAMOS. Las palabras se congelaron el 2026-08-18
// (paso (i) de docs/V5_CONSOLAS_PLAN.md) ANTES de mover un solo módulo, y solo
// serán ciertas al terminar el paso (ii). Lo que hay HOY en cada consola está
// en su `nav`, más abajo, y todavía no coincide.
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

// ⚠️ LOS TRES `tagline` DESCRIBEN LA CASA A LA QUE VAMOS, NO LA DE HOY
// (congelados el 2026-08-18, paso (i) de `docs/V5_CONSOLAS_PLAN.md`, V4.23).
// El owner fijó una palabra de misión por consola —Business, Execution,
// Operation— y los taglines son su traducción. Pero la MUDANZA de módulos que
// los hace ciertos es el paso (ii), que todavía no ha ocurrido: hoy el
// pasaporte del lote sigue en el BCP y los cotizadores en el OCP, así que si
// lee un tagline y luego el `nav` de debajo, no van a cuadrar.
// Es a propósito. NO los "corrija" de vuelta a lo que hace el rail hoy: el
// vocabulario se congela ANTES de mover nada, justamente para que la mudanza
// tenga un destino escrito al que apuntar.
export const CONSOLES: Record<PanelConsoleKey, PanelConsole> = {
  bcp: {
    key: "bcp",
    code: "BCP",
    name: "Base Control Panel",
    tagline: "El negocio: dirección, configuración y red de socios",
    accent: "#D3B8FA", // corporate lavender
    home: "/bcp",
    // El rail del BCP, ya con su reparto (PR-B del paso (ii), V4.25). Los
    // bloques son las tres cosas que el BCP ES: qué dice la casa
    // (Direccionamiento), cómo está configurado el sistema, y quién forma la
    // red de socios. El pasaporte del lote se opera desde el OCP desde PR-A.
    nav: [
      {
        label: "BCP · Business Core",
        links: [
          { href: "/bcp", label: "Panel", exact: true },
          // Direccionamiento (← ECP, PR-B): qué dice la casa y con qué cifras.
          // «Manejo de Plataformas» NO vino: F6 lo convierte en módulo suelto
          // del ECP en PR-C, y hasta entonces sigue en /bcp/direccionamiento/…
          { href: "/bcp/direccionamiento", label: "Direccionamiento" },
        ],
      },
      {
        label: "BCP · Configuración del Sistema",
        links: [
          { href: "/bcp/usuarios", label: "Usuarios y credenciales", ownerOnly: true },
          { href: "/bcp/documentacion", label: "Documentación del sistema" },
          { href: "/bcp/mapa", label: "Mapa de Trabajo", ownerOnly: true },
          { href: "/bcp/consumo", label: "Consumo de IA" },
          { href: "/bcp/automatizaciones", label: "Automatizaciones" },
        ],
      },
      {
        label: "BCP · Red de Socios",
        links: [
          // Los socios se administran donde se CREDENCIALAN. Estuvieron en el
          // OCP desde 2026-07-20 con el argumento de que se OPERAN allí; la
          // reorganización V5 se queda con el otro: dar de alta una credencial
          // es configurar la red, y eso es el BCP. En el paso (iii) este módulo
          // gana una ficha por nodo partner (F3).
          { href: "/bcp/socios", label: "Socios de la red", ownerOnly: true },
        ],
      },
      {
        // GVG-Space (← ECP, PR-B): el espacio PERSONAL del owner, con su propio
        // candado suave además del login maestro. Owner-only y sin encabezado:
        // un divisor lo separa del resto a propósito. Sale hacia CommaaS más
        // adelante (F13).
        ownerOnly: true,
        links: [{ href: "/bcp/gvg", label: "GVG-Space", ownerOnly: true }],
      },
    ],
  },
  ecp: {
    key: "ecp",
    code: "ECP",
    name: "Executive Control Panel",
    tagline: "La ejecución: plataformas, contacto y caja de herramientas",
    accent: "#FFCD00", // corporate gold
    home: "/ecp",
    nav: [
      {
        label: "ECP · Dirección",
        links: [
          { href: "/ecp", label: "Panel", exact: true },
          // Direccionamiento (2026-08-10): qué dice la casa y con qué cifras.
          // Pestaña 1 = «Definición de contexto», la ficha viva de realineación
          // de GTM y comunicación (CTCX · KR · CHP), con redacción asistida.
          // Pestaña 2 = «Grados de Calidad» (2026-08-05), LA definición —
          // estaba en tres sitios con tres respuestas distintas, dos de ellas
          // material de cliente. Se metió aquí dentro porque es exactamente la
          // cifra que el contenido no puede inventarse; /bcp/direccionamiento/grados sigue vivo
          // como redirección.
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
          // las fincas publican "Jornadas de Recolecta" desde su panel de
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
          // Automatizaciones (2026-08-05): el registro de lo que corre en Make y
          // el pulso de la espina de integración. Va aquí porque es
          // infraestructura, no operación. Ver docs/INTEGRACIONES_PLAN.md.
          // Consumo de IA (2026-08-10): lo que cuestan los modelos, en tokens y
          // en dólares. Va aquí y no en Dirección porque es infraestructura —
          // el hermano de Automatizaciones: aquélla dice QUÉ corre, ésta dice
          // CUÁNTO cuesta. Ver src/lib/ai/precios.ts para las tarifas.
          // Manejo de Plataformas (2026-08-16) — ATAJO, no un módulo.
          // La página VIVE dentro de Direccionamiento, como su tercera pestaña
          // (decisión del owner: «tiene que estar fusionado en uno»), y este
          // enlace apunta exactamente ahí. Está en este grupo porque es donde el
          // owner la buscó primero — gobernar cómo se presenta cada superficie
          // se siente infraestructura, aunque la pregunta de fondo sea la misma
          // que la de las otras dos pestañas. Duplicar el DESTINO es barato;
          // duplicar el MÓDULO habría sido el error que la regla evitaba.
          { href: "/ecp/direccionamiento/plataformas", label: "Manejo de Plataformas" },
          // "Herramientas internas" se renombró y subió al grupo de Dirección
          // (2026-08-02) — ver el comentario allá.
        ],
      },
    ],
  },
  ocp: {
    key: "ocp",
    code: "OCP",
    name: "Operational Control Panel",
    tagline: "La operación: del productor al catálogo",
    accent: "#5B8DEF", // corporate blue
    home: "/ocp",
    nav: [
      {
        label: "OCP · Operación",
        links: [
          { href: "/ocp", label: "Panel", exact: true },
          // Leads (2026-07-21 BCP→OCP; V4 Fase 1: solo queda `general`) — la
          // recepción de la red. Los pilares de servicio viven en su consola
          // dueña: cocreate/CaaS aquí mismo (CRM CP CaaS, desde PR-A), tech y
          // varietales → ECP. Este módulo se va al ECP en PR-C.
          { href: "/ocp/leads", label: "Leads · Recepción" },
        ],
      },
      {
        // Kaffetal Regal (← BCP, PR-A del paso (ii), 2026-08-18): el origen del
        // lote. Es la cadena tal y como la ve el operador — quién produce, dónde
        // y qué. Antes vivía en el BCP porque el BCP era el dueño del pasaporte;
        // desde la reorganización V5 el pasaporte ES la operación.
        label: "OCP · Kaffetal Regal",
        links: [
          { href: "/ocp/productores", label: "Productores" },
          { href: "/ocp/fincas", label: "Fincas" },
          { href: "/ocp/lotes", label: "Lotes" },
        ],
      },
      {
        // KR Arena (← BCP): la calificación. Nominados es la fila de espera,
        // Arena la sesión de cata y Galardonados el resultado sellado. El Club
        // viaja con ellos: es la membresía que la Arena alimenta.
        label: "OCP · KR Arena",
        links: [
          { href: "/ocp/nominados", label: "Nominados" },
          { href: "/ocp/arena", label: "Arena" },
          { href: "/ocp/galardonados", label: "Galardonados" },
          { href: "/ocp/club", label: "Kaffetal Club" },
        ],
      },
      {
        // Catálogo (← BCP): la salida comercial del lote. Contratos y Subastas
        // Tyrian NO son entradas propias — son pestañas dentro del Catálogo, y
        // siguen sin serlo tras la mudanza.
        label: "OCP · Catálogo",
        links: [
          { href: "/ocp/catalogo", label: "Catálogo Cherry Picked (Contratos Vigentes)" },
          // Black Stock: la clase de volumen. En el paso (iii) se convierte en
          // una pestaña de «CTC Selection» (F4) y esta ruta se reapunta ALLÍ,
          // en `rutasMovidas.ts` — no encadenando un talón contra otro.
          { href: "/ocp/black-stock", label: "Black Stock" },
        ],
      },
      {
        // CRM CP (← BCP el de CaaS): un tablero por embudo de Cherry Picked.
        // Hoy solo existe CaaS; Green, Roast y X nacen en el paso (iii) (F5).
        label: "OCP · Cherry Picked",
        links: [{ href: "/ocp/crm/caas", label: "CRM CP CaaS" }],
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
          // Transcripciones (2026-08-17): las conversaciones de operación —notas
          // de voz de WhatsApp, llamadas— transcritas con hablantes por la
          // herramienta local (GPU) y archivadas aquí con asunto, fecha y notas.
          { href: "/ocp/transcripciones", label: "Transcripciones" },
        ],
      },
    ],
  },
};

export const CONSOLE_ORDER: PanelConsoleKey[] = ["bcp", "ecp", "ocp"];
