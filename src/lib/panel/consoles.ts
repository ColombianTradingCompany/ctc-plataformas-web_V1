// ── CTC Web Platform · the internal consoles ────────────────────────────────
// Single source of truth for the FOUR internal consoles that share ONE login
// (the "master key") and ONE session. They are PARALLEL surfaces, each with its
// own route tree and shell — NOT tabs inside one panel. See the vision board
// (`reference_html-vision-board/ctc-arquitectura-v3.html`, tab "BCP · credenciales"):
//
//   BCP · Base Control Panel        — «Business». El negocio: el Ecosistema de
//                                     Valor y la configuración del sistema.
//   OCP · Operational Control Panel — «Operation». La operación: del productor
//                                     al catálogo — el pasaporte del lote entero
//                                     y los tableros CRM de Cherry Picked.
//   ECP · Executive Control Panel   — «Execution». La ejecución: Herramientas
//                                     Internas (los modelos) y el Tablero de Ejecución.
//                                     (La sigla conserva *Executive*: es la
//                                     decisión F1 del owner, 2026-08-17.)
//   LCP · Lead Control Panel        — «Relationship». La relación: todo lo que
//                                     entra de fuera y a quién se le responde —
//                                     buzón, leads, listas de espera y los CRM
//                                     de Cherry Picked. CUARTA consola, nacida
//                                     en la V5.59 (overhaul de las consolas,
//                                     docs/OVERHAUL_CONSOLAS_PLAN.md, fase 1).
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

export type PanelConsoleKey = "bcp" | "ecp" | "ocp" | "lcp";

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
    tagline: "El negocio: el ecosistema de valor y la configuración del sistema",
    accent: "#D3B8FA", // corporate lavender
    home: "/bcp",
    // El rail del BCP según el cuadro del owner (2026-09-19, V5.60 — fase 2 del overhaul): el BCP es
    // lo que la casa ES. Dos grupos: las plataformas que forman su Ecosistema de Valor, cada una con el
    // tablero de lo SUYO, y la configuración del sistema. «Herramientas Internas» —que vivió aquí de la
    // V5.55 a la V5.59— volvió al ECP: es con lo que la casa decide, no lo que es.
    nav: [
      {
        label: "BCP · Ecosistema de Valor",
        links: [
          // SIN entrada «Panel» (owner, 2026-09-19, V5.63): el rail enseña los módulos del cuadro y nada más.
          // La página `/bcp` sigue existiendo —es donde aterriza el conmutador de consolas—; lo que se fue es
          // su enlace. Lo mismo en el OCP y la LCP. El ECP conserva el suyo porque ES un módulo del cuadro:
          // el Tablero de Ejecución.
          // Herramientas (← ECP): desde la Fase 4 de V4 es un PRODUCTO de la red (superficie pública
          // propia), no tooling interno; aquí se administra su Disponibilidad, el Plus y su lista de espera.
          { href: "/bcp/herramientas", label: "Herramientas del Café" },
          // Directorio del Café (← ECP): la capa de personas de la red. Aquí se verifican las fichas
          // (Aceptar/Revisar/Rechazar → Código de Verificado) y se modera el muro.
          { href: "/bcp/directorio", label: "Directorio del Café" },
          // Coffeed (← ECP): el muro de noticias de la red y su línea de producción editorial. La
          // narrativa se dirige desde dentro, y su producción es lo que se delega — no al revés.
          // Sus dos compuertas (`coffeedGate`, `studioGate`) leen la consola de ESTE enlace.
          { href: "/bcp/coffeed", label: "Coffeed" },
          // CTC Tech y Varietales (← ECP): el tablero de los leads de SU superficie. No son un CRM de
          // Cherry Picked, y por eso no fueron a la LCP (D4). `leadsPilares.ts` deduce de estas rutas
          // qué consola administra cada pilar.
          { href: "/bcp/ctc-tech", label: "CTC Tech" },
          { href: "/bcp/varietales", label: "Varietales Registrados" },
          // Terratalento (← ECP): el servicio del RECOLECTOR. Aquí se hace el MATCH de las jornadas
          // (llamar / confirmar cupos / descartar) y se ve el roster y la lista de espera.
          { href: "/bcp/terratalento", label: "Terratalento" },
          // Kaffetal Regal Arena y su Club (← OCP; DE VUELTA: salieron del BCP en la V4.24). La Arena
          // es la vitrina —temporadas, sesiones, la jornada— y el Club la membresía que alimenta.
          // ⚠️ Su página sigue usando tres acciones del circuito del lote, que es del OCP (asignar a
          // sesión, invitar a la vitrina, revisar un reclamo): esas tres abren las DOS consolas.
          // V5.77: la Arena se queda (sesiones de segunda apreciación); el Club como membresía se retiró y sus
          // campañas viven en OCP · Manejo de Stock Físico como «Campañas de Subvención» (PLAN_CIRCUITO_DEL_LOTE §3).
          { href: "/bcp/arena", label: "Kaffetal Regal Arena" },
        ],
      },
      {
        label: "BCP · Configuración del Sistema",
        links: [
          { href: "/bcp/usuarios", label: "Usuarios y credenciales", ownerOnly: true },
          // Los socios se administran donde se CREDENCIALAN: dar de alta una credencial es configurar
          // la red. Fue grupo aparte («BCP · Red de Socios») hasta la V5.59; el cuadro lo trae aquí.
          { href: "/bcp/socios", label: "Socios de la red", ownerOnly: true },
          { href: "/bcp/documentacion", label: "Documentación del sistema" },
          { href: "/bcp/mapa", label: "Mapa de Trabajo", ownerOnly: true },
          { href: "/bcp/consumo", label: "Consumo de IA" },
          // Manejo de Plataformas (← ECP; F6 lo hizo módulo suelto en la V4.26): cómo se presenta cada
          // superficie de la red — estado, SEO, disponibilidad. Es configuración, y por eso está aquí.
          { href: "/bcp/plataformas", label: "Manejo de Plataformas" },
        ],
      },
    ],
  },
  ecp: {
    key: "ecp",
    code: "ECP",
    name: "Executive Control Panel",
    tagline: "La ejecución: con qué decide la casa y qué tiene pendiente",
    accent: "#FFCD00", // corporate gold
    home: "/ecp",
    // El rail del ECP según el cuadro del owner (V5.60): una cabecera de EJECUCIÓN y «Herramientas
    // Internas» agrupadas POR MODELO. El rail no tiene sub-grupos, así que cada modelo es un grupo con
    // su rótulo; juntos son el componente `herramientas-internas` (su charter), y el rail, los permisos y
    // las rutas siguen siendo de `consolas`.
    //
    // ⚠️ EL RAIL NO PROMETE LO QUE NO HAY (D9 del plan). El cuadro nombra entradas sin módulo —
    // «Seguimiento de Temas», «Plataformas de Pagos», Procesamiento, los tres costos logísticos—: entran
    // cuando lo tengan, cada una con su brief. Procesamiento/Empacado y Logística arrancan con el
    // cotizador que ya existe.
    nav: [
      {
        label: "ECP · Ejecución",
        links: [
          // El Panel del ECP ES el Tablero de Ejecución (V5.60): las tareas pendientes de las cuatro
          // consolas en un sitio. Hasta entonces era un índice con casillas de módulos por construir.
          { href: "/ecp", label: "Tablero de Ejecución", exact: true },
          { href: "/ecp/transcripciones", label: "Transcripciones" },
        ],
      },
      {
        // Definición de Contexto · Misión y Visión · Mercado Global · Grados: las pestañas de Direccionamiento.
        label: "ECP · Definición de Contexto",
        links: [{ href: "/ecp/direccionamiento", label: "Direccionamiento" }],
      },
      {
        // El PVC es el indicador principal del negocio; con él van la lectura de mercado, la escala de
        // grados con su calculadora, el tablero del método y el dossier. Owner-only porque publicar una
        // edición fija el precio de origen de la franja. Las anclas (la lectura diaria de la FNC que el
        // PVC consume) y cotizar un lote NO lo son: no fijan el precio de origen de nadie.
        // La RUTA del módulo sigue llamándose `pvc` a propósito (docs/PVC_BCP_PLAN.md §11).
        label: "ECP · Modelo Económico en Origen",
        links: [
          { href: "/ecp/pvc", label: "Modelo Económico", ownerOnly: true },
          { href: "/ecp/anclas-mercado", label: "Anclas de mercado" },
          { href: "/ecp/cotizador-lotes", label: "Cotizador de lotes" },
        ],
      },
      {
        // De CPS a verde empacado y embalado. Hoy su única pieza es el costo de empaque.
        label: "ECP · Modelo de Producción",
        links: [{ href: "/ecp/cotizador-empaque", label: "Empacado · costo de empaque" }],
      },
      {
        // Lo que cuesta después del FOB, por volumen y región. Hoy, el cotizador logístico entero; los
        // tres costos del cuadro (puerto Colombia · puerto destino · puerta a puerta) son sus futuras vistas.
        label: "ECP · Modelo Logístico",
        // El Cotizador Courier (V5.68): el costo FedEx de un envío de café < 100 kg, con el acuerdo firmado.
        links: [
          { href: "/ecp/cotizador-logistico", label: "Cotizador logístico" },
          { href: "/ecp/cotizador-courier", label: "Cotizador courier · FedEx" },
        ],
      },
      {
        // El registro de lo que corre en Make y el pulso de la espina de integración
        // (docs/INTEGRACIONES_PLAN.md). DE VUELTA: salió del ECP en la V4.25.
        label: "ECP · Plataforma",
        links: [{ href: "/ecp/automatizaciones", label: "Automatizaciones" }],
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
      // ── EL RAIL DEL OCP ES EL CUADRO DEL OWNER (2026-09-19, V5.63), entrada por entrada ──
      // Tres grupos: el origen (Kaffetal Regal), el camino comercial del lote (Catálogo) y el stock físico.
      // Sin «Panel» (la página `/ocp` sigue siendo donde aterriza el conmutador) y sin «Fichas Técnicas»
      // (se abre desde «Lotes en Evaluación», que es donde se usa — D4 del overhaul).
      //
      // ⚠️ LAS ETIQUETAS SON LAS DEL CUADRO; LAS RUTAS, LAS QUE YA EXISTÍAN. «Pendiente Oferta» es el módulo
      // de ofertas, «Ofertas CP Aceptadas» el de contratos (con la humedad dentro) y «Catálogo Activo» el
      // catálogo (con las subastas Tyrian como pestaña). Renombrar la ruta habría costado un 308 por módulo
      // sin ganar nada — la misma decisión que dejó al Modelo Económico en `/…/pvc`.
      {
        label: "OCP · Kaffetal Regal",
        links: [
          // UNA entrada donde hubo tres (V5.61, nota 1 del owner): Productor, Finca y Lote son una tabla
          // navegable en cualquier dirección, con su mapa, y el clic abre la vista completa
          // (`?lote=` · `?finca=` · `?productor=`). `/ocp/kr` por «Kaffetal Regal», el origen del lote.
          { href: "/ocp/kr", label: "Productores, Fincas y Lotes" },
          // V5.75 (owner, 2026-09-23 — las tres rutas del proveedor): «entrar al perfil de un productor para
          // hacer el proceso en su nombre». Los dos son UN mecanismo, la sesión asistida
          // (`src/lib/asistencia/actions.ts`): Asistencia para el productor ya inscrito; Desacoplado para la
          // cuenta que CTCx crea sin buzón y lleva por el dueño del café que no va a usar la plataforma.
          { href: "/ocp/asistencia", label: "Asistencia a Proveedores" },
          { href: "/ocp/desacoplado", label: "Proveedor Desacoplado" },
        ],
      },
      {
        // El camino del lote, en el orden en que lo recorre. Es el mismo que DERIVA `src/lib/ocp/circuito.ts`.
        label: "OCP · Catálogo",
        links: [
          // Nota 2: el lote cae aquí cuando el productor pide la evaluación, y se queda mientras se confirman
          // el pago y la muestra. Era la mitad «postulación» de Nominados.
          { href: "/ocp/a-evaluar", label: "Lotes a Evaluar" },
          // Nota 3: pagados y recibidos, en cola para la evaluación completa. Era la otra mitad de Nominados.
          // ⚠️ Conserva los baches: `recordEvaluationVerdict` EXIGE hoy que el lote esté en un bache en
          // «registro». Salen de la pantalla con la fase 4b, que cambia esa regla — no antes.
          { href: "/ocp/en-evaluacion", label: "Lotes en Evaluación" },
          // Nota 4: el Q-Grader ya dijo; falta que CTCx confirme el grado y empuje la oferta.
          { href: "/ocp/ofertas", label: "Lotes Evaluados → Pendiente Oferta" },
          // Nota 5: lo publicado. Las subastas Tyrian son su pestaña (Tyrian no se oferta: se subasta).
          { href: "/ocp/catalogo", label: "Catálogo Activo" },
          // Las ofertas que el productor aceptó: el contrato, sus liberaciones y la humedad mes a mes.
          { href: "/ocp/contratos", label: "Ofertas CP Aceptadas" },
          // Lo que CTCx compra en firme para venderlo como productor. Tyrian no cabe: lo impide un CHECK.
          { href: "/ocp/ctc-selection", label: "Oferta desde CTCx Selection" },
        ],
      },
      {
        // ⚠️ ESTOS DOS MÓDULOS NO EXISTEN TODAVÍA. El owner pidió el cuadro completo en el rail (2026-09-19),
        // lo que invierte la D9 del plan («el rail no promete lo que no hay») para este grupo. Sus páginas NO
        // fingen: dicen que no hay módulo, qué será, y que el brief espera su aprobación
        // (`docs/componentes/briefs/consolas-{gestion-de-muestras,ctcx-selection-compras}.md`).
        label: "OCP · Manejo de Stock Físico",
        links: [
          { href: "/ocp/muestras", label: "Gestión de Muestras" },
          // V5.77 (owner): las campañas de descuento salen del Kaffetal Club y son «Campañas de Subvención»:
          // códigos con el 30–70 % de la tarifa de evaluación, que CTCx emite y decide en Gestión de Muestras.
          { href: "/ocp/subvenciones", label: "Campañas de Subvención" },
          { href: "/ocp/compras", label: "CTCx Selection · Compras" },
        ],
      },
      // El grupo «OCP · Cherry Picked» (los cuatro CRM CP) se fue a «LCP · CRM» en la V5.59.
    ],
  },
  lcp: {
    key: "lcp",
    code: "LCP",
    name: "Lead Control Panel",
    tagline: "La relación: lo que entra de fuera y a quién se le responde",
    // Carmesí corporativo (`--crimson` #C8102F) aclarado para el rail oscuro, igual que el azul del
    // OCP aclara el `--navy`. El plan (D3) proponía un azul acero; se descartó al ejecutarlo porque
    // en el conmutador no se distingue del azul del OCP, y el carmesí era el color de la paleta
    // corporativa que ninguna consola usaba.
    accent: "#F0708A",
    home: "/lcp",
    nav: [
      {
        label: "LCP · General",
        links: [
          // El Buzón (← ECP, V5.59; antes BCP): el correo de la red. Un colaborador ve solo el
          // dirigido a su etiqueta @ctcexport.com; el owner, todo.
          { href: "/lcp/buzon", label: "Buzón de entrada" },
          // Leads · Recepción (← ECP): el pilar `general` de «Escríbenos». Los pilares de servicio
          // se miran en el tablero de SU superficie (CTC Tech y Varietales, en el ECP) o en su CRM
          // (CaaS, aquí abajo) — `src/lib/panel/leadsPilares.ts` es la fuente única de ese reparto.
          { href: "/lcp/leads", label: "Leads · Recepción" },
          // Lista de espera (← el módulo «ctc-home» del ECP): dejó de ser solo la de la portada. Reúne, con un
          // filtro, las cinco fuentes de `newsletter_subscribers` y la lista de Terratalento. Roast,
          // X, Directorio y Herramientas SIGUEN teniendo su tablero junto a lo suyo; esto es el
          // sitio donde se ven todas a la vez.
          { href: "/lcp/lista-espera", label: "Lista de espera" },
        ],
      },
      {
        // Los cuatro CRM de Cherry Picked (← «OCP · Cherry Picked»): un tablero por embudo. CaaS es
        // un kanban de leads; Green son los COMPRADORES de la tienda (su etapa se deduce de los
        // pedidos); Roast y X son listas de espera de programas que abren en 2027.
        label: "LCP · CRM",
        links: [
          { href: "/lcp/crm/caas", label: "CRM CP CaaS" },
          { href: "/lcp/crm/green", label: "CRM CP Green" },
          { href: "/lcp/crm/roast", label: "CRM CP Roast" },
          { href: "/lcp/crm/x", label: "CRM CP X" },
        ],
      },
    ],
  },
};

// El orden es el del cuadro del owner (2026-09-19): BCP · ECP · OCP · LCP. Todo lo que enumera
// consolas —el conmutador, `/panel`, la pantalla de credenciales, `grantedConsoles`, los guardianes—
// lee de aquí: una quinta consola es una línea en este archivo, no una búsqueda por el repo.
export const CONSOLE_ORDER: PanelConsoleKey[] = ["bcp", "ecp", "ocp", "lcp"];

/**
 * La consola en cuyo rail vive un módulo, por su segmento: `consolaDelModulo("coffeed")` es la que tenga
 * el enlace `/<consola>/coffeed`. Para las compuertas que viven FUERA del árbol de su consola
 * (`src/lib/coffeed/`): en vez de llevar la clave escrita —que ninguna reescritura de rutas toca, y que
 * por eso se quedó atrás en media docena de mudanzas— la leen de aquí, y mover el enlace mueve el permiso.
 * `null` si nadie lo enlaza: quien llama tiene que CERRAR, no suponer una consola.
 */
export function consolaDelModulo(segmento: string): PanelConsoleKey | null {
  for (const k of CONSOLE_ORDER) {
    if (CONSOLES[k].nav.some((g) => g.links.some((l) => l.href === `/${k}/${segmento}`))) return k;
  }
  return null;
}
