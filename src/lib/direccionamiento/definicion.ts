// ── Definición de contexto · la estructura ──────────────────────────────────
// FUENTE ÚNICA de qué se pregunta y a quién. Módulo PURO y sin `server-only`:
// lo usa el componente de cliente y lo comprueba un guardián de QA sin levantar
// la consola, que está detrás de 2FA. Mismo patrón que `grados/definicion.ts`.
//
// QUÉ ES ESTO AHORA, Y QUÉ ERA ANTES (F7, plataforma V4.32). Hasta V4.31 esta
// pantalla era una herramienta de GUION DE VIDEO vendorizada: tres formatos
// (largo · corto plus · corto fast), derivables entre ellos, moodboard y
// referencias. El owner decidió el 2026-08-18 que Definición de contexto es
// otra cosa — **las tres preguntas que definen a cada unidad de negocio**, la
// estrella polar desde la que se redacta todo lo demás — y que la herramienta
// de guion vive aparte.
//
// ⚠️ El texto que se escribió bajo aquellos formatos NO se perdió: la migración
// `definicion_contexto_rework_lift_answers` levantó las respuestas de Producto
// y Contexto fuera de la rama «Video largo», y el respaldo completo de los 20
// campos originales está en `docs/archive/direccionamiento_context_2026-08-18.json`.

export type UnidadId = "ctcx" | "kr" | "chp" | "ecosistema";

export type Unidad = {
  id: UnidadId;
  code: string;
  name: string;
  role: string;
  color: string;
  tint: string;
  /** A quién le habla esta unidad. */
  quien: string;
  site?: string;
};

/**
 * Las CUATRO unidades. «Value Ecosystem» es la que estrena el rework (F7): son
 * las seis plataformas del ECP miradas como una sola unidad de negocio, que es
 * como el owner las presenta hacia fuera.
 */
export const UNIDADES: Unidad[] = [
  {
    id: "ctcx",
    code: "CTCX",
    name: "Colombian Trading Company",
    role: "La sombrilla · el ecosistema completo",
    color: "#4A1D96",
    tint: "#EFE9FA",
    quien: "Productores, tostadores, aliados y la red de servicios",
    site: "https://www.ctcexport.com",
  },
  {
    id: "kr",
    code: "KR",
    name: "Kaffetal Regal",
    role: "En Colombia · para el productor",
    color: "#1E4A2E",
    tint: "#E6EFE8",
    quien: "Caficultores colombianos, asociaciones y sus familias",
    site: "https://kaffetal-regal.ctcexport.com",
  },
  {
    id: "chp",
    code: "CHP",
    name: "Cherry Picked",
    role: "En Europa · para el tostador",
    color: "#8C2130",
    tint: "#F7E9EA",
    quien: "Tostadurías de especialidad y compradores europeos",
    site: "https://cherry-picked.ctcexport.com",
  },
  {
    id: "ecosistema",
    code: "VE",
    name: "Value Ecosystem",
    role: "Las seis plataformas del ecosistema de valor",
    color: "#0C447C",
    tint: "#E6F1FB",
    quien: "CTC Tech · Varietales · Directorio del Café · Coffeed · Herramientas · Terratalento",
  },
];

export type Campo = { id: string; label: string; help: string; ph: string };
export type Pregunta = { id: string; titulo: string; pregunta: string; campos: Campo[] };

/**
 * LAS TRES PREGUNTAS. Son la estrella polar del owner y el orden importa: qué
 * se ofrece, a quién, y en qué mundo ocurre.
 *
 * Los `id` de campo se conservan EXACTAMENTE como estaban antes del rework —
 * `promesa`, `cta`, `duele`, `compartir`… — para que las respuestas ya escritas
 * sigan encontrando su casilla. Renombrar uno aquí deja su texto huérfano en la
 * base sin que nada falle: la clave simplemente deja de casar y el campo sale
 * vacío. Si hay que renombrar, va con migración.
 */
export const PREGUNTAS: Pregunta[] = [
  {
    id: "producto",
    titulo: "Producto",
    pregunta: "¿Qué ofrece esta unidad, y qué promete?",
    campos: [
      { id: "objetivo", label: "Objetivo", help: "Qué tiene que lograr esta unidad.", ph: "Presentar CTC como un solo ecosistema…" },
      { id: "promesa", label: "Promesa", help: "La frase que el cliente debería poder repetir.", ph: "Lo que usted registra en su finca llega intacto hasta la taza…" },
      { id: "cta", label: "Llamado a la acción", help: "Qué se le pide hacer, en concreto.", ph: "Si cultiva, postúlese a Kaffetal Regal…" },
    ],
  },
  {
    id: "cliente",
    titulo: "Cliente",
    pregunta: "¿A quién le habla, y qué le pasa?",
    campos: [
      { id: "duele", label: "Qué le duele", help: "El problema con el que vive hoy.", ph: "Cada eslabón revalida desde cero lo que el anterior ya logró…" },
      { id: "quiere", label: "Qué quiere", help: "Lo que pediría si pudiera pedir.", ph: "Que su nombre llegue hasta la taza que se sirve en Europa" },
      { id: "necesita", label: "Qué necesita", help: "Lo que de verdad resuelve el problema, lo pida o no.", ph: "Una cadena de valor transparente y eficiente…" },
      { id: "puede", label: "Qué puede", help: "Sus condiciones reales: tiempo, conectividad, herramientas.", ph: "Entra desde el celular, con conectividad rural intermitente…" },
      { id: "relacion", label: "Cómo se relaciona", help: "Qué papel juega dentro del ecosistema.", ph: "Tres roles conviven en el mismo hilo…" },
    ],
  },
  {
    id: "contexto",
    titulo: "Contexto",
    pregunta: "¿En qué mundo ocurre, y qué se enseña de él?",
    campos: [
      { id: "resultados", label: "Resultados verificables", help: "Lo que se puede comprobar, no lo que se afirma.", ph: "La muestra entra a la Arena sin nombre y sale con puntaje SCA…" },
      { id: "compartir", label: "Qué se comparte", help: "Lo que se entrega antes de pedir nada a cambio.", ph: "Cada muestra recibe puntaje y feedback, gane o no gane" },
      { id: "ensenar", label: "Qué se enseña", help: "Lo que la audiencia debería entender al final.", ph: "Sabrá diferenciar qué pasa en KR y qué pasa en CP…" },
      { id: "identidad", label: "Identidad", help: "El tono visual y de marca de esta unidad.", ph: "Abierto por ahora" },
    ],
  },
];

/** Los tres campos globales: valen para todas las unidades. */
export const GENERALES: Campo[] = [
  { id: "momento", label: "Momento", help: "En qué punto está el negocio ahora mismo.", ph: "Kick off de la Primera Temporada…" },
  { id: "objetivo", label: "Objetivo general", help: "Qué persigue la casa en este momento.", ph: "Que CTC se dé a conocer en su primer debut…" },
  { id: "tono", label: "Tono", help: "Cómo se escribe. Se inyecta en cada redacción asistida.", ph: "Claro y conciso pero ilustrativo…" },
];

/** `unidad|pregunta|campo`, la forma que la base ya guarda. */
export function claveDe(unidad: UnidadId, pregunta: string, campo: string): string {
  return `${unidad}|${pregunta}|${campo}`;
}

export function claveGeneral(campo: string): string {
  return `general|${campo}`;
}

/** Cuántos campos de una unidad tienen texto — para la barra de avance. */
export function avanceDeUnidad(unidad: UnidadId, values: Record<string, string>): { hechos: number; total: number } {
  let hechos = 0;
  let total = 0;
  for (const p of PREGUNTAS) {
    for (const c of p.campos) {
      total++;
      if ((values[claveDe(unidad, p.id, c.id)] ?? "").trim()) hechos++;
    }
  }
  return { hechos, total };
}
