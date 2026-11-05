import { ACCIONES, ENTIDADES } from "./hechosCatalogo";
import { FUENTES, PIEZAS, type CodigoDeLectura, type Lectura, type Medida, type NotaDeMedida, type PiezaId, type Rotulo } from "./fuentes";
import { DOMINIOS, ETAPAS, type Dominio, type Etapa } from "@/lib/integraciones/dominios";
import { TIPOS_DE_TAREA, tipoDeLaTarea, type TareaDeConsola, type TipoDeTarea } from "@/lib/panel/tareas";
import type { Salud } from "@/lib/integraciones/registroCrons";
import type { DatosDeLaFranja } from "@/lib/stock/franja";

// ── CTCx OS · el tablero (V6.19, F2) · PURO ──────────────────────────────────
// Convierte lo que traen los lectores (`lectura.ts`, solo servidor) en el tablero que
// pintan Inicio, la Hacienda, el Almacén y el Taller. Es puro para que `qa-os-check`
// lo pruebe sin base, con datos inventados.
//
// Las tres reglas que aquí se cumplen:
//   1. Dónde va cada cosa NO se escribe a mano: el hub de una tarea o de una pieza se
//      DEDUCE del catálogo de los hechos (`hechosCatalogo.ts`, ENTIDADES y ACCIONES).
//      Así la humedad cae en 1 · Origen y el despacho en 2 · Operación y Logística,
//      igual que sus hechos.
//   2. Una lectura que falla deja sus piezas en `null` («Sin datos») y un aviso con su
//      fuente; nunca un cero.
//   3. Las tareas llegan reducidas a CONTEOS (crítica 13): ni su texto, ni su clave, ni
//      su enlace por registro salen del servidor. El enlace es el de su pieza en FUENTES.
//
// ⚠️ PVC: el catálogo lo pone en 3 · Comercial (`pvc_edition`, `pvc_correccion`) y el
// registro de crons en 0 · Dirección. Decisión ABIERTA del owner (charter ctcx-os); hasta
// entonces manda el catálogo, sin armonizar en silencio.

// ── Tareas → hub ─────────────────────────────────────────────────────────────

/** La entidad del catálogo de hechos que describe cada tipo de tarea. */
export const ENTIDAD_DE_TAREA: Record<TipoDeTarea, string> = {
  lead: "lead",
  finca: "finca",
  comm: "producer",
  humidity: "purchase_contract", // la humedad se mide en la entrega del trato
  lot: "lot",
  muestra: "muestra",
  pvc: "pvc_correccion", // ⚠️ decisión abierta 0 · Dirección vs 3 · Comercial (ver arriba)
  despacho: "purchase_contract",
  partida: "stock_partida",
};

/** Cuando la ACCIÓN del catálogo lleva su propio hub (el despacho es Operación aunque su entidad sea el contrato). */
const ACCION_DE_TAREA: Partial<Record<TipoDeTarea, string>> = {
  despacho: "purchase_contract.despacho_registrado",
};

export function hubDeTipo(tipo: TipoDeTarea): Dominio | null {
  const accion = ACCION_DE_TAREA[tipo];
  if (accion) return ACCIONES[accion]?.dominio ?? null;
  return ENTIDADES[ENTIDAD_DE_TAREA[tipo]]?.dominio ?? null;
}

/** El hub de una tarea por su clave (`<tipo>:<id>`), o null si el tipo no existe. */
export function hubDeTarea(key: string): Dominio | null {
  const tipo = tipoDeLaTarea(key);
  return tipo ? hubDeTipo(tipo) : null;
}

/** Vencida = con fecha y pasada. Hoy solo el despacho tiene fecha (`despacho:vencido:<id>`). */
export function esTareaVencida(key: string): boolean {
  return key.startsWith("despacho:vencido:");
}

export type ConteoDeHub = { abiertas: number; vencidas: number; hechas: number };
export type ConteoDeTareas = { porHub: Record<Dominio, ConteoDeHub>; sinHub: number };

const porDominio = <T>(f: (d: Dominio) => T): Record<Dominio, T> =>
  Object.fromEntries(DOMINIOS.map((d) => [d.id, f(d.id)])) as Record<Dominio, T>;

/** Cuenta por hub. Lee SOLO la clave y la casilla: el texto de la tarea (nombres, notas) no se toca. */
export function tareasPorHub(tareas: readonly Pick<TareaDeConsola, "key" | "state">[]): ConteoDeTareas {
  const porHub = porDominio<ConteoDeHub>(() => ({ abiertas: 0, vencidas: 0, hechas: 0 }));
  let sinHub = 0;
  for (const t of tareas) {
    const hub = hubDeTarea(t.key);
    if (!hub) {
      sinHub++;
      continue;
    }
    if (t.state === "done") porHub[hub].hechas++;
    else {
      porHub[hub].abiertas++;
      if (esTareaVencida(t.key)) porHub[hub].vencidas++;
    }
  }
  return { porHub, sinHub };
}

/** Los hubs que PUEDEN tener tareas de la plataforma; en los demás la cifra es «Sin datos» (llegan con Notion). */
export function hubsConTareas(): Set<Dominio> {
  return new Set(TIPOS_DE_TAREA.map(hubDeTipo).filter((d): d is Dominio => d !== null));
}

// ── Salud ────────────────────────────────────────────────────────────────────

const ORDEN_DE_SALUD: readonly Salud[] = ["fallo", "atrasada", "parcial", "sin_corrida", "ok"];

/** La peor salud de una lista (fallo > atrasada > parcial > sin corrida > al día), o null si está vacía. */
export function peorSalud(s: readonly Salud[]): Salud | null {
  for (const x of ORDEN_DE_SALUD) if (s.includes(x)) return x;
  return null;
}

// ── Piezas → hub ─────────────────────────────────────────────────────────────

/** Las piezas que viven en UN hub, por la entidad (o la acción) del catálogo que las describe. */
const ENTIDAD_DE_PIEZA: Partial<Record<PiezaId, { entidad: string } | { accion: string }>> = {
  contratos_por_estado: { entidad: "purchase_contract" },
  ventanas_vigentes: { entidad: "purchase_contract" },
  despachos_pendientes: { accion: "purchase_contract.despacho_registrado" },
  despachos_despachados: { accion: "purchase_contract.despacho_registrado" },
  despachos_vencidos: { accion: "purchase_contract.despacho_registrado" },
  despachos_kg_por_recibir: { accion: "purchase_contract.despacho_registrado" },
  franja_por_recibir: { entidad: "compra" },
  franja_en_stock: { entidad: "stock_partida" },
  franja_por_declarar: { entidad: "catalogo_fuente" },
  franja_en_catalogo: { entidad: "catalogo_fuente" },
  franja_vendido: { entidad: "lot_listing" },
  pvc_vigente: { entidad: "pvc_edition" },
  pvc_proxima: { entidad: "pvc_edition" },
  pvc_correcciones: { entidad: "pvc_correccion" },
  pvc_borrador: { entidad: "pvc_edition" },
  lotes_por_etapa: { entidad: "lot" },
};

/** Las piezas que se reparten por hub (cada fila trae su hub). */
export const PIEZAS_POR_HUB: readonly PiezaId[] = [
  "tareas_abiertas",
  "tareas_vencidas",
  "salud_crons",
  "cola_pendientes",
  "cola_fallidos",
  "automatizaciones_por_etapa",
  "hechos_por_hub",
];

/** El hub de una pieza de un solo hub; null si la pieza se reparte por hub (o el catálogo no la conoce). */
export function hubDePieza(p: PiezaId): Dominio | null {
  const e = ENTIDAD_DE_PIEZA[p];
  if (!e) return null;
  if ("accion" in e) return ACCIONES[e.accion]?.dominio ?? null;
  return ENTIDADES[e.entidad]?.dominio ?? null;
}

// ── Lo que traen los lectores ────────────────────────────────────────────────

export type Tratos = {
  contratosPorEstado: Partial<Record<string, number>>;
  ventanasVigentes: number;
  despachos: { pendientes: number; despachados: number; vencidos: number; kgPorRecibir: number };
};

export type EstadoDelPvc = {
  vigente: { codigo: string } | null;
  proxima: { codigo: string } | null;
  correccionesPropuestas: number;
  borradorPorPublicar: boolean;
};

export type SaludDelSistema = {
  crons: readonly CronConSalud[];
  automatizaciones: Partial<Record<Dominio, Partial<Record<Etapa, number>>>>;
  cola: Partial<Record<Dominio, { pendientes: number; fallidos: number }>>;
};

export type LecturasDelTablero = {
  leidoAt: string;
  tareas: Lectura<ConteoDeTareas>;
  tratos: Lectura<Tratos>;
  stock: Lectura<DatosDeLaFranja>;
  pvc: Lectura<EstadoDelPvc>;
  salud: Lectura<SaludDelSistema>;
  hechos: Lectura<Partial<Record<Dominio, number>>>;
  lotes: Lectura<Partial<Record<string, number>>>;
};

// ── Lo que pintan las vistas ─────────────────────────────────────────────────

export type Aviso = { error: CodigoDeLectura; fuentes: readonly PiezaId[] };

/** La salud se pinta con su PALABRA (`SALUD_LABEL`), no como cifra; igual lleva su pieza y su fuente. */
export type EstadoDeSalud = { pieza: "salud_crons"; valor: Salud | null; leidoAt: string };
export type CronConSalud = { clave: string; dominio: Dominio; salud: Salud };

export type Edificio = {
  dominio: Dominio;
  n: string;
  label: string;
  abiertas: Medida;
  vencidas: Medida;
  hechos: Medida;
  cola: { pendientes: Medida; fallidos: Medida };
  /** La peor salud de los crons de este hub; `valor: null` = sin crons en este hub o sin lectura. */
  salud: EstadoDeSalud;
  /** Las piezas de un solo hub que caen aquí (contratos, despachos, franja, PVC, lotes). */
  piezas: readonly (Medida | Rotulo)[];
};

export type Tablero = {
  leidoAt: string;
  edificios: Record<Dominio, Edificio>;
  almacen: {
    lotesPorEtapa: readonly Medida[];
    franja: readonly Medida[];
    despachos: readonly Medida[];
  };
  taller: {
    /** `filas: null` = sin lectura («Sin datos»). */
    crons: { pieza: "salud_crons"; filas: readonly CronConSalud[] | null; leidoAt: string };
    cola: { pendientes: Medida; fallidos: Medida };
    automatizaciones: readonly Medida[];
    /** El registro de automatizaciones aún no está conciliado con Make (F1): la vista lo dice (crítica 25). */
    registroConciliado: false;
  };
  avisos: readonly Aviso[];
};

// ── El armado ────────────────────────────────────────────────────────────────

const notasDe = (pieza: PiezaId, truncado: boolean, extra: readonly NotaDeMedida[] = []): NotaDeMedida[] | undefined => {
  const n: NotaDeMedida[] = [...extra];
  if (FUENTES[pieza].cuentaCeroSiFalla) n.push("cuenta_cero_si_falla");
  if (truncado) n.push("tope_de_filas");
  return n.length ? n : undefined;
};

/**
 * Arma el tablero. Puro y total: cada pieza de PIEZAS sale al menos una vez, con su
 * valor o con `null`; cada lectura fallida deja un aviso con sus fuentes.
 */
export function armarTablero(l: LecturasDelTablero): Tablero {
  const leidoAt = l.leidoAt;
  const avisos: Aviso[] = [];
  for (const x of [l.tareas, l.tratos, l.stock, l.pvc, l.salud, l.hechos, l.lotes] as const) {
    if (!x.ok) avisos.push({ error: x.error, fuentes: x.fuentes });
  }
  const trunc = (x: Lectura<unknown>) => x.ok && !!x.truncado;

  const medida = (pieza: PiezaId, valor: number | null, truncado: boolean, opts: { clave?: string; extra?: readonly NotaDeMedida[] } = {}): Medida => {
    const notas = notasDe(pieza, truncado, opts.extra);
    return { valor, pieza, leidoAt, ...(opts.clave !== undefined ? { clave: opts.clave } : {}), ...(notas ? { notas } : {}) };
  };
  const rotulo = (pieza: PiezaId, texto: string | null, truncado: boolean): Rotulo => {
    const notas = notasDe(pieza, truncado);
    return { texto, pieza, leidoAt, ...(notas ? { notas } : {}) };
  };

  // Tratos
  const tr = l.tratos.ok ? l.tratos.valor : null;
  const tTr = trunc(l.tratos);
  const estadosDeContrato = tr ? Object.keys(tr.contratosPorEstado).sort() : [];
  const contratos: Medida[] = tr
    ? estadosDeContrato.map((e) => medida("contratos_por_estado", tr.contratosPorEstado[e] ?? null, tTr, { clave: e }))
    : [medida("contratos_por_estado", null, false)];
  const despachos: Medida[] = [
    medida("despachos_pendientes", tr ? tr.despachos.pendientes : null, tTr),
    medida("despachos_despachados", tr ? tr.despachos.despachados : null, tTr),
    medida("despachos_vencidos", tr ? tr.despachos.vencidos : null, tTr),
    medida("despachos_kg_por_recibir", tr ? tr.despachos.kgPorRecibir : null, tTr),
  ];
  const ventanas = medida("ventanas_vigentes", tr ? tr.ventanasVigentes : null, tTr);

  // La franja del stock: las mismas sumas que `pasosDeLaFranja` (kg; por declarar, en catálogo y vendido en kg verde)
  const st = l.stock.ok ? l.stock.valor : null;
  const tSt = trunc(l.stock);
  const franja: Medida[] = [
    medida("franja_por_recibir", st ? st.porRecibir.despachosKg + st.porRecibir.comprasKg : null, tSt),
    medida("franja_en_stock", st ? st.enStock.pergaminoKg + st.enStock.verdeKg + st.enStock.otrosKg : null, tSt),
    // La misma cifra que el Triage y la franja (kg de verde equivalentes, `porDeclararEnVerde`).
    medida("franja_por_declarar", st ? st.porDeclarar.verdeKg : null, tSt),
    medida("franja_en_catalogo", st ? st.enCatalogo.kgVerde : null, tSt),
    // `vendido` es null cuando no hay ventas registradas: es un dato, no una lectura fallida.
    medida("franja_vendido", st ? (st.vendido ? st.vendido.kgVerde : null) : null, tSt),
  ];

  // PVC (sin precios: el código, y lo que espera al owner)
  const pv = l.pvc.ok ? l.pvc.valor : null;
  const tPv = trunc(l.pvc);
  const pvc: (Medida | Rotulo)[] = [
    rotulo("pvc_vigente", pv?.vigente?.codigo ?? null, tPv),
    rotulo("pvc_proxima", pv?.proxima?.codigo ?? null, tPv),
    medida("pvc_correcciones", pv ? pv.correccionesPropuestas : null, tPv),
    medida("pvc_borrador", pv ? (pv.borradorPorPublicar ? 1 : 0) : null, tPv),
  ];

  // Lotes por etapa
  const lo = l.lotes.ok ? l.lotes.valor : null;
  const tLo = trunc(l.lotes);
  const lotesPorEtapa: Medida[] = lo
    ? Object.keys(lo).sort().map((e) => medida("lotes_por_etapa", lo[e] ?? null, tLo, { clave: e }))
    : [medida("lotes_por_etapa", null, false)];

  // Las piezas de un solo hub, cada una a su edificio
  const unHub: (Medida | Rotulo)[] = [...contratos, ventanas, ...despachos, ...franja, ...pvc, ...lotesPorEtapa];
  const piezasDe = (d: Dominio) => unHub.filter((p) => hubDePieza(p.pieza) === d);

  // Las piezas repartidas por hub
  const ta = l.tareas.ok ? l.tareas.valor : null;
  const tTa = trunc(l.tareas);
  const conTareas = hubsConTareas();
  const sa = l.salud.ok ? l.salud.valor : null;
  const tSa = trunc(l.salud);
  const he = l.hechos.ok ? l.hechos.valor : null;
  const tHe = trunc(l.hechos);

  const edificios = Object.fromEntries(
    DOMINIOS.map((d): [Dominio, Edificio] => {
      const tieneTareas = conTareas.has(d.id);
      const sinFuente: readonly NotaDeMedida[] = tieneTareas ? [] : ["sin_fuente_aun"];
      const conteo = ta && tieneTareas ? ta.porHub[d.id] : null;
      const cola = sa ? (sa.cola[d.id] ?? { pendientes: 0, fallidos: 0 }) : null;
      const crons = sa ? sa.crons.filter((c) => c.dominio === d.id).map((c) => c.salud) : [];
      return [
        d.id,
        {
          dominio: d.id,
          n: d.n,
          label: d.label,
          abiertas: medida("tareas_abiertas", conteo ? conteo.abiertas : null, tTa, { extra: sinFuente }),
          vencidas: medida("tareas_vencidas", conteo ? conteo.vencidas : null, tTa, { extra: sinFuente }),
          hechos: medida("hechos_por_hub", he ? (he[d.id] ?? 0) : null, tHe),
          cola: {
            pendientes: medida("cola_pendientes", cola ? cola.pendientes : null, tSa),
            fallidos: medida("cola_fallidos", cola ? cola.fallidos : null, tSa),
          },
          salud: { pieza: "salud_crons", valor: peorSalud(crons), leidoAt },
          piezas: piezasDe(d.id),
        },
      ];
    })
  ) as Record<Dominio, Edificio>;

  // El Taller: la salud de todo el sistema
  const totalCola = (k: "pendientes" | "fallidos") =>
    sa ? Object.values(sa.cola).reduce((acc, c) => acc + (c ? c[k] : 0), 0) : null;
  const automatizaciones: Medida[] = ETAPAS.map((e) =>
    medida(
      "automatizaciones_por_etapa",
      sa ? Object.values(sa.automatizaciones).reduce((acc, porEtapa) => acc + (porEtapa?.[e] ?? 0), 0) : null,
      tSa,
      { clave: e }
    )
  );

  return {
    leidoAt,
    edificios,
    almacen: { lotesPorEtapa, franja, despachos: [...despachos, ventanas, ...contratos] },
    taller: {
      crons: { pieza: "salud_crons", filas: sa ? sa.crons : null, leidoAt },
      cola: { pendientes: medida("cola_pendientes", totalCola("pendientes"), tSa), fallidos: medida("cola_fallidos", totalCola("fallidos"), tSa) },
      automatizaciones,
      registroConciliado: false,
    },
    avisos,
  };
}

/** Todas las piezas que salen en el tablero (el guardián exige que sean TODAS las de PIEZAS: sin entradas muertas en FUENTES). */
export function piezasDelTablero(t: Tablero): Set<PiezaId> {
  const s = new Set<PiezaId>();
  for (const e of Object.values(t.edificios)) {
    for (const m of [e.abiertas, e.vencidas, e.hechos, e.cola.pendientes, e.cola.fallidos, e.salud, ...e.piezas]) s.add(m.pieza);
  }
  for (const m of [...t.almacen.lotesPorEtapa, ...t.almacen.franja, ...t.almacen.despachos, t.taller.crons, t.taller.cola.pendientes, t.taller.cola.fallidos, ...t.taller.automatizaciones]) s.add(m.pieza);
  return s;
}

/** Las piezas de FUENTES que el tablero NO saca (debe ser vacío). */
export function piezasMuertas(t: Tablero): PiezaId[] {
  const usadas = piezasDelTablero(t);
  return PIEZAS.filter((p) => !usadas.has(p));
}
