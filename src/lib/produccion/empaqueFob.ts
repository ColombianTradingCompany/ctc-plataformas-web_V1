// ── Empacado hasta FOB (V5.194, owner 2026-10-09) — PURO ──────────────────────────────────────────────────────────────────
// «ECP · Modelo de Producción → Empacado […] debe adaptarse un poco mejor para ser una herramienta adecuada que permita calcular
// diferentes modos de empaque además de la paletización, el transporte a puerto y los trámites para hacerlo FOB (remueve todo lo que
// tiene que ver con la amortización de la máquina y sus datos de análisis).» — `docs/PLAN_TRIAGE_CATALOGO.md` §2.2.
//
// Para un EMBARQUE de café verde: lo que cuesta empacarlo, paletizarlo, llevarlo al puerto (o al aeropuerto) y despacharlo de
// exportación. El resultado es el costo hasta FOB por kg de verde, en COP y en US$ a la TRM, con cada línea a la vista. No hay
// máquina ni amortización: la productividad del empaque es la de la gente (kg por jornal).
//
// LOS VALORES POR DEFECTO tienen fuente y se ajustan en pantalla: el cotizador logístico de CTCx (`public/ocp-apps/
// cotizador-logistico.html`, 2026-08, embarque de 500 kg): bolsa al vacío $5.000, caja de 12 kg $7.000 y de 24 kg $10.000, etiqueta
// $300, tarjeta de humedad $750, jornal $170.000 con 4 jornales al vacío y 1 en sacos; saco de yute $12.000 y forro GrainPro $10.000;
// estiba ISPM-15 $55.000 hasta 1.100 kg; flete interno $420.000 por embarque; agencia de aduanas $300.000, certificados (OIC, VUCE,
// ICA) $320.000, re-pesaje y guía DIAN $120.000, inspección física $300.000; en el puerto, OTHC $224.900 + ISPS $86.500 + B/L
// $259.500 + estiba $121.100; contribución cafetera US$ 0,06 por libra. Un puerto MARÍTIMO no trae tarifa de flete por defecto: hay
// que escribir la del transportador (la pantalla lo avisa).
//
// Una REFERENCIA guardada congela estos parámetros y su resultado (`empaque_fob_referencias`); el Triage de Catálogo Activo la elige.

import { LB, PARAMS_V211 } from "@/lib/pvc/motor";

export type TipoDeEmpaque = "vacio" | "saco";
export type ModoId = "vacio-3" | "vacio-6" | "vacio-12" | "saco-35" | "saco-70";
export type ModoDeEmpaque = { id: ModoId; nombre: string; tipo: TipoDeEmpaque; kgUnidad: number; unidadesPorCaja: number; kgCaja: number };

export const MODOS_DE_EMPAQUE: readonly ModoDeEmpaque[] = [
  { id: "vacio-3", nombre: "Vacío · bolsas de 3 kg en cajas de 12 kg", tipo: "vacio", kgUnidad: 3, unidadesPorCaja: 4, kgCaja: 12 },
  { id: "vacio-6", nombre: "Vacío · bolsas de 6 kg en cajas de 12 kg", tipo: "vacio", kgUnidad: 6, unidadesPorCaja: 2, kgCaja: 12 },
  { id: "vacio-12", nombre: "Vacío · bolsas de 12 kg en cajas de 24 kg", tipo: "vacio", kgUnidad: 12, unidadesPorCaja: 2, kgCaja: 24 },
  { id: "saco-35", nombre: "GrainPro + yute · sacos de 35 kg", tipo: "saco", kgUnidad: 35, unidadesPorCaja: 0, kgCaja: 0 },
  { id: "saco-70", nombre: "GrainPro + yute · sacos de 70 kg", tipo: "saco", kgUnidad: 70, unidadesPorCaja: 0, kgCaja: 0 },
];

export type DestinoId = "cartagena" | "santa-marta" | "buenaventura" | "bogota-eldorado";
export type DestinoFob = { id: DestinoId; nombre: string; via: "maritimo" | "aereo"; incoterm: "FOB" | "FCA" };

export const DESTINOS_FOB: readonly DestinoFob[] = [
  { id: "cartagena", nombre: "Cartagena", via: "maritimo", incoterm: "FOB" },
  { id: "santa-marta", nombre: "Santa Marta", via: "maritimo", incoterm: "FOB" },
  { id: "buenaventura", nombre: "Buenaventura", via: "maritimo", incoterm: "FOB" },
  { id: "bogota-eldorado", nombre: "Bogotá · El Dorado", via: "aereo", incoterm: "FCA" },
];

export const modoDe = (id: string): ModoDeEmpaque | null => MODOS_DE_EMPAQUE.find((m) => m.id === id) ?? null;
export const destinoDe = (id: string): DestinoFob | null => DESTINOS_FOB.find((d) => d.id === id) ?? null;

/** Los parámetros de un cálculo. Todo en COP salvo la contribución (US$ por libra) y la TRM (COP por US$). */
export type ParametrosEmpaqueFob = {
  modo: ModoId;
  destino: DestinoId;
  /** kg de café VERDE del embarque. */
  kgEmbarque: number;
  trm: number;
  // 1 · Empaque
  /** La bolsa al vacío o el saco de yute, con IVA. */
  costoUnidad: number;
  /** El forro GrainPro de un saco (0 en vacío). */
  costoForro: number;
  /** Una caja (0 en sacos). */
  costoCaja: number;
  /** Por bolsa o saco. */
  costoEtiqueta: number;
  /** La tarjeta indicadora de humedad: una por caja (vacío) o por saco. */
  costoHic: number;
  jornal: number;
  /** Productividad: kg empacados por jornal. */
  kgPorJornal: number;
  // 2 · Paletizado
  paletizar: boolean;
  kgPorEstiba: number;
  costoEstiba: number;
  /** Film, esquineros y zunchos, por estiba. */
  costoMaterialesEstiba: number;
  // 3 · Transporte a puerto o aeropuerto
  costoViaje: number;
  /** Capacidad por viaje; 0 = un viaje por embarque (como lo cobra el cotizador logístico). */
  kgPorViaje: number;
  // 4 · Trámites FOB, por embarque
  agenciaAduanas: number;
  certificados: number;
  repesajeDian: number;
  inspeccion: number;
  /** En el puerto: OTHC, ISPS, B/L y estiba; en el aeropuerto, el manejo de carga. */
  terminalOrigen: number;
  fumigacion: number;
  otros: number;
  /** Contribución cafetera, US$ por libra de café verde exportado. */
  contribucionUsdLb: number;
};

/** La TRM de respaldo cuando no hay edición del PVC vigente (la del cotizador logístico). */
export const TRM_DE_RESPALDO = 3500;
export const KG_EMBARQUE_POR_DEFECTO = 500;
const TERMINAL_MARITIMO = 224_900 + 86_500 + 259_500 + 121_100;

/** Lo que depende del MODO de empaque. */
export function parametrosDelModo(modo: ModoId): Pick<ParametrosEmpaqueFob, "modo" | "costoUnidad" | "costoForro" | "costoCaja" | "costoEtiqueta" | "costoHic" | "kgPorJornal" | "kgPorEstiba"> {
  const m = modoDe(modo) ?? MODOS_DE_EMPAQUE[1];
  if (m.tipo === "vacio") {
    return { modo: m.id, costoUnidad: 5_000, costoForro: 0, costoCaja: m.kgCaja >= 24 ? 10_000 : 7_000, costoEtiqueta: 300, costoHic: 750, kgPorJornal: 125, kgPorEstiba: 1_000 };
  }
  // Los precios del saco y del forro son los del saco de 70 kg en ambos tamaños: ajústelos con una cotización del de 35 kg.
  return { modo: m.id, costoUnidad: 12_000, costoForro: 10_000, costoCaja: 0, costoEtiqueta: 300, costoHic: 750, kgPorJornal: 500, kgPorEstiba: 700 };
}

/** Lo que depende del DESTINO. Un puerto marítimo no trae tarifa de flete: hay que escribirla. */
export function parametrosDelDestino(destino: DestinoId): Pick<ParametrosEmpaqueFob, "destino" | "costoViaje" | "kgPorViaje" | "terminalOrigen"> {
  const d = destinoDe(destino) ?? DESTINOS_FOB[0];
  return d.via === "aereo"
    ? { destino: d.id, costoViaje: 420_000, kgPorViaje: 0, terminalOrigen: 0 }
    : { destino: d.id, costoViaje: 0, kgPorViaje: 0, terminalOrigen: TERMINAL_MARITIMO };
}

export function parametrosPorDefecto(modo: ModoId = "vacio-6", destino: DestinoId = "cartagena", trm: number = TRM_DE_RESPALDO): ParametrosEmpaqueFob {
  return {
    ...parametrosDelModo(modo),
    ...parametrosDelDestino(destino),
    kgEmbarque: KG_EMBARQUE_POR_DEFECTO,
    trm: trm > 0 ? trm : TRM_DE_RESPALDO,
    jornal: 170_000,
    paletizar: true,
    costoEstiba: 55_000,
    costoMaterialesEstiba: 0,
    agenciaAduanas: 300_000,
    certificados: 320_000,
    repesajeDian: 120_000,
    inspeccion: 300_000,
    fumigacion: 0,
    otros: 0,
    contribucionUsdLb: 0.06,
  };
}

/** Los parámetros que son números (todos menos el modo, el destino y si se paletiza). */
export const CAMPOS_NUMERICOS = [
  "kgEmbarque", "trm", "costoUnidad", "costoForro", "costoCaja", "costoEtiqueta", "costoHic", "jornal", "kgPorJornal", "kgPorEstiba",
  "costoEstiba", "costoMaterialesEstiba", "costoViaje", "kgPorViaje", "agenciaAduanas", "certificados", "repesajeDian", "inspeccion",
  "terminalOrigen", "fumigacion", "otros", "contribucionUsdLb",
] as const satisfies readonly (keyof ParametrosEmpaqueFob)[];
export type CampoNumerico = (typeof CAMPOS_NUMERICOS)[number];

/** Lo que llega del navegador → parámetros válidos (lo que falta o no es número, del valor por defecto). Nunca se confía en lo calculado allá. */
export function normalizaParametros(raw: unknown): ParametrosEmpaqueFob {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const modo = modoDe(String(r.modo ?? ""))?.id ?? "vacio-6";
  const destino = destinoDe(String(r.destino ?? ""))?.id ?? "cartagena";
  const base = parametrosPorDefecto(modo, destino);
  const out: ParametrosEmpaqueFob = { ...base, modo, destino, paletizar: typeof r.paletizar === "boolean" ? r.paletizar : base.paletizar };
  for (const k of CAMPOS_NUMERICOS) {
    const v = typeof r[k] === "number" ? (r[k] as number) : typeof r[k] === "string" && String(r[k]).trim() !== "" ? Number(String(r[k]).replace(",", ".")) : NaN;
    if (Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

/** Por qué un cálculo no se puede guardar. Vacío = se puede. */
export function erroresDeParametros(p: ParametrosEmpaqueFob): string[] {
  const e: string[] = [];
  if (!modoDe(p.modo)) e.push("Elija un modo de empaque.");
  if (!destinoDe(p.destino)) e.push("Elija el puerto o el aeropuerto de salida.");
  if (!(p.kgEmbarque > 0)) e.push("Escriba los kg de verde del embarque.");
  if (!(p.trm > 0)) e.push("Escriba la TRM.");
  if (!(p.kgPorJornal > 0)) e.push("La productividad (kg por jornal) tiene que ser mayor que cero.");
  if (p.paletizar && !(p.kgPorEstiba > 0)) e.push("Los kg por estiba tienen que ser mayores que cero.");
  return e;
}

export type LineaDeCosto = { nombre: string; cantidad: number | null; unidad: string | null; unitario: number | null; cop: number };
export type ClaveDeSeccion = "empaque" | "paletizado" | "transporte" | "tramites";
export type SeccionDeCosto = { clave: ClaveDeSeccion; nombre: string; lineas: LineaDeCosto[]; cop: number; copKg: number; usdKg: number };

export type ResultadoEmpaqueFob = {
  modo: ModoDeEmpaque;
  destino: DestinoFob;
  unidades: number;
  cajas: number;
  jornales: number;
  estibas: number;
  viajes: number;
  secciones: SeccionDeCosto[];
  totalCop: number;
  copKg: number;
  usdKg: number;
  avisos: string[];
};

export const NOMBRE_DE_SECCION: Record<ClaveDeSeccion, string> = {
  empaque: "Empaque",
  paletizado: "Paletizado",
  transporte: "Transporte a puerto",
  tramites: "Trámites FOB y contribución",
};

/** «1 estiba», «2 estibas». */
const u = (n: number, singular: string, plural: string) => (n === 1 ? singular : plural);
const usdLb = (v: number) => new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(v);

const linea = (nombre: string, cantidad: number | null, unidad: string | null, unitario: number | null, cop?: number): LineaDeCosto => ({
  nombre,
  cantidad,
  unidad,
  unitario,
  cop: Math.round(cop ?? (cantidad ?? 0) * (unitario ?? 0)),
});

/** El cálculo. Cantidades enteras (se compran bolsas, cajas, jornales, estibas y viajes enteros); costos en COP. */
export function calcularEmpaqueFob(p: ParametrosEmpaqueFob): ResultadoEmpaqueFob {
  const modo = modoDe(p.modo) ?? MODOS_DE_EMPAQUE[1];
  const destino = destinoDe(p.destino) ?? DESTINOS_FOB[0];
  const kg = p.kgEmbarque > 0 ? p.kgEmbarque : 0;
  const trm = p.trm > 0 ? p.trm : TRM_DE_RESPALDO;
  const esVacio = modo.tipo === "vacio";

  const nombreUnidad = (n: number) => (esVacio ? u(n, "bolsa", "bolsas") : u(n, "saco", "sacos"));
  const unidades = kg > 0 ? Math.ceil(kg / modo.kgUnidad - 1e-9) : 0;
  const cajas = esVacio && unidades > 0 ? Math.ceil(unidades / modo.unidadesPorCaja - 1e-9) : 0;
  const jornales = kg > 0 && p.kgPorJornal > 0 ? Math.ceil(kg / p.kgPorJornal - 1e-9) : 0;
  const estibas = p.paletizar && kg > 0 && p.kgPorEstiba > 0 ? Math.ceil(kg / p.kgPorEstiba - 1e-9) : 0;
  const viajes = kg > 0 ? (p.kgPorViaje > 0 ? Math.ceil(kg / p.kgPorViaje - 1e-9) : 1) : 0;

  const empaque: LineaDeCosto[] = [
    linea(esVacio ? `Bolsa al vacío de ${modo.kgUnidad} kg` : `Saco de yute de ${modo.kgUnidad} kg`, unidades, nombreUnidad(unidades), p.costoUnidad),
    ...(esVacio ? [] : [linea("Forro GrainPro", unidades, u(unidades, "forro", "forros"), p.costoForro)]),
    ...(esVacio ? [linea(`Caja de ${modo.kgCaja} kg`, cajas, u(cajas, "caja", "cajas"), p.costoCaja)] : []),
    linea("Etiqueta", unidades, nombreUnidad(unidades), p.costoEtiqueta),
    linea("Tarjeta de humedad (HIC)", esVacio ? cajas : unidades, esVacio ? u(cajas, "caja", "cajas") : u(unidades, "saco", "sacos"), p.costoHic),
    linea("Mano de obra", jornales, u(jornales, "jornal", "jornales"), p.jornal),
  ];
  const paletizado: LineaDeCosto[] = p.paletizar
    ? [linea("Estiba ISPM-15", estibas, u(estibas, "estiba", "estibas"), p.costoEstiba), linea("Film, esquineros y zunchos", estibas, u(estibas, "estiba", "estibas"), p.costoMaterialesEstiba)]
    : [];
  const transporte: LineaDeCosto[] = [linea(`Flete a ${destino.nombre}`, viajes, u(viajes, "viaje", "viajes"), p.costoViaje)];
  const contribucionUsd = kg * LB * p.contribucionUsdLb;
  const tramites: LineaDeCosto[] = [
    linea("Agencia de aduanas y declaración de exportación", null, null, null, p.agenciaAduanas),
    linea("Certificados (origen OIC, VUCE, fitosanitario ICA)", null, null, null, p.certificados),
    linea("Re-pesaje y guía de tránsito DIAN", null, null, null, p.repesajeDian),
    linea("Inspección física", null, null, null, p.inspeccion),
    linea(destino.via === "maritimo" ? "Gastos de terminal en origen (OTHC, ISPS, B/L, estiba)" : "Manejo de carga en el aeropuerto", null, null, null, p.terminalOrigen),
    linea("Fumigación", null, null, null, p.fumigacion),
    linea("Otros", null, null, null, p.otros),
    linea(`Contribución cafetera (US$ ${usdLb(p.contribucionUsdLb)}/lb)`, Math.round(kg * LB * 100) / 100, "lb", Math.round(p.contribucionUsdLb * trm * 100) / 100, contribucionUsd * trm),
  ];

  const porKg = (cop: number) => (kg > 0 ? cop / kg : 0);
  const seccion = (clave: ClaveDeSeccion, lineas: LineaDeCosto[]): SeccionDeCosto => {
    const cop = lineas.reduce((s, l) => s + l.cop, 0);
    return { clave, nombre: NOMBRE_DE_SECCION[clave], lineas, cop, copKg: porKg(cop), usdKg: porKg(cop) / trm };
  };
  const secciones = [seccion("empaque", empaque), seccion("paletizado", paletizado), seccion("transporte", transporte), seccion("tramites", tramites)];
  const totalCop = secciones.reduce((s, x) => s + x.cop, 0);

  const avisos: string[] = [];
  if (!(p.costoViaje > 0)) avisos.push(`Falta la tarifa del flete a ${destino.nombre}: escriba la cotización del transportador.`);
  if (destino.via === "aereo") avisos.push("Por aire el término es FCA (entregado en el aeropuerto), no FOB: el costo hasta el despacho es el mismo concepto.");
  if (!p.paletizar) avisos.push("Sin paletizar: el embarque viaja suelto (sin estibas).");

  return { modo, destino, unidades, cajas, jornales, estibas, viajes, secciones, totalCop, copKg: porKg(totalCop), usdKg: porKg(totalCop) / trm, avisos };
}

/** Los estimados del Modelo Económico (PVC v2.1.1, `motor.ts`), en US$/kg de verde, para comparar. El de empaque (`proc`) suma
 *  además la trilla y la selección: no es el mismo concepto que la sección de empaque de aquí. */
export const ESTIMADOS_DEL_PVC = {
  empaqueConTrilla: PARAMS_V211.proc,
  paletizado: PARAMS_V211.palet,
  transporte: PARAMS_V211.transp,
  tramites: PARAMS_V211.exp,
} as const;

/** Lo que se guarda de una referencia en `resultado` (jsonb): lo necesario para enseñarla sin recalcular. */
export function resumenParaGuardar(r: ResultadoEmpaqueFob) {
  return {
    modo: r.modo.id,
    destino: r.destino.id,
    unidades: r.unidades,
    cajas: r.cajas,
    jornales: r.jornales,
    estibas: r.estibas,
    viajes: r.viajes,
    secciones: r.secciones.map((s) => ({ clave: s.clave, cop: Math.round(s.cop), copKg: Math.round(s.copKg * 100) / 100, usdKg: Math.round(s.usdKg * 10000) / 10000 })),
    totalCop: Math.round(r.totalCop),
    avisos: r.avisos,
  };
}
