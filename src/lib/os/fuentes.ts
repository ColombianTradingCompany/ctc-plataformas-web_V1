import { CONSOLES, CONSOLE_ORDER, type PanelConsoleKey } from "@/lib/panel/consoles";

// ── CTCx OS · de dónde sale cada cifra (V6.19, F2) · PURO ────────────────────
// La regla madre del OS (PLAN §2): el tablero NUNCA enseña una constante. Cada cifra
// que pinta es una «pieza», y cada pieza dice aquí de qué columna (o de qué función
// de la plataforma) sale y a qué pantalla real se va con «Abrir». El interruptor de
// procedencia del HUD lee ESTO; ningún componente escribe su propia fuente.
//
// Dos formas de fuente:
//   · `tabla.columna`            → una columna que existe (`qa-os-check` C1 la busca en
//                                  las migraciones y en los selects del código de fuera del OS);
//   · `archivo:<ruta>#<función>` → una función de la plataforma que el OS reusa tal cual
//                                  (C1 comprueba que el archivo existe y la exporta).
// `enlace` es la pantalla de la consola DUEÑA (C3: tiene página). `null` = no hay
// pantalla todavía; la pieza se enseña sin «Abrir».
//
// Las tareas NO llevan enlace propio por registro (crítica 13): el OS las reduce a
// conteos en el servidor y su único enlace es el de su pieza.

export const PIEZAS = [
  // Tareas calculadas de la casa (las del Tablero de Ejecución), contadas por hub
  "tareas_abiertas",
  "tareas_vencidas",
  // Tratos: contratos y despachos
  "contratos_por_estado",
  "ventanas_vigentes",
  "despachos_pendientes",
  "despachos_despachados",
  "despachos_vencidos",
  "despachos_kg_por_recibir",
  // La franja del circuito del stock (la misma que pintan Adquisición, Stock y Triage)
  "franja_por_recibir",
  "franja_en_stock",
  "franja_por_declarar",
  "franja_en_catalogo",
  "franja_vendido",
  // El Modelo Económico (sin precios: código, vigencia y lo que espera al owner)
  "pvc_vigente",
  "pvc_proxima",
  "pvc_correcciones",
  "pvc_borrador",
  // Salud del sistema
  "salud_crons",
  "cola_pendientes",
  "cola_fallidos",
  "automatizaciones_por_etapa",
  // Los hechos del turno y los lotes
  "hechos_por_hub",
  "lotes_por_etapa",
] as const;
export type PiezaId = (typeof PIEZAS)[number];

export type Fuente = {
  /** Cómo se llama la cifra en pantalla (el HUD, la Hacienda, el Almacén y el Taller la rotulan con ESTO). */
  etiqueta: string;
  /** La unidad que `Cifra` pone detrás del número. */
  unidad?: "kg";
  fuente: `${string}.${string}` | `archivo:${string}#${string}`;
  /** El filtro que aplica la lectura, en palabras (sale en el panel de procedencia). */
  filtro?: string;
  enlace: string | null;
  /** La función reusada convierte una lectura fallida en cero (no lo dice): la cifra lleva la nota. */
  cuentaCeroSiFalla?: true;
  /** La función reusada devuelve «nada» tanto si no hay como si falló la lectura. */
  nuloSiFalla?: true;
};

const TAREAS = "archivo:src/lib/panel/tareasCarga.ts#cargarTareas" as const;
const FRANJA = "archivo:src/lib/stock/circuito.ts#cargarCircuitoDelStock" as const;

export const FUENTES: Record<PiezaId, Fuente> = {
  tareas_abiertas: { etiqueta: "Tareas abiertas", fuente: TAREAS, filtro: "casilla sin marcar en bcp_task_state", enlace: "/ecp", cuentaCeroSiFalla: true },
  tareas_vencidas: { etiqueta: "Tareas vencidas", fuente: TAREAS, filtro: "solo los despachos vencidos tienen fecha", enlace: "/ecp", cuentaCeroSiFalla: true },

  contratos_por_estado: { etiqueta: "Contratos", fuente: "purchase_contracts.status", enlace: "/ocp/contratos/lista" },
  ventanas_vigentes: { etiqueta: "Contratos con ventana vigente", fuente: "purchase_contracts.ventana_tipo", filtro: "contrato activo con ventana", enlace: "/ocp/contratos/lista" },
  despachos_pendientes: { etiqueta: "Despachos pendientes", fuente: "contract_despachos.estado", filtro: "pendiente, de un contrato activo", enlace: "/ocp/compras" },
  despachos_despachados: { etiqueta: "Despachos en camino", fuente: "contract_despachos.estado", filtro: "despachado, de un contrato activo", enlace: "/ocp/compras" },
  // La MISMA regla que el Tablero (crítica 6): saco o adelanto pendiente con el plazo (o su prórroga) vencido.
  despachos_vencidos: { etiqueta: "Despachos vencidos", fuente: "archivo:src/lib/stock/circuito.ts#pendientesDelCircuito", filtro: "saco o adelanto pendiente, plazo vencido", enlace: "/ocp/contratos/lista", cuentaCeroSiFalla: true },
  despachos_kg_por_recibir: { etiqueta: "Kilos por recibir", unidad: "kg", fuente: "contract_despachos.kg", filtro: "pendiente o despachado, de un contrato activo", enlace: "/ocp/compras" },

  franja_por_recibir: { etiqueta: "Franja · por recibir", unidad: "kg", fuente: FRANJA, enlace: "/ocp/compras", cuentaCeroSiFalla: true },
  franja_en_stock: { etiqueta: "Franja · en stock", unidad: "kg", fuente: FRANJA, enlace: "/ocp/stock", cuentaCeroSiFalla: true },
  franja_por_declarar: { etiqueta: "Franja · por declarar", unidad: "kg", fuente: FRANJA, enlace: "/ocp/contratos", cuentaCeroSiFalla: true },
  franja_en_catalogo: { etiqueta: "Franja · en catálogo", unidad: "kg", fuente: FRANJA, enlace: "/ocp/catalogo", cuentaCeroSiFalla: true },
  franja_vendido: { etiqueta: "Franja · vendido", unidad: "kg", fuente: FRANJA, enlace: "/ocp/catalogo", cuentaCeroSiFalla: true },

  pvc_vigente: { etiqueta: "Edición vigente del Modelo Económico", fuente: "archivo:src/lib/pvc/servicio.ts#edicionVigente", filtro: "publicada o corregida, vigente hoy", enlace: "/ecp/pvc", nuloSiFalla: true },
  pvc_proxima: { etiqueta: "Edición siguiente", fuente: "archivo:src/lib/pvc/servicio.ts#edicionProxima", enlace: "/ecp/pvc", nuloSiFalla: true },
  pvc_correcciones: { etiqueta: "Correcciones por revisar", fuente: "pvc_correcciones.estado", filtro: "propuesta", enlace: "/ecp/pvc" },
  pvc_borrador: { etiqueta: "Borrador del agente por publicar", fuente: "archivo:src/lib/pvc/agente.ts#estadoDelAgente", filtro: "borrador del agente sin publicar", enlace: "/ecp/pvc" },

  salud_crons: { etiqueta: "Salud de los crons", fuente: "latidos.estado", filtro: "último latido terminado de cada cron", enlace: "/ecp/automatizaciones" },
  cola_pendientes: { etiqueta: "Eventos en cola", fuente: "integration_events.estado", filtro: "pendiente", enlace: "/ecp/automatizaciones" },
  cola_fallidos: { etiqueta: "Eventos fallidos", fuente: "integration_events.estado", filtro: "fallido", enlace: "/ecp/automatizaciones" },
  automatizaciones_por_etapa: { etiqueta: "Automatizaciones", fuente: "automations.etapa", enlace: "/ecp/automatizaciones" },

  hechos_por_hub: { etiqueta: "Hechos del turno (24 h)", fuente: "archivo:src/lib/os/hechos.ts#leerHechos", filtro: "últimas 24 horas", enlace: null },
  lotes_por_etapa: { etiqueta: "Lotes", fuente: "lots.stage", enlace: "/ocp/kr" },
};

// ── Lo que devuelve un lector ────────────────────────────────────────────────

export type CodigoDeLectura =
  | "lectura_tareas"
  | "lectura_tratos"
  | "lectura_stock"
  | "lectura_pvc"
  | "lectura_salud"
  | "lectura_hechos"
  | "lectura_lotes"
  | "lectura_fallida";

/** Un lector nunca lanza: o trae su valor, o dice qué falló y de qué piezas. */
export type Lectura<T> =
  | { ok: true; valor: T; fuentes: readonly PiezaId[]; truncado?: boolean }
  | { ok: false; error: CodigoDeLectura; fuentes: readonly PiezaId[] };

/** Por qué una cifra puede no ser exacta: sale en el panel de procedencia, junto a su fuente. */
export type NotaDeMedida =
  | "cuenta_cero_si_falla" // la función reusada cuenta cero cuando una lectura falla
  | "tope_de_filas" // la lectura llegó al tope de filas: la cifra es un mínimo
  | "sin_fuente_aun"; // este hub no tiene esta pieza en la plataforma (llega con Notion, F3)

/** Una cifra del tablero. `valor: null` se pinta «Sin datos», NUNCA cero. */
export type Medida = {
  valor: number | null;
  pieza: PiezaId;
  /** Para las piezas desglosadas (un estado de contrato, una etapa de lote). */
  clave?: string;
  leidoAt: string;
  demo?: true;
  notas?: readonly NotaDeMedida[];
};

/** Un texto leído (el código de la edición vigente): `null` = «Sin datos». */
export type Rotulo = {
  texto: string | null;
  pieza: PiezaId;
  leidoAt: string;
  demo?: true;
  notas?: readonly NotaDeMedida[];
};

// ── «Abrir»: la misma regla que el rail (crítica 12) ─────────────────────────

/** La consola de un enlace (`/ocp/stock` → `ocp`), o null si no es de una consola. */
export function consolaDelEnlace(enlace: string): PanelConsoleKey | null {
  const k = enlace.split(/[/?#]/)[1] as PanelConsoleKey;
  return CONSOLE_ORDER.includes(k) ? k : null;
}

/**
 * El enlace que puede ver quien mira, o null. Copia la regla del rail (`PanelSidebar`): hace falta tener la
 * consola, y si el enlace del rail que lo cubre (o su grupo) es `ownerOnly`, solo lo ve el owner. Así «Abrir»
 * nunca lleva a alguien a una pantalla que su rail le esconde.
 */
export function enlaceVisible(
  enlace: string | null,
  quien: { consoles: readonly PanelConsoleKey[]; isOwner: boolean }
): string | null {
  if (!enlace) return null;
  const k = consolaDelEnlace(enlace);
  if (!k || !quien.consoles.includes(k)) return null;
  const ruta = enlace.split(/[?#]/)[0];
  let mejor: { largo: number; soloOwner: boolean } | null = null;
  for (const g of CONSOLES[k].nav) {
    for (const l of g.links) {
      if (ruta !== l.href && !ruta.startsWith(`${l.href}/`)) continue;
      if (!mejor || l.href.length > mejor.largo) mejor = { largo: l.href.length, soloOwner: !!(g.ownerOnly || l.ownerOnly) };
    }
  }
  if (mejor?.soloOwner && !quien.isOwner) return null;
  return enlace;
}
