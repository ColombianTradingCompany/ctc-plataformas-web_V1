import { DOMINIOS, type Dominio } from "@/lib/integraciones/dominios";
import { PIEZAS_DE_ESTAFETA, esSinIntegracionNotion, type LecturaDeNotion, type Medida, type NotaDeMedida, type PiezaId } from "./fuentes";
import type { Aviso } from "./tablero";
import { textosDelOs } from "./textos/idioma";

// ── CTCx OS · el módulo Estafeta (F3, F-27 de la consolidación) · PURO ───────
// El mostrador de la correspondencia de la casa, en el edificio 7 · Directorios (CANALES §4.1–§4.2).
// SOLO LECTURA sobre el registro «Correspondencia» de Notion: una fila por mensaje o por acción, con
// punteros y obligaciones, nunca el texto, el asunto, la dirección, el teléfono ni el usuario (D-013,
// CANALES §3.2). Aquí ni siquiera llegan los ids: una carta es lo que la Estafeta necesita para contar y
// para pintar el Libro (fecha, canal, dirección, estado, hub y si tiene sus llaves), y nada más.
//
// Las reglas que se cumplen aquí, probadas con datos inventados (`qa-os-check` F3):
//   · Cada carta cuenta UNA vez (paridad de F-27): `bandejaDe` la pone en una sola bandeja. Primero lo
//     cerrado; después «Por revisar» (estado Revisar, o sin hub, sin persona, sin responsable o sin
//     motivo: «Sin Responsable o sin motivo, la fila cuenta en Revisar, igual que sin Persona», CANALES
//     §3.2); después «Te toca»; después «Esperando a otros»; el resto, «En curso».
//   · «Enviado» solo con la prueba (CANALES §3.2): sin el número del evento y el del mensaje, la carta se
//     pinta «Por comprobar» (`estadoVisible`).
//   · Sin la integración de solo lectura del OS (decisión CON-28) todo sale en «Sin datos» con la nota
//     `sin_integracion_notion`, nunca un cero; con el registro leído, un hub sin cartas es un cero de verdad.
//
// No envía, no escribe borradores, no lee el texto de ningún mensaje: la Estafeta no tiene botones salvo
// «Copiar contexto para Tailor». Los buzones con bandera en cada edificio, las cartas en la ficha del
// Personaje, el HUD de correo, los consejos y el recorrido van detrás de F4 (PLAN F3, CANALES §6 Paso 3).

export const CANALES = ["gmail", "instagram", "youtube", "whatsapp", "line", "correo_plataforma", "directorio"] as const;
export type Canal = (typeof CANALES)[number];

export const DIRECCIONES = ["entra", "sale", "accion"] as const;
export type Direccion = (typeof DIRECCIONES)[number];

/** Los estados del registro (CANALES §3.2), en su orden. Las personas solo ponen «Cerrado», «No escribir» y «Retirado». */
export const ESTADOS_DE_CARTA = [
  "revisar",
  "te_toca",
  "propuesta",
  "borrador_listo",
  "por_comprobar",
  "en_camino",
  "enviado",
  "enviado_a_mano",
  "devuelta",
  "esperando_respuesta",
  "cerrado",
  "no_escribir",
  "retirado",
] as const;
export type EstadoDeCarta = (typeof ESTADOS_DE_CARTA)[number];

const CERRADOS: ReadonlySet<EstadoDeCarta> = new Set<EstadoDeCarta>(["cerrado", "no_escribir", "retirado"]);

export const BANDEJAS = ["revisar", "te_toca", "esperando", "en_curso", "cerrada"] as const;
export type Bandeja = (typeof BANDEJAS)[number];

/** Una fila de «Correspondencia», reducida a lo que la Estafeta cuenta y pinta. Sin ids, sin texto, sin direcciones. */
export type Carta = {
  /** La hora del mensaje en su canal (ISO 8601, con `Z` o con desfase: se compara por su instante, nunca como texto). */
  fecha: string;
  canal: Canal;
  direccion: Direccion;
  estado: EstadoDeCarta;
  /** Su Área (el hub); `null` = sin estampilla. */
  hub: Dominio | null;
  conPersona: boolean;
  conResponsable: boolean;
  /** Su motivo: un Objetivo, con su Hito, Reunión o Tarea (la regla madre). */
  conMotivo: boolean;
  /** La prueba de «Enviado»: el número del evento de la plataforma y el del mensaje en su canal. */
  conEvento: boolean;
  conMensaje: boolean;
  /** Desde cuándo esperamos respuesta (ISO), si la esperamos. */
  esperandoDesde: string | null;
};

/** El estado que se PINTA: «Enviado» solo con su prueba; sin ella, «Por comprobar». */
export function estadoVisible(c: Carta): EstadoDeCarta {
  if (c.estado === "enviado" && !(c.conEvento && c.conMensaje)) return "por_comprobar";
  return c.estado;
}

/** El instante de una fecha ISO en milisegundos (una fecha ilegible cuenta como la más vieja). Dos fechas
 *  con distinto desfase horario se ordenan por su instante, no por su texto. */
export function instanteDe(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

/** Lo más nuevo primero, por el instante de su fecha. */
function masNuevaPrimero(a: Carta, b: Carta): number {
  const d = instanteDe(b.fecha) - instanteDe(a.fecha);
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** La ÚNICA bandeja de una carta (una obligación cuenta una vez). */
export function bandejaDe(c: Carta): Bandeja {
  if (CERRADOS.has(c.estado)) return "cerrada";
  if (c.estado === "revisar" || c.hub === null || !c.conPersona || !c.conResponsable || !c.conMotivo) return "revisar";
  if (c.estado === "te_toca") return "te_toca";
  if (c.estado === "esperando_respuesta") return "esperando";
  return "en_curso";
}

export type CartaDelLibro = Carta & { visible: EstadoDeCarta; bandeja: Bandeja };

export type BuzonDeHub = { dominio: Dominio; n: string; label: string; teToca: Medida; masVieja: string | null };

export type Estafeta = {
  leidoAt: string;
  /** `sin_integracion`: Notion aún no se lee (CON-28); `leida` o `fallida`: lo que dijo su lector. */
  notion: "sin_integracion" | "leida" | "fallida";
  bandejas: { teToca: Medida; esperando: Medida; revisar: Medida };
  porHub: readonly BuzonDeHub[];
  /** `cartas: null` = sin lectura («Sin datos»). Lo más nuevo arriba, como mucho `CARTAS_EN_EL_LIBRO`. */
  libro: { total: Medida; cartas: readonly CartaDelLibro[] | null };
  avisos: readonly Aviso[];
};

/** Cuántas cartas enseña el Libro en la pantalla (el resto sigue en Notion). */
export const CARTAS_EN_EL_LIBRO = 50;

/** Arma el módulo. Puro y total: cada pieza de `PIEZAS_DE_ESTAFETA` sale al menos una vez. */
export function armarEstafeta(lectura: LecturaDeNotion<readonly Carta[]>, leidoAt: string): Estafeta {
  const sinIntegracion = esSinIntegracionNotion(lectura);
  const cartas = !sinIntegracion && lectura.ok ? lectura.valor : null;
  const truncado = !sinIntegracion && lectura.ok && !!lectura.truncado;
  const notas: NotaDeMedida[] = [...(sinIntegracion ? (["sin_integracion_notion"] as const) : []), ...(truncado ? (["tope_de_filas"] as const) : [])];
  const medida = (pieza: PiezaId, valor: number | null, clave?: string): Medida => ({
    valor,
    pieza,
    leidoAt,
    ...(clave !== undefined ? { clave } : {}),
    ...(notas.length ? { notas } : {}),
  });

  const libro: CartaDelLibro[] | null = cartas
    ? cartas.map((c) => ({ ...c, visible: estadoVisible(c), bandeja: bandejaDe(c) })).sort(masNuevaPrimero)
    : null;
  const cuantas = (b: Bandeja) => (libro ? libro.filter((c) => c.bandeja === b).length : null);

  const porHub: BuzonDeHub[] = DOMINIOS.map((d) => {
    const suyas = libro ? libro.filter((c) => c.bandeja === "te_toca" && c.hub === d.id) : null;
    const masVieja = suyas && suyas.length ? suyas.reduce((m, c) => (instanteDe(c.fecha) < instanteDe(m) ? c.fecha : m), suyas[0].fecha) : null;
    return { dominio: d.id, n: d.n, label: d.label, teToca: medida("estafeta_te_toca", suyas ? suyas.length : null, d.id), masVieja };
  });

  const aviso: Aviso[] = !sinIntegracion && !lectura.ok ? [{ error: lectura.error, fuentes: lectura.fuentes }] : [];

  return {
    leidoAt,
    notion: sinIntegracion ? "sin_integracion" : lectura.ok ? "leida" : "fallida",
    bandejas: {
      teToca: medida("estafeta_te_toca", cuantas("te_toca")),
      esperando: medida("estafeta_esperando", cuantas("esperando")),
      revisar: medida("estafeta_revisar", cuantas("revisar")),
    },
    porHub,
    libro: { total: medida("estafeta_libro", libro ? libro.length : null), cartas: libro ? libro.slice(0, CARTAS_EN_EL_LIBRO) : null },
    avisos: aviso,
  };
}

/** Las piezas de la Estafeta que el módulo NO saca (debe ser vacío: sin entradas muertas en FUENTES). */
export function piezasMuertasDeLaEstafeta(e: Estafeta): PiezaId[] {
  const usadas = new Set<PiezaId>([...Object.values(e.bandejas), ...e.porHub.map((b) => b.teToca), e.libro.total].map((m) => m.pieza));
  return PIEZAS_DE_ESTAFETA.filter((p) => !usadas.has(p));
}

/** «Copiar contexto para Tailor» de la Estafeta: SOLO conteos por bandeja y por hub (ni personas, ni canales concretos, ni texto). */
export function contextoDeLaEstafeta(e: Estafeta): string {
  const t = textosDelOs();
  const c = t.contexto;
  const n = (m: Medida) => (m.valor === null ? (m.notas?.includes("sin_integracion_notion") ? c.sinIntegracion : c.sinDatos) : String(m.valor));
  const demo = !!e.bandejas.teToca.demo;
  const lineas = [`${c.estafeta} ${e.leidoAt}${demo ? ` · ${c.demo}` : ""}`];
  const b = t.estafeta.bandejas;
  lineas.push(`${b.te_toca}: ${n(e.bandejas.teToca)} · ${b.esperando}: ${n(e.bandejas.esperando)} · ${b.revisar}: ${n(e.bandejas.revisar)}.`);
  for (const h of e.porHub) lineas.push(`${h.n} · ${h.label}: ${b.te_toca.toLowerCase()} ${n(h.teToca)}${h.masVieja ? ` (${h.masVieja})` : ""}.`);
  return lineas.join("\n");
}
