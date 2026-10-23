// ── CTCx Coffee Datasheet Tool · el ESTADO de una evaluación (V6.6, owner 2026-10-23) — PURO ──────────────────────────
// «It MUST be the SAME [interface as the Centro de Calidad]». Desde la V6.6 la herramienta del taller ES la planilla del
// Centro (`LabEvalEditor`, el mismo componente, los mismos datos: `LabEvaluation`), más lo que la planilla no tiene porque
// el Q-Grader cata a ciegas: **B1** (variedades y caracterización básica), la **Caracterización Extrínseca** (SCA 105) y la
// **Información Comercial**. Una evaluación son una sesión y uno o varios lotes; cada lote lleva su planilla entera.
//
// Módulo PURO (sin DOM): lo ejecuta `scripts/qa-coffee-datasheet-check.mjs` con `--experimental-strip-types`. Lo que
// llega de un archivo, de un trabajo guardado o de la V1 (el HTML autocontenido de la V5.132–V5.189) pasa por `normalizar`.

import { EMPTY_LAB_EVALUATION, labEvaluationHasData, toLabEvaluation, type LabEvaluation } from "@/lib/arena/labEvaluation";
import type { IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { ALFABETO } from "@/lib/catalogo/codigoPublico";
import { COLORES_DEL_VERDE } from "@/lib/catacion/fisico";

export const APP = "ctcx-coffee-datasheet";
export const VERSION_ESTADO = 2;
export const MAX_LOTES = 12;
/** SCA 102 · 7.2: «el máximo de cafés por sesión debería ser 6». Se avisa, no se impide. */
export const LOTES_RECOMENDADOS = 6;

/** Las partes que se pueden llenar («Parts to fill in»): la planilla son b2 y b3; las otras tres son de esta herramienta. */
export const PARTES = ["b1", "b2", "b3", "ext", "com"] as const;
export type Parte = (typeof PARTES)[number];

export type Variedad = { nombre: string; pct: string };
/** B1 · lo que la Ficha de Kaffetal Regal pide en su B1 y la planilla del Centro no (cata a ciegas). Humedad, densidad, aw y
 *  factor reportado NO viven aquí: son los campos de la planilla (`b3_*`), y B1 solo los enseña — un dato, un sitio. */
export type B1 = {
  variedades: Variedad[];
  /** «Lavado» · «Honey» · «Natural» (`PROCESOS_BASE` de la Ficha) · «Otro» · "" */
  proceso: string;
  proceso_otro: string;
  proceso_especial: string;
};
export const PROCESOS: readonly string[] = ["Lavado", "Honey", "Natural", "Otro"];

/** Caracterización extrínseca (SCA 105): cinco categorías. Variedad, especie, proceso, precio al productor y tamaño del lote
 *  NO están aquí: salen de B1 y de la Información Comercial (un dato, un sitio). */
export type Extrinseca = {
  pais: string; region: string; municipio: string; finca: string; productor: string; cosecha: string; altitud: string; geo: string; cultivo_info: string;
  humedo: string; trilla: string; proc_otro: string; descaf: "" | "no" | "si"; descaf_cual: string; proc_desc: string; proc_info: string;
  grado: string; oic: string; importador: string; exportador: string; comercio_info: string; proveedor: string; nit: string; hs: string;
  certs: Record<string, boolean>; cert_otro: string; cert_info: string;
  premios: string; historia: string;
};
export const CERT_OFICIALES: readonly string[] = ["4c", "fair", "org", "ra", "food"];
export const CERT_OTRAS: readonly string[] = ["eudr", "bird", "cafe", "aaa", "gi"];

/** Información Comercial (owner, 2026-10-23): cuánto hay, a qué precio y en qué condiciones — con fecha de validez. */
export type Comercial = {
  pergamino_kg: string;
  verde_kg: string;
  farm_gate: string;
  farm_gate_unidad: string;
  fob: string;
  fob_unidad: string;
  fob_puerto: string;
  incoterm: "" | "CIP" | "DDP";
  destino_precio: string;
  destino_unidad: string;
  destino_region: string;
  empaque: string;
  norma: string;
  norma_otra: string;
  condiciones: string;
  valido_hasta: string;
};
export const UNIDADES_PRECIO: readonly string[] = ["COP/carga 125 kg", "COP/kg", "US$/lb", "US$/kg", "EUR/kg"];
export const INCOTERMS: readonly Comercial["incoterm"][] = ["", "CIP", "DDP"];
/** Las normas de calidad con las que se vende café colombiano, más las de especialidad. «Otra» se escribe. */
export const NORMAS_CALIDAD: readonly string[] = ["UGQ", "Excelso EP", "Excelso EP 10", "Supremo", "Supremo 17/18", "Premium", "Especialidad (SCA ≥ 80)", "Microlote", "Otra"];

export type Lote = {
  /** El identificador único de la ficha: `CDT-XXXX-XXXX` (Crockford base32, 32⁸ ≈ 1,1·10¹² combinaciones; no lleva la fecha). */
  uid: string;
  /** El número de muestra con que se cata (a ciegas): el que el evaluador quiera. */
  codigo: string;
  nombre: string;
  planilla: LabEvaluation;
  b1: B1;
  ext: Extrinseca;
  com: Comercial;
};
export type Sesion = { evaluador: string; scaId: string; fecha: string; lugar: string; objetivo: string };
export type Evaluacion = {
  app: typeof APP;
  v: number;
  lang: IdiomaDePlanilla;
  partes: Record<Parte, boolean>;
  sesion: Sesion;
  lotes: Lote[];
  actual: number;
};

const texto = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "");

export function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Un `CDT-XXXX-XXXX` nuevo, distinto de los que ya hay en la evaluación. El azar es criptográfico cuando el navegador lo da. */
export function nuevoUid(existentes: readonly string[] = []): string {
  const bytes = new Uint8Array(8);
  const c = typeof globalThis !== "undefined" ? (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto : undefined;
  for (let intento = 0; intento < 20; intento++) {
    if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    const cuerpo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
    const uid = `CDT-${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}`;
    if (!existentes.includes(uid)) return uid;
  }
  return `CDT-${Date.now().toString(32).toUpperCase().slice(-8).padStart(8, "0").replace(/(.{4})(.{4})/, "$1-$2")}`;
}
export const UID_RE = /^CDT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
export const esUid = (v: unknown): v is string => typeof v === "string" && UID_RE.test(v);

export const b1Vacio = (): B1 => ({ variedades: [{ nombre: "", pct: "" }], proceso: "", proceso_otro: "", proceso_especial: "" });
export const extVacia = (): Extrinseca => ({
  pais: "", region: "", municipio: "", finca: "", productor: "", cosecha: "", altitud: "", geo: "", cultivo_info: "",
  humedo: "", trilla: "", proc_otro: "", descaf: "", descaf_cual: "", proc_desc: "", proc_info: "",
  grado: "", oic: "", importador: "", exportador: "", comercio_info: "", proveedor: "", nit: "", hs: "",
  certs: {}, cert_otro: "", cert_info: "", premios: "", historia: "",
});
export const comVacia = (): Comercial => ({
  pergamino_kg: "", verde_kg: "", farm_gate: "", farm_gate_unidad: UNIDADES_PRECIO[0], fob: "", fob_unidad: "US$/lb", fob_puerto: "",
  incoterm: "", destino_precio: "", destino_unidad: "US$/kg", destino_region: "", empaque: "", norma: "", norma_otra: "", condiciones: "", valido_hasta: "",
});
export function loteVacio(i: number, existentes: readonly string[] = []): Lote {
  return { uid: nuevoUid(existentes), codigo: `L${String(i + 1).padStart(2, "0")}`, nombre: "", planilla: { ...EMPTY_LAB_EVALUATION }, b1: b1Vacio(), ext: extVacia(), com: comVacia() };
}
export function evaluacionVacia(lang: IdiomaDePlanilla = "es"): Evaluacion {
  return {
    app: APP, v: VERSION_ESTADO, lang,
    partes: { b1: true, b2: true, b3: true, ext: true, com: true },
    sesion: { evaluador: "", scaId: "", fecha: hoy(), lugar: "", objetivo: "" },
    lotes: [loteVacio(0)],
    actual: 0,
  };
}

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function normVariedades(raw: unknown): Variedad[] {
  const vs = (Array.isArray(raw) ? raw : []).slice(0, 8).map((v) => {
    const o = esObjeto(v) ? v : {};
    return { nombre: texto(o.nombre ?? o.n ?? o.name), pct: texto(o.pct ?? o.p) };
  });
  return vs.length ? vs : [{ nombre: "", pct: "" }];
}
function normB1(raw: unknown): B1 {
  const o = esObjeto(raw) ? raw : {};
  const proceso = texto(o.proceso);
  return { variedades: normVariedades(o.variedades), proceso: PROCESOS.includes(proceso) ? proceso : "", proceso_otro: texto(o.proceso_otro), proceso_especial: texto(o.proceso_especial) };
}
function normExt(raw: unknown): Extrinseca {
  const base = extVacia(), o = esObjeto(raw) ? raw : {};
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) if (k !== "certs" && k !== "descaf") out[k] = texto(o[k]);
  out.descaf = o.descaf === "si" || o.descaf === "no" ? o.descaf : "";
  const certs: Record<string, boolean> = {};
  if (esObjeto(o.certs)) for (const k of [...CERT_OFICIALES, ...CERT_OTRAS]) if (o.certs[k]) certs[k] = true;
  out.certs = certs;
  return out as Extrinseca;
}
function normCom(raw: unknown): Comercial {
  const base = comVacia(), o = esObjeto(raw) ? raw : {};
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) out[k] = texto(o[k]) || (k.endsWith("_unidad") ? base[k as keyof Comercial] : "");
  out.incoterm = o.incoterm === "CIP" || o.incoterm === "DDP" ? o.incoterm : "";
  return out as Comercial;
}

/** Un lote de la V1 (el HTML autocontenido): sus campos planos eran los de la planilla, más `fis_*`, `ext` y las tres listas de la
 *  rueda (`sca_rueda`, `cva_desc_nariz`, `cva_desc_boca`, con `rueda_detalle` prefijado `nariz:`/`boca:`). Se vuelve una planilla. */
function planillaDeV1(l: Record<string, unknown>, metodo: unknown): LabEvaluation {
  const listas = ["sca_rueda", "cva_desc_nariz", "cva_desc_boca"].flatMap((k) => (Array.isArray(l[k]) ? (l[k] as unknown[]) : []));
  const rueda = [...new Set(listas.filter((x): x is string => typeof x === "string"))];
  const detalle: Record<string, unknown> = {};
  if (esObjeto(l.rueda_detalle)) for (const [k, v] of Object.entries(l.rueda_detalle)) detalle[k.replace(/^(nariz|boca):/, "")] = v;
  const fis = esObjeto(l.fis_def) ? l.fis_def : {};
  return toLabEvaluation({
    ...l,
    vista: metodo === "sca" ? "sca" : "cva",
    escala: metodo === "sca" ? "sca" : "cva",
    rueda,
    rueda_detalle: detalle,
    // La V1 guardaba el color como c1..c8 (el orden del formato CVA); la planilla usa las claves de `fisico.ts`.
    fa_color: /^c[1-8]$/.test(texto(l.fis_color)) ? (COLORES_DEL_VERDE[Number(texto(l.fis_color).slice(1)) - 1]?.key ?? "") : texto(l.fis_color),
    defectos_detalle: fis,
    b3_humedad_verde: texto(l.fis_humedad),
    b3_actividad_agua: texto(l.fis_aw),
    b3_densidad_verde: texto(l.fis_densidad),
    b3_factor_reportado: texto(l.fa_factor_reportado),
    acidez_tipo: Array.isArray(l.cva_acidez) ? texto(l.cva_acidez[0]) : "",
    boca_texturas: Array.isArray(l.cva_boca) ? l.cva_boca : [],
    cupping_profile: texto(l.sca_notas) || texto(l.cupping_profile),
    analysis_notes: texto(l.fis_notas) || texto(l.analysis_notes),
  });
}
function b1DeV1(ext: Record<string, unknown>): B1 {
  const tipo = texto(ext.tipo);
  const proceso = tipo === "lavado" ? "Lavado" : tipo === "natural" ? "Natural" : tipo === "otro" ? (/honey/i.test(texto(ext.tipo_cual)) ? "Honey" : "Otro") : "";
  return { variedades: normVariedades(ext.variedades), proceso, proceso_otro: proceso === "Otro" ? texto(ext.tipo_cual) : "", proceso_especial: "" };
}

export function normLote(raw: unknown, i: number, existentes: readonly string[] = [], metodoV1?: unknown): Lote {
  const l = esObjeto(raw) ? raw : {};
  const esV1 = !esObjeto(l.planilla) && ("sca_fragrance" in l || "cva_fragrance" in l || "fis_def" in l);
  const ext = esObjeto(l.ext) ? l.ext : {};
  const uid = esUid(l.uid) && !existentes.includes(l.uid) ? l.uid : nuevoUid(existentes);
  const base = loteVacio(i, [...existentes, uid]);
  return {
    uid,
    codigo: texto(l.codigo) || base.codigo,
    nombre: texto(l.nombre),
    // Un lote SIN planilla (trabajo nuevo que la concha manda como `{}`) nace como una planilla nueva: en CVA, el protocolo principal
    // (V5.189). `toLabEvaluation` solo recibe una planilla GUARDADA: su valor por defecto para una escala ausente es el SCA 2004 (las
    // planillas viejas del Centro), y por ahí la hoja abría en la vista SCA dentro de la concha.
    planilla: esV1 ? planillaDeV1(l, metodoV1) : esObjeto(l.planilla) ? toLabEvaluation(l.planilla) : { ...EMPTY_LAB_EVALUATION },
    b1: esV1 ? b1DeV1(ext) : normB1(l.b1),
    ext: { ...normExt(ext), ...(esV1 ? { proc_info: texto(ext.proc_info), hs: texto(ext.hs) } : {}) },
    com: esV1 ? { ...comVacia(), farm_gate: texto(ext.precio), condiciones: texto(ext.tamano) ? `${texto(ext.tamano)}` : "" } : normCom(l.com),
  };
}

/** Lo que entra de un archivo, de un trabajo guardado o de la V1 se normaliza ENTERO antes de pintarse: nada ajeno llega a la pantalla. */
export function normalizar(raw: unknown, langPorDefecto: IdiomaDePlanilla = "es"): Evaluacion {
  const base = evaluacionVacia(langPorDefecto);
  if (!esObjeto(raw)) return base;
  const o = raw;
  const lang: IdiomaDePlanilla = o.lang === "en" ? "en" : o.lang === "es" ? "es" : langPorDefecto;
  const partes = { ...base.partes };
  if (esObjeto(o.partes)) {
    for (const p of PARTES) if (p in o.partes) partes[p] = o.partes[p] !== false;
    // V1 llamaba a sus partes basico · sabor · fisico · extr.
    if ("sabor" in o.partes) { partes.b2 = o.partes.sabor !== false; partes.b3 = o.partes.fisico !== false; partes.ext = o.partes.extr !== false; partes.b1 = o.partes.basico !== false; }
  }
  if (!PARTES.some((p) => partes[p])) partes.b2 = true;
  const s = esObjeto(o.sesion) ? o.sesion : {};
  const sesion: Sesion = { evaluador: texto(s.evaluador), scaId: texto(s.scaId), fecha: texto(s.fecha) || base.sesion.fecha, lugar: texto(s.lugar), objetivo: texto(s.objetivo) };
  const crudos = Array.isArray(o.lotes) && o.lotes.length ? o.lotes.slice(0, MAX_LOTES) : [null];
  const lotes: Lote[] = [];
  for (let i = 0; i < crudos.length; i++) lotes.push(normLote(crudos[i], i, lotes.map((x) => x.uid), o.metodo));
  const actual = Math.min(Math.max(0, Math.trunc(Number(o.actual) || 0)), lotes.length - 1);
  return { app: APP, v: VERSION_ESTADO, lang, partes, sesion, lotes, actual };
}

/** La línea que el Home Menu del taller enseña bajo el nombre del trabajo (`CTC.usarResumen`). */
export function resumen(e: Evaluacion): string {
  const n = e.lotes.length;
  const nombres = e.lotes.map((l) => l.nombre.trim() || l.codigo).slice(0, 3).join(", ");
  return `${n} ${e.lang === "en" ? (n === 1 ? "lot" : "lots") : n === 1 ? "lote" : "lotes"} · ${nombres}`.slice(0, 140);
}

/** Qué partes de un lote tienen algo escrito (para la ficha impresa: una parte vacía no se imprime). */
export function partesConDatos(l: Lote): Record<Parte, boolean> {
  const hay = (v: unknown) => typeof v === "string" && v.trim() !== "";
  const b1 = l.b1.variedades.some((v) => hay(v.nombre)) || hay(l.b1.proceso) || hay(l.b1.proceso_especial) || hay(l.planilla.b3_humedad_verde) || hay(l.planilla.b3_densidad_verde) || hay(l.planilla.b3_actividad_agua);
  const p = l.planilla;
  const b2 = labEvaluationHasData({ ...p, fa_start: "", fa_green_remainder: "", fa_parch_hum: "", fa_primary_defect: "", fa_secondary_defect: "", mesh_supremo_plus: "", mesh_supremo: "", mesh_extra: "", mesh_europa: "", mesh_ugq: "", mesh_peaberry: "", mesh_residue: "", b3_humedad_verde: "", b3_actividad_agua: "", b3_densidad_verde: "", b3_factor_reportado: "", fa_color: "", defectos_detalle: {}, analysis_notes: "" });
  const b3 = [p.fa_green_remainder, p.fa_parch_hum, p.fa_primary_defect, p.fa_secondary_defect, p.mesh_supremo_plus, p.mesh_supremo, p.mesh_extra, p.mesh_europa, p.mesh_ugq, p.mesh_peaberry, p.b3_humedad_verde, p.b3_actividad_agua, p.b3_densidad_verde, p.b3_factor_reportado, p.fa_color, p.analysis_notes].some(hay) || Object.values(p.defectos_detalle).some(hay);
  const e = l.ext;
  const ext = Object.entries(e).some(([k, v]) => (k === "certs" ? Object.values(v as Record<string, boolean>).some(Boolean) : hay(v)));
  const c = l.com;
  const com = (Object.keys(c) as (keyof Comercial)[]).some((k) => !k.endsWith("_unidad") && hay(c[k]));
  return { b1, b2, b3, ext, com };
}

/** Las casillas oficiales del formato extrínseco (SCA 105) que esta evaluación ya documenta. */
export function casillasExtrinsecas(l: Lote): { total: number; cuenta: Record<"cultivo" | "proceso" | "comercio" | "certs" | "otro", [number, number]>; marca: Record<string, boolean> } {
  const e = l.ext, c = l.com, hay = (v: unknown) => typeof v === "string" && v.trim() !== "";
  const marca: Record<string, boolean> = {
    pais: hay(e.pais), region: hay(e.region), finca: hay(e.finca), productor: hay(e.productor), especie: l.b1.variedades.some((v) => hay(v.nombre)),
    variedad: l.b1.variedades.some((v) => hay(v.nombre)), cosecha: hay(e.cosecha), cultivo_otro: hay(e.altitud) || hay(e.geo) || hay(e.municipio) || hay(e.cultivo_info),
    humedo: hay(e.humedo), trilla: hay(e.trilla), proc_otro: hay(e.proc_otro), tipo: hay(l.b1.proceso), descaf: e.descaf === "si", proc_desc: hay(e.proc_desc),
    grado: hay(e.grado) || hay(c.norma), oic: hay(e.oic), importador: hay(e.importador), exportador: hay(e.exportador), precio: hay(c.farm_gate), tamano: hay(c.verde_kg) || hay(c.pergamino_kg),
    comercio_otro: hay(e.proveedor) || hay(e.nit) || hay(e.hs) || hay(e.comercio_info) || hay(c.fob) || hay(c.destino_precio),
    c_4c: !!e.certs["4c"], c_fair: !!e.certs.fair, c_org: !!e.certs.org, c_ra: !!e.certs.ra, c_food: !!e.certs.food, c_otra: hay(e.cert_otro) || CERT_OTRAS.some((k) => !!e.certs[k]),
    premios: hay(e.premios),
  };
  const grupos = {
    cultivo: ["pais", "region", "finca", "productor", "especie", "variedad", "cosecha", "cultivo_otro"],
    proceso: ["humedo", "trilla", "proc_otro", "tipo", "descaf", "proc_desc"],
    comercio: ["grado", "oic", "importador", "exportador", "precio", "tamano", "comercio_otro"],
    certs: ["c_4c", "c_fair", "c_org", "c_ra", "c_food", "c_otra"],
    otro: ["premios"],
  } as const;
  const cuenta = {} as Record<keyof typeof grupos, [number, number]>;
  let total = 0;
  for (const g of Object.keys(grupos) as (keyof typeof grupos)[]) {
    const n = grupos[g].filter((k) => marca[k]).length;
    cuenta[g] = [n, grupos[g].length];
    total += n;
  }
  return { total, cuenta, marca };
}

/** La vigencia de la información comercial frente a hoy (ISO yyyy-mm-dd): vencida · vigente · sin fecha. */
export function vigenciaDe(validoHasta: string, hoyIso: string): "" | "vigente" | "vencida" {
  if (!validoHasta) return "";
  return validoHasta < hoyIso ? "vencida" : "vigente";
}

/** El texto de un precio: cifra + unidad, o vacío. */
export const precioTx = (cifra: string, unidad: string): string => (cifra.trim() ? `${cifra.trim()} ${unidad}`.trim() : "");
