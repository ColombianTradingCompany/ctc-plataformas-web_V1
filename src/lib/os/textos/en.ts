import type { TextosDelOs } from "./es";

// ── CTCx OS · the texts in English (F3) · PURE ───────────────────────────────
// The same shape as `es.ts` (the type `TextosDelOs` refuses a missing or an extra key, and `qa-os-check`
// F3 compares the two leaf by leaf). Native names stay in Spanish (CAN-29): «Acciones», «Estafeta»,
// «Hacienda», «Correspondencia», «Libro». «Checkout» is the same word in both languages. A draft
// translation by Code Master: the owner reviews it before the ES/EN switch exists.

export const TEXTOS_EN: TextosDelOs = {
  idioma: "en",

  modulos: {
    acciones: "What is pending today: the tasks the platform computes and the Notion Tasks, together on screen and never merged in the data.",
    estafeta: "The house's correspondence as pointers: whose turn it is to reply, what we are waiting for from others and what is still to be sorted.",
  },

  piezas: {
    acciones_notion_abiertas: "Open Notion Tasks",
    acciones_notion_vencidas: "Overdue Notion Tasks",
    acciones_notion_esperando: "Notion Tasks waiting for a reply",
    acciones_notion_sin_hub: "Notion Tasks without a hub",
    estafeta_te_toca: "Your turn",
    estafeta_esperando: "Waiting for others",
    estafeta_revisar: "To review",
    estafeta_libro: "Letters in the Libro",
  },

  filtros: {
    acciones_notion_abiertas: "to-do or in-progress group, with an Área",
    acciones_notion_vencidas: "open with a past date",
    acciones_notion_esperando: "Waiting for a reply",
    acciones_notion_sin_hub: "open without an Área",
    estafeta_te_toca: "Your turn, with hub, person, owner and reason",
    estafeta_esperando: "Waiting for a reply, with its keys",
    estafeta_revisar: "To review, or without hub, person, owner or reason",
    estafeta_libro: "every row, newest first",
  },

  notas: {
    sin_integracion_notion: "Notion is not read yet: it arrives with the OS read-only integration (decision CON-28)",
  },

  avisos: {
    lectura_tareas_notion: "The Notion Tasks could not be read.",
    lectura_correspondencia: "The «Correspondencia» register could not be read.",
  },

  origen: { plataforma: "Platform", notion: "Notion" },

  enObra: "Under construction · F3",

  acciones: {
    eyebrow: "Module · Acciones · hub 8 · Ejecución",
    titulo: "Acciones",
    texto:
      "What is pending today in one place: the tasks the platform computes (those of the Tablero de Ejecución) and the Notion Tasks. They meet on screen, never in the data: each figure says where it comes from and opens the screen where it is resolved.",
    obra:
      "The Notion Tasks arrive with the OS read-only integration (decision CON-28). Until then they say «No data»: it is not a zero, they are simply not read yet.",
    totalesTitulo: "What is pending, in four figures",
    totalPlataforma: "Open on the platform",
    totalNotion: "Open in Notion with a hub",
    totalEsperando: "Waiting for a reply (Notion)",
    totalSinHub: "In Notion without a hub",
    porHubTitulo: "By hub",
    porHubNota:
      "The platform's, counted by the hub of their entity (the same as on the Hacienda); Notion's, by their Área. A hub whose tasks the platform does not compute yet (no source yet) says «No data»; one that does compute them and is up to date says 0. Notion Tasks without an Área are in no row: they are counted apart, in «In Notion without a hub».",
    columnaHub: "Hub",
    columnaPlataformaAbiertas: "Platform · open",
    columnaPlataformaVencidas: "Platform · overdue",
    columnaNotionAbiertas: "Notion · open",
    columnaNotionVencidas: "Notion · overdue",
    columnaNotionEsperando: "Notion · waiting",
    nadaSale: "Nothing is ticked or closed here: each task is resolved on its own screen, by its own source.",
    marcoAria: "Tasks by hub",
  },

  estafeta: {
    eyebrow: "Module · Estafeta · hub 7 · Directorios",
    titulo: "Estafeta",
    texto:
      "The counter of the house's correspondence: whom we owe a reply, what we are waiting for from others and what is still to be sorted. There are only pointers here: the text of each message stays in its channel, and each letter is answered where it lives.",
    obra:
      "It reads the Notion register «Correspondencia» (pointers and obligations only) once the OS read-only integration exists (decision CON-28). Until then, everything says «No data».",
    bandejasTitulo: "The three trays",
    bandejasNota: "Each letter counts ONCE: first what is still to be sorted, then what is your turn, then what we are waiting for.",
    bandejas: {
      te_toca: "Your turn",
      esperando: "Waiting for others",
      revisar: "To review",
      en_curso: "In progress",
      cerrada: "Closed",
    },
    bandejaNotas: {
      te_toca: "Someone wrote to us and it is our turn to reply.",
      esperando: "We wrote and are waiting for a reply.",
      revisar: "No hub, no person, no owner or no reason: a person sorts it; it is never guessed.",
    },
    porHubTitulo: "By hub",
    porHubNota: "The letters in «Your turn» of each hub and the oldest one: what will raise the flag on its building's mailbox.",
    columnaHub: "Hub",
    columnaTeToca: "Your turn",
    columnaMasVieja: "The oldest",
    sinCartas: "None",
    libroTitulo: "The Libro, letters in and out",
    libroNota:
      "Newest first. «Sent» is shown only with the proof (the event number and the message number); without it, the letter says «To verify».",
    libroVacio: "The Libro has no letters.",
    columnaFecha: "Date",
    columnaCanal: "Channel",
    columnaDireccion: "Direction",
    columnaEstado: "Status",
    columnaBandeja: "Tray",
    sinHub: "No hub",
    nadaSale: "Nothing leaves from here: the Estafeta does not send, does not write drafts and does not read the text of any message.",
    canales: {
      gmail: "Gmail",
      instagram: "Instagram",
      youtube: "YouTube",
      whatsapp: "WhatsApp",
      line: "LINE",
      correo_plataforma: "Platform email",
      directorio: "Platform (Directorio)",
    },
    direcciones: { entra: "In", sale: "Out", accion: "Action" },
    estados: {
      revisar: "To review",
      te_toca: "Your turn",
      propuesta: "Proposed",
      borrador_listo: "Draft ready",
      por_comprobar: "To verify",
      en_camino: "On its way",
      enviado: "Sent",
      enviado_a_mano: "Sent by hand (unverified)",
      devuelta: "Returned",
      esperando_respuesta: "Waiting for a reply",
      cerrado: "Closed",
      no_escribir: "Do not write",
      retirado: "Withdrawn",
    },
  },

  contexto: {
    acciones: "CTCx OS · Acciones read",
    estafeta: "CTCx OS · Estafeta read",
    demo: "INVENTED DATA from the demo mode",
    sinDatos: "no data",
    sinIntegracion: "Notion is not read yet (decision CON-28)",
    plataforma: "platform",
    notion: "Notion",
    abiertas: "open",
    vencidas: "overdue",
    esperando: "waiting for a reply",
    sinHub: "without a hub",
  },
};
