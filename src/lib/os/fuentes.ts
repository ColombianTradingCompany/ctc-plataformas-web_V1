import { CONSOLES, CONSOLE_ORDER, type PanelConsoleKey } from "@/lib/panel/consoles";
import { TEXTOS_ES } from "./textos/es";

// ── CTCx OS · de dónde sale cada cifra (V6.19, F2) · PURO ────────────────────
// La regla madre del OS (PLAN §2): el tablero NUNCA enseña una constante. Cada cifra
// que pinta es una «pieza», y cada pieza dice aquí de qué columna (o de qué función
// de la plataforma) sale y a qué pantalla real se va con «Abrir». El interruptor de
// procedencia del HUD lee ESTO; ningún componente escribe su propia fuente.
//
// Tres formas de fuente:
//   · `tabla.columna`            → una columna que existe (`qa-os-check` C1 la busca en
//                                  las migraciones y en los selects del código de fuera del OS);
//   · `archivo:<ruta>#<función>` → una función de la plataforma que el OS reusa tal cual
//                                  (C1 comprueba que el archivo existe y la exporta);
//   · `notion:<base>#<propiedad>` → (F3) una propiedad de una base de Notion que el OS LEERÁ con su
//                                  integración de solo lectura (decisión CON-28); C1 exige que la base
//                                  esté en `BASES_DE_NOTION_DEL_OS` (la lista de E-4) y que la pieza no
//                                  tenga enlace de consola (Notion no es una pantalla de la plataforma).
// `enlace` es la pantalla de la consola DUEÑA (C3: tiene página). `null` = no hay
// pantalla todavía; la pieza se enseña sin «Abrir».
//
// Las tareas NO llevan enlace propio por registro (crítica 13): el OS las reduce a
// conteos en el servidor y su único enlace es el de su pieza.

/** Las piezas del tablero de F2 (Inicio, Hacienda, Almacén, Taller): `armarTablero` las saca TODAS. */
export const PIEZAS_DEL_TABLERO = [
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

/** (F3) Las piezas del módulo Acciones que salen de Notion: `armarAcciones` las saca TODAS. */
export const PIEZAS_DE_ACCIONES = ["acciones_notion_abiertas", "acciones_notion_vencidas", "acciones_notion_esperando", "acciones_notion_sin_hub"] as const;

/** (F3) Las piezas del módulo Estafeta (el registro «Correspondencia» de Notion): `armarEstafeta` las saca TODAS. */
export const PIEZAS_DE_ESTAFETA = ["estafeta_te_toca", "estafeta_esperando", "estafeta_revisar", "estafeta_libro"] as const;

export const PIEZAS = [...PIEZAS_DEL_TABLERO, ...PIEZAS_DE_ACCIONES, ...PIEZAS_DE_ESTAFETA] as const;
export type PiezaId = (typeof PIEZAS)[number];

/**
 * (F3) Las bases de Notion que la integración de solo lectura del OS podrá leer (E-4, aceptada con la decisión CON-28:
 * Objetivos, Hitos, Tareas, Reuniones, Sesiones diarias, Proyectos Claude, Marcas y Correspondencia). Una fuente
 * `notion:` nombra una de éstas o `qa-os-check` falla. Nombres de base, nunca sus ids.
 */
export const BASES_DE_NOTION_DEL_OS = ["Objetivos", "Hitos", "Tareas", "Reuniones", "Sesiones diarias", "Proyectos Claude", "Marcas", "Correspondencia"] as const;

export type Fuente = {
  /** Cómo se llama la cifra en pantalla (el HUD, la Hacienda, el Almacén y el Taller la rotulan con ESTO). */
  etiqueta: string;
  /** La unidad que `Cifra` pone detrás del número. */
  unidad?: "kg";
  fuente: `${string}.${string}` | `archivo:${string}#${string}` | `notion:${string}#${string}`;
  /** El filtro que aplica la lectura, en palabras (sale en el panel de procedencia). */
  filtro?: string;
  enlace: string | null;
  /** La función reusada convierte una lectura fallida en cero (no lo dice): la cifra lleva la nota. */
  cuentaCeroSiFalla?: true;
  /** La función reusada devuelve «nada» tanto si no hay como si falló la lectura. */
  nuloSiFalla?: true;
};

const TAREAS = "archivo:src/lib/panel/tareasCarga.ts#cargarTareas" as const;
const P = TEXTOS_ES.piezas;
const F = TEXTOS_ES.filtros;
const FRANJA = "archivo:src/lib/stock/circuito.ts#cargarCircuitoDelStock" as const;

export const FUENTES: Record<PiezaId, Fuente> = {
  tareas_abiertas: { etiqueta: "Tareas abiertas", fuente: TAREAS, filtro: "casilla sin marcar en bcp_task_state", enlace: "/ecp", cuentaCeroSiFalla: true },
  tareas_vencidas: { etiqueta: "Tareas vencidas", fuente: TAREAS, filtro: "solo los despachos vencidos tienen fecha", enlace: "/ecp", cuentaCeroSiFalla: true },

  contratos_por_estado: { etiqueta: "Contratos", fuente: "purchase_contracts.status", enlace: "/ocp/contratos/lista" },
  ventanas_vigentes: { etiqueta: "Contratos con ventana vigente", fuente: "purchase_contracts.ventana_tipo", filtro: "contrato activo con ventana", enlace: "/ocp/contratos/lista" },
  despachos_pendientes: { etiqueta: "Despachos pendientes", fuente: "contract_despachos.estado", filtro: "pendiente, saco o adelanto, de un contrato activo", enlace: "/ocp/compras" },
  despachos_despachados: { etiqueta: "Despachos en camino", fuente: "contract_despachos.estado", filtro: "despachado, saco o adelanto, de un contrato activo", enlace: "/ocp/compras" },
  // La MISMA regla que el Tablero (crítica 6): saco o adelanto pendiente con el plazo (o su prórroga) vencido.
  despachos_vencidos: { etiqueta: "Despachos vencidos", fuente: "archivo:src/lib/stock/circuito.ts#pendientesDelCircuito", filtro: "saco o adelanto pendiente, plazo vencido", enlace: "/ocp/contratos/lista", cuentaCeroSiFalla: true },
  despachos_kg_por_recibir: { etiqueta: "Kilos por recibir", unidad: "kg", fuente: "contract_despachos.kg", filtro: "pendiente o despachado, saco o adelanto, de un contrato activo", enlace: "/ocp/compras" },

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
  cola_pendientes: { etiqueta: "Eventos en cola", fuente: "integration_events.estado", filtro: "pendiente; todos, no solo los últimos 30 del tablero de Automatizaciones", enlace: "/ecp/automatizaciones" },
  cola_fallidos: { etiqueta: "Eventos fallidos", fuente: "integration_events.estado", filtro: "fallido; todos, no solo los últimos 30 del tablero de Automatizaciones", enlace: "/ecp/automatizaciones" },
  automatizaciones_por_etapa: { etiqueta: "Automatizaciones", fuente: "automations.etapa", enlace: "/ecp/automatizaciones" },

  hechos_por_hub: { etiqueta: "Hechos del turno (24 h)", fuente: "archivo:src/lib/os/hechos.ts#leerHechos", filtro: "últimas 24 horas", enlace: null },
  lotes_por_etapa: { etiqueta: "Lotes", fuente: "lots.stage", enlace: "/ocp/kr" },

  // F3 · Acciones: las Tareas de Notion (la única fuente de tareas de la casa, D-003), por su Área (el hub).
  acciones_notion_abiertas: { etiqueta: P.acciones_notion_abiertas, fuente: "notion:Tareas#Estado", filtro: F.acciones_notion_abiertas, enlace: null },
  acciones_notion_vencidas: { etiqueta: P.acciones_notion_vencidas, fuente: "notion:Tareas#Vence", filtro: F.acciones_notion_vencidas, enlace: null },
  acciones_notion_esperando: { etiqueta: P.acciones_notion_esperando, fuente: "notion:Tareas#Estado", filtro: F.acciones_notion_esperando, enlace: null },
  acciones_notion_sin_hub: { etiqueta: P.acciones_notion_sin_hub, fuente: "notion:Tareas#Área", filtro: F.acciones_notion_sin_hub, enlace: null },
  // F3 · Estafeta: el registro «Correspondencia» (solo punteros y obligaciones, nunca el texto: CANALES §3.2).
  estafeta_te_toca: { etiqueta: P.estafeta_te_toca, fuente: "notion:Correspondencia#Estado", filtro: F.estafeta_te_toca, enlace: null },
  estafeta_esperando: { etiqueta: P.estafeta_esperando, fuente: "notion:Correspondencia#Estado", filtro: F.estafeta_esperando, enlace: null },
  estafeta_revisar: { etiqueta: P.estafeta_revisar, fuente: "notion:Correspondencia#Estado", filtro: F.estafeta_revisar, enlace: null },
  estafeta_libro: { etiqueta: P.estafeta_libro, fuente: "notion:Correspondencia#Fecha", filtro: F.estafeta_libro, enlace: null },
};

/** De dónde sale una pieza, en palabras: su origen («Plataforma» o «Notion») y la columna, la función o la propiedad. */
export function describirFuente(pieza: PiezaId): { origen: string; texto: string } {
  const f = FUENTES[pieza].fuente;
  if (f.startsWith("notion:")) {
    const [base, propiedad] = f.slice("notion:".length).split("#");
    return { origen: TEXTOS_ES.origen.notion, texto: `«${base}» · ${propiedad}` };
  }
  if (f.startsWith("archivo:")) {
    const [ruta, fn] = f.slice("archivo:".length).split("#");
    return { origen: TEXTOS_ES.origen.plataforma, texto: `${fn}() en ${ruta}` };
  }
  return { origen: TEXTOS_ES.origen.plataforma, texto: f };
}

// ── Lo que devuelve un lector ────────────────────────────────────────────────

export type CodigoDeLectura =
  | "lectura_tareas"
  | "lectura_tratos"
  | "lectura_stock"
  | "lectura_pvc"
  | "lectura_salud"
  | "lectura_hechos"
  | "lectura_lotes"
  | "lectura_tareas_notion"
  | "lectura_correspondencia"
  | "lectura_fallida";

/** Un lector nunca lanza: o trae su valor, o dice qué falló y de qué piezas. */
export type Lectura<T> =
  | { ok: true; valor: T; fuentes: readonly PiezaId[]; truncado?: boolean }
  | { ok: false; error: CodigoDeLectura; fuentes: readonly PiezaId[] };

/**
 * (F3) Lo que devuelven los lectores de Notion mientras la integración de solo lectura del OS no exista (decisión CON-28):
 * no es una lectura fallida (no deja aviso) ni un cero. Las piezas salen en «Sin datos» con la nota `sin_integracion_notion`.
 */
export const SIN_INTEGRACION_NOTION = { sinIntegracion: true } as const;
export type SinIntegracionNotion = typeof SIN_INTEGRACION_NOTION;
export type LecturaDeNotion<T> = Lectura<T> | SinIntegracionNotion;

export function esSinIntegracionNotion<T>(x: LecturaDeNotion<T>): x is SinIntegracionNotion {
  return "sinIntegracion" in x && x.sinIntegracion === true;
}

/** Por qué una cifra puede no ser exacta: sale en el panel de procedencia, junto a su fuente. */
export type NotaDeMedida =
  | "cuenta_cero_si_falla" // la función reusada cuenta cero cuando una lectura falla
  | "tope_de_filas" // la lectura llegó al tope de filas: la cifra es un mínimo
  | "sin_fuente_aun" // este hub no tiene esta pieza en la plataforma (llega con Notion, F3)
  | "solo_owner" // una pieza del Modelo Económico y quien mira no es el owner: no se leyó, se pinta «Solo el owner»
  | "sin_el_pvc" // la cuenta deja fuera las tareas y los hechos del Modelo Económico (quien mira no es el owner)
  | "sin_integracion_notion"; // (F3) la pieza sale de Notion y su integración de solo lectura todavía no existe (decisión CON-28)

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
