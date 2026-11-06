// ── CTCx OS · los textos en español (F3) · PURO ──────────────────────────────
// La pista de idiomas (owner, 6 nov, CAN-29): ES/EN como mínimo en todo, con los nombres nativos en
// español («Acciones», «Estafeta», «Hacienda» se llaman igual en inglés) y «Checkout» igual en los dos
// idiomas. Mientras el conmutador ES/EN no exista, lo NUEVO nace con sus textos en UNA fuente por idioma
// para que el pase sea una traducción y no una reescritura: este archivo (el español, el primero) y
// `en.ts` (la misma forma, comprobada por el tipo `TextosDelOs` y por `qa-os-check` F3). Las vistas de
// los módulos de F3 no escriben texto propio: lo leen de aquí (`textosDelOs()` en `idioma.ts`).
// Los textos de F2 (Inicio, Hacienda, Almacén, Taller) siguen en sus vistas; pasan aquí con su sección.
// Sin cifras, nombres de personas ni datos: solo palabras de la casa.

export const TEXTOS_ES = {
  idioma: "es",

  /** Lo que dice Inicio de cada módulo nuevo, en su lista. */
  modulos: {
    acciones: "Lo pendiente de hoy: las tareas que calcula la plataforma y las Tareas de Notion, juntas en la vista y nunca mezcladas en los datos.",
    estafeta: "La correspondencia de la casa en punteros: a quién le toca responder, qué esperamos de otros y qué falta por clasificar.",
  },

  /** Cómo se llama cada cifra nueva en pantalla (las etiquetas de sus piezas en `fuentes.ts`). */
  piezas: {
    acciones_notion_abiertas: "Tareas de Notion abiertas",
    acciones_notion_vencidas: "Tareas de Notion vencidas",
    acciones_notion_esperando: "Tareas de Notion esperando respuesta",
    acciones_notion_sin_hub: "Tareas de Notion sin hub",
    estafeta_te_toca: "Te toca",
    estafeta_esperando: "Esperando a otros",
    estafeta_revisar: "Por revisar",
    estafeta_libro: "Cartas en el Libro",
  },

  /** El filtro de cada cifra nueva, en palabras (la línea de «Ver fuentes»; el `filtro` de sus piezas en `fuentes.ts`). */
  filtros: {
    acciones_notion_abiertas: "grupo por hacer o en curso, con Área",
    acciones_notion_vencidas: "abiertas con la fecha pasada",
    acciones_notion_esperando: "Esperando respuesta",
    acciones_notion_sin_hub: "abiertas sin Área",
    estafeta_te_toca: "Te toca, con hub, persona, responsable y motivo",
    estafeta_esperando: "Esperando respuesta, con sus llaves",
    estafeta_revisar: "Revisar, o sin hub, persona, responsable o motivo",
    estafeta_libro: "todas las filas, lo más nuevo arriba",
  },

  /** Las notas de procedencia nuevas (la línea de «Ver fuentes»). */
  notas: {
    sin_integracion_notion: "sin la lectura de Notion todavía: llega con la integración de solo lectura del OS (decisión CON-28)",
  },

  /** Lo que dice un aviso cuando una lectura de Notion falla. */
  avisos: {
    lectura_tareas_notion: "No se pudieron leer las Tareas de Notion.",
    lectura_correspondencia: "No se pudo leer el registro «Correspondencia».",
  },

  /** El origen de una fuente, delante de su línea en «Ver fuentes». */
  origen: { plataforma: "Plataforma", notion: "Notion" },

  enObra: "En obra · F3",

  acciones: {
    eyebrow: "Módulo · Acciones · hub 8 · Ejecución",
    titulo: "Las Acciones",
    texto:
      "Lo pendiente de hoy en un solo sitio: las tareas que calcula la plataforma (las del Tablero de Ejecución) y las Tareas de Notion. Se juntan en la vista, nunca en los datos: cada cifra dice de dónde sale y abre la pantalla donde se resuelve.",
    obra:
      "Las Tareas de Notion llegan con la integración de solo lectura del OS (decisión CON-28). Hasta entonces dicen «Sin datos»: no es un cero, es que todavía no se leen.",
    totalesTitulo: "Lo pendiente, en cuatro cifras",
    totalPlataforma: "Abiertas en la plataforma",
    totalNotion: "Abiertas en Notion con hub",
    totalEsperando: "Esperando respuesta (Notion)",
    totalSinHub: "En Notion sin hub",
    porHubTitulo: "Por hub",
    porHubNota:
      "Las de la plataforma, contadas por el hub de su entidad (las mismas de la Hacienda); las de Notion, por su Área. Un hub cuyas tareas la plataforma todavía no calcula (sin fuente aún) dice «Sin datos»; uno que sí las calcula y está al día dice 0. Las Tareas de Notion sin Área no van en ninguna fila: se cuentan aparte, en «En Notion sin hub».",
    columnaHub: "Hub",
    columnaPlataformaAbiertas: "Plataforma · abiertas",
    columnaPlataformaVencidas: "Plataforma · vencidas",
    columnaNotionAbiertas: "Notion · abiertas",
    columnaNotionVencidas: "Notion · vencidas",
    columnaNotionEsperando: "Notion · esperando",
    nadaSale: "Aquí no se marca ni se cierra nada: cada tarea se resuelve en su pantalla, por su fuente.",
    marcoAria: "Las tareas por hub",
  },

  estafeta: {
    eyebrow: "Módulo · Estafeta · hub 7 · Directorios",
    titulo: "La Estafeta",
    texto:
      "El mostrador de la correspondencia de la casa: a quién le debemos respuesta, qué esperamos de otros y qué falta por clasificar. Aquí solo hay punteros: el texto de cada mensaje se queda en su canal, y cada carta se responde donde vive.",
    obra:
      "Lee el registro «Correspondencia» de Notion (solo punteros y obligaciones) cuando exista la integración de solo lectura del OS (decisión CON-28). Hasta entonces, todo dice «Sin datos».",
    bandejasTitulo: "Las tres bandejas",
    bandejasNota: "Cada carta cuenta UNA vez: primero lo que falta por clasificar, después lo que te toca, después lo que esperamos.",
    bandejas: {
      te_toca: "Te toca",
      esperando: "Esperando a otros",
      revisar: "Por revisar",
      en_curso: "En curso",
      cerrada: "Cerrada",
    },
    bandejaNotas: {
      te_toca: "Nos escribieron y nos toca responder.",
      esperando: "Escribimos y esperamos respuesta.",
      revisar: "Sin hub, sin persona, sin responsable o sin motivo: una persona la clasifica; nunca se adivina.",
    },
    porHubTitulo: "Por hub",
    porHubNota: "Las cartas en «Te toca» de cada hub y la más vieja: lo que levantará la bandera del buzón de su edificio.",
    columnaHub: "Hub",
    columnaTeToca: "Te toca",
    columnaMasVieja: "La más vieja",
    sinCartas: "Ninguna",
    libroTitulo: "El Libro de entrada y salida",
    libroNota:
      "Lo más nuevo arriba. «Enviado» se pinta solo con la prueba (el número del evento y el del mensaje); sin ella, la carta dice «Por comprobar».",
    libroVacio: "El Libro no tiene cartas.",
    columnaFecha: "Fecha",
    columnaCanal: "Canal",
    columnaDireccion: "Dirección",
    columnaEstado: "Estado",
    columnaBandeja: "Bandeja",
    sinHub: "Sin hub",
    nadaSale: "Nada sale desde aquí: la Estafeta no envía, no escribe borradores y no lee el texto de ningún mensaje.",
    canales: {
      gmail: "Gmail",
      instagram: "Instagram",
      youtube: "YouTube",
      whatsapp: "WhatsApp",
      line: "LINE",
      correo_plataforma: "Correo de la plataforma",
      directorio: "Plataforma (Directorio)",
    },
    direcciones: { entra: "Entra", sale: "Sale", accion: "Acción" },
    estados: {
      revisar: "Revisar",
      te_toca: "Te toca",
      propuesta: "Propuesta",
      borrador_listo: "Borrador listo",
      por_comprobar: "Por comprobar",
      en_camino: "En camino",
      enviado: "Enviado",
      enviado_a_mano: "Enviado a mano (sin comprobar)",
      devuelta: "Devuelta",
      esperando_respuesta: "Esperando respuesta",
      cerrado: "Cerrado",
      no_escribir: "No escribir",
      retirado: "Retirado",
    },
  },

  /** Las palabras fijas de «Copiar contexto para Tailor» de los módulos nuevos (solo conteos y estados). */
  contexto: {
    acciones: "CTCx OS · Acciones leídas",
    estafeta: "CTCx OS · Estafeta leída",
    demo: "DATOS INVENTADOS del modo demostración",
    sinDatos: "sin datos",
    sinIntegracion: "sin la lectura de Notion todavía (decisión CON-28)",
    plataforma: "plataforma",
    notion: "Notion",
    abiertas: "abiertas",
    vencidas: "vencidas",
    esperando: "esperando respuesta",
    sinHub: "sin hub",
  },
} as const;

/** La forma de los textos, con cada hoja ensanchada a `string`: la del inglés tiene que ser EXACTAMENTE ésta. */
type Ensanchar<T> = T extends string ? string : { readonly [K in keyof T]: Ensanchar<T[K]> };
export type TextosDelOs = Ensanchar<typeof TEXTOS_ES>;
