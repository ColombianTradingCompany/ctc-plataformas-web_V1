// ── PVC · Ponderación de Valor de Cosecha · el motor ─────────────────────────
// Port TypeScript de `pvc_model_v2.py` (reference_internal_apps/PVC - Modelo/
// v2.0, método PVC-D2 v2.1.1). Es la MISMA aritmética que la calculadora Excel
// y que el tablero HTML; el guardián `scripts/qa-pvc-motor.mjs` compara este
// archivo contra `paridad.json` (cifras exportadas del motor Python) y falla si
// se separan más de 1e-6.
//
// PURO y sin `server-only` a propósito: lo importan las Server Actions, el
// endpoint del ciclo y el guardián de QA con `--experimental-strip-types`.
// Aquí no hay red ni base de datos: entra un objeto de parámetros y otro de
// entradas, sale una edición.
//
// Vocabulario (ver PVC-D2):
//   · PVC       referencia en COP por carga de 125 kg de pergamino seco, FR 94
//   · PEC       precio efectivo de cooperativa = FNC + PEC-ADD
//   · escalera  PVC × multiplicador por banda (Black/Red/Blue/Gold; Tyrian en subasta)
//   · pila      precio al comprador en US$/kg de verde garantizado: N0 finca →
//               N1 empacado → N2 FCA Bogotá (≈FOB) → N3 CIP aeropuerto (≈CIF) → N4 DDP

import { GRADOS } from "@/lib/grados/definicion";

export const BANDAS = ["Black", "Red", "Blue", "Gold"] as const;
export const BANDAS5 = ["Black", "Red", "Blue", "Gold", "Tyrian"] as const;
export type Banda = (typeof BANDAS)[number];
export type Banda5 = (typeof BANDAS5)[number];
export type Nivel = "FCA" | "CIP" | "DDP";

// V5.82 (conflicto n.º 1 de ALINEACION §1, cerrado en la fase 5 del PLAN_CIRCUITO_DEL_LOTE): los rangos de
// puntaje de cada banda se DERIVAN de `definicion.ts` —la única definición de los grados— en vez de escribirse
// aquí una segunda vez. Hasta la V5.81 esta tabla decía «Red 84,0–85,9» mientras el grado Red era 82–83,99.
// Son rótulos: solo alimentan el campo `rango` de la escalera. Las ediciones YA publicadas conservan sus
// rótulos viejos (una edición publicada es inmutable); por eso `precio.ts` nunca lee `rango`.
const fmtSca = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const RANGOS: Record<Banda5, string> = Object.fromEntries(
  GRADOS.map((g) => [g.nombre, g.scaMax >= 100 ? `≥ ${fmtSca(g.scaMin)}` : `${fmtSca(g.scaMin)}–${fmtSca(g.scaMax)}`])
) as Record<Banda5, string>;

export const SCORE_KEYS = [
  "Sub-índice O&D cafetero", "Clima / ENSO", "BRL/USD", "COP/USD (TRM)",
  "Petróleo / fertilizantes", "Político / comercial", "Posicionamiento especulativo",
] as const;

export const LB = 2.20462;
const PEC_ADD_HIST = 0.027; // sobreprecio de cooperativa histórico como fracción (D2 §9.1)
const SELLO_HIST = 0.03; // prima de sello típica de un lote de 82 puntos (comparador Black)

/** Los parámetros del MODELO: lo que cambia entre franjas con acta (D2 §13.3).
 *  Es exactamente el objeto que guarda `pvc_model_versions.params`. */
export type PvcParams = {
  pec_add: number; prima: number; margen: number; desembolso: number;
  peso_L: number; tope_impulso: number; paso: number; collar: number; aplicar_mod: boolean;
  banda_muerta: number; tope_bajista: number; redondeo: number;
  k: number; lb_excelso: number; lb_pergamino: number;
  mult: Record<Banda, number>; tyrian_umbral: number; tyrian_reparto: number; tyrian_cierre: number;
  min_cargas: Record<Banda5, number>; moq: Record<Banda5, number>;
  retiro_libre: number; cifra_salida: number; antiguedad: number; anticipo: number;
  catacion: number; subsidio: number;
  ref: Record<Banda, number>; flete_mar: number;
  kg_excelso: number; kg_g: number; bolsa: number; excedente_val: number;
  proc: number; palet: number; transp: number; exp: number;
  tarifa_base: number; factor: Record<Banda5, number>; rec: Record<Nivel, number>;
  escalas: [number, number][]; modo_aereo: number; seguro: number; seguro_base: number;
  ddp_iva: boolean; destinos: [string, number, number, number][];
  disp_dias: number; disp_de: number; lead: number; disparador: boolean;
};

/** Las ENTRADAS de una edición: lo que se mide al corte (D1). */
export type PvcEntradas = {
  codigo: string; fecha_corte: string; fecha_pub: string; valid_from: string; valid_to: string;
  fnc: [number, number, number, number, number]; fnc_30d: number; fnc_corte: number;
  fnc_max90: number; fnc_prom180: number;
  c_strip: number; delta: number; trm: number;
  costo: number; escalamiento: number;
  score: Record<string, [number, number]>;
  pvc_anterior: number;
};

export const PARAMS_V211: PvcParams = {
  pec_add: 60000, prima: 0.08, margen: 0.5, desembolso: 0.73,
  peso_L: 0.6, tope_impulso: 0.05, paso: 0.075, collar: 0.15, aplicar_mod: true,
  banda_muerta: 0.05, tope_bajista: 0.15, redondeo: 10000,
  k: 0.967, lb_excelso: 205.2, lb_pergamino: 275.58,
  mult: { Black: 1.15, Red: 1.3, Blue: 1.6, Gold: 2.0 }, tyrian_umbral: 89, tyrian_reparto: 0.8, tyrian_cierre: 2.6,
  min_cargas: { Black: 5, Red: 5, Blue: 3, Gold: 3, Tyrian: 1 }, moq: { Black: 228, Red: 228, Blue: 150, Gold: 60, Tyrian: 30 },
  retiro_libre: 0.25, cifra_salida: 0.075, antiguedad: 0.05, anticipo: 0.6,
  catacion: 200000, subsidio: 0.3,
  ref: { Black: 3.8, Red: 4.3, Blue: 5.6, Gold: 7.4 }, flete_mar: 0.12,
  kg_excelso: 93.09, kg_g: 78, bolsa: 6, excedente_val: 0,
  proc: 0.95, palet: 0.1, transp: 0.2, exp: 0.25,
  tarifa_base: 1.2, factor: { Black: 1.0, Red: 1.1, Blue: 1.25, Gold: 1.5, Tyrian: 2.0 }, rec: { FCA: 0, CIP: 0.35, DDP: 0.9 },
  escalas: [[0, 6.5], [45, 5.2], [100, 4.2], [300, 3.6], [500, 3.2], [1000, 2.9]], modo_aereo: 1.0, seguro: 0.006, seguro_base: 1.1,
  ddp_iva: false,
  destinos: [
    ["Estados Unidos (Miami / Nueva York)", 0.25, 0.4, 0.0],
    ["Países Bajos (Ámsterdam)", 0.3, 0.45, 0.09],
    ["Alemania (Fráncfort)", 0.3, 0.45, 0.07],
  ],
  disp_dias: 10, disp_de: 15, lead: 3, disparador: true,
};

/** La edición PVC-F4-2026 v2.1 (series oficiales FNC y TRM del 4-sep-2026). */
export const ENTRADAS_F4_2026: PvcEntradas = {
  codigo: "PVC-F4-2026", fecha_corte: "2026-09-04", fecha_pub: "2026-09-09", valid_from: "2026-09-15", valid_to: "2026-12-15",
  fnc: [2229900, 2229129.0322580645, 2086866.6666666667, 2244839, 2263548.3870967743],
  fnc_30d: 2252419.35483871, fnc_corte: 2080000, fnc_max90: 2520000, fnc_prom180: 2213674.033149171,
  c_strip: 296.0, delta: 0.3809, trm: 3141.36,
  costo: 1550805, escalamiento: 0.06,
  score: {
    "Sub-índice O&D cafetero": [0.3, 1], "Clima / ENSO": [0.2, 1], "BRL/USD": [0.15, 0], "COP/USD (TRM)": [0.1, -1],
    "Petróleo / fertilizantes": [0.1, 1], "Político / comercial": [0.1, 1], "Posicionamiento especulativo": [0.05, -1],
  },
  pvc_anterior: 0,
};

/* ── serie mensual oficial FNC (promedio mensual, COP/carga FR 94) ────────── */
// Fuente: FNC, «Precios, área y producción de café» (ago-2026). La usa el
// back-proof; el ciclo semanal la extenderá desde `market_anchors`.
export const FNC_MENSUAL: Record<number, (number | null)[]> = {
  2018: [763903, 745031, 729855, 715325, 754210, 746400, 717839, 705065, 686933, 796774, 804283, 727645],
  2019: [727274, 708089, 690581, 680567, 724065, 779917, 796484, 798935, 815450, 819581, 909600, 999129],
  2020: [886161, 909103, 1143194, 1175567, 1068871, 962800, 1001452, 1143968, 1142233, 1052484, 1044700, 1047677],
  2021: [1073194, 1113536, 1156032, 1207433, 1385935, 1420800, 1562742, 1704806, 1712138, 1784935, 1999655, 2116484],
  2022: [2148333, 2213333, 1988774, 2027448, 2096733, 2172233, 2250290, 2315548, 2398967, 2277290, 1990067, 1933032],
  2023: [1838032, 2075286, 1993129, 1978900, 1895968, 1577900, 1318774, 1319097, 1285967, 1379065, 1406448, 1468258],
  2024: [1423000, 1456862, 1440129, 1661933, 1596129, 1817033, 1876387, 1943323, 2120233, 2173290, 2456567, 2764871],
  2025: [2751258, 3118571, 3054452, 3044433, 3012759, 2700567, 2369903, 2758032, 2966133, 2954935, 2889633, 2745226],
  2026: [2627903, 2174143, 2227129, 2229900, 2229129, 2086867, 2244839, 2263548, null, null, null, null],
};
const COSTO_ANUAL: Record<number, number> = { 2019: 700e3, 2020: 745e3, 2021: 860e3, 2022: 1.12e6, 2023: 1.28e6, 2024: 1.35e6, 2025: 1.447e6, 2026: 1.5508e6 };

/* ── 1 · la edición ───────────────────────────────────────────────────────── */
export type PvcEdicion = {
  L: number; impulso: number; P0: number; P: number; ancla: number; pec30: number; min_atr: number;
  costo: number; piso: number; neto: number; modificador: number; mercado: number; bruto: number;
  pvc: number; gob: "piso" | "PEC" | "mercado"; regla: "" | "banda muerta" | "tope bajista"; pec_corte: number;
};

const clip = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function edicion(p: PvcParams, e: PvcEntradas): PvcEdicion {
  const f = e.fnc;
  const L = f.reduce((a, v, i) => a + (i + 1) * v, 0) / 15;
  const impulso = clip(0.5 * (f[4] / f[0] - 1) * 3 / 5, -p.tope_impulso, p.tope_impulso);
  const P0 = (e.c_strip / 100 + e.delta) * p.lb_excelso * p.k * e.trm;
  const P = P0 * (1 + impulso);
  const ancla = p.peso_L * L + (1 - p.peso_L) * P;
  const pec30 = e.fnc_30d + p.pec_add;
  const min_atr = pec30 * (1 + p.prima);
  const costo = e.costo * (1 + e.escalamiento);
  const piso = costo * (1 + p.margen);
  const neto = SCORE_KEYS.reduce((a, k) => a + (e.score[k]?.[0] ?? 0) * (e.score[k]?.[1] ?? 0), 0);
  const modificador = p.aplicar_mod ? clip(p.paso * neto, -p.collar, p.collar) : 0;
  const mercado = ancla * (1 + modificador);
  const bruto = Math.max(piso, min_atr, mercado);
  let aj = bruto;
  let regla: PvcEdicion["regla"] = "";
  if (e.pvc_anterior > 0) {
    if (bruto >= e.pvc_anterior * (1 - p.banda_muerta)) { aj = Math.max(bruto, e.pvc_anterior); if (aj !== bruto) regla = "banda muerta"; }
    else { aj = Math.max(bruto, e.pvc_anterior * (1 - p.tope_bajista)); if (aj !== bruto) regla = "tope bajista"; }
  }
  const pvc = Math.round(aj / p.redondeo) * p.redondeo;
  const gob = piso >= Math.max(min_atr, mercado) ? "piso" : min_atr >= mercado ? "PEC" : "mercado";
  return { L, impulso, P0, P, ancla, pec30, min_atr, costo, piso, neto, modificador, mercado, bruto, pvc, gob, regla, pec_corte: e.fnc_corte + p.pec_add };
}

/* ── 2 · la escalera ──────────────────────────────────────────────────────── */
export type EscalonPvc = { banda: Banda; rango: string; mult: number; cop: number; cop_kg: number; usd_carga: number; finca_lb: number; min_cargas: number; moq: number };

export function escalera(p: PvcParams, pvc: number, trm: number): EscalonPvc[] {
  return BANDAS.map((b) => {
    const cop = pvc * p.mult[b];
    return { banda: b, rango: RANGOS[b], mult: p.mult[b], cop, cop_kg: cop / 125, usd_carga: cop / trm, finca_lb: cop / trm / p.lb_excelso, min_cargas: p.min_cargas[b], moq: p.moq[b] };
  });
}

/* ── 3 · la pila de precios ───────────────────────────────────────────────── */
export type FilaPila = {
  b: Banda5; m: number; copc: number; usd_carga: number;
  n0: number; n1: number; sin: number; tarifa: number; n2: number;
  moq: number; flete: number; seg: number; n3: number; dest: number; n4: number; iva: number;
  n2_lb: number; n3_lb: number; n4_lb: number; escala: string;
  ref: number | null; sobre: number | null; taza: number | null;
  bolsas: number; cargas_moq: number; cubre: boolean;
};

export function fleteKg(p: PvcParams, kg: number): number {
  let t = p.escalas[0][1];
  for (const [m, v] of p.escalas) if (kg >= m) t = v;
  return t * p.modo_aereo;
}
export function escalaDe(p: PvcParams, kg: number): string {
  const e = p.escalas;
  for (let i = 0; i < e.length; i++) {
    if (kg >= e[i][0] && (i + 1 === e.length || kg < e[i + 1][0])) return i + 1 < e.length ? `${e[i][0]}–${e[i + 1][0] - 1} kg` : `≥ ${e[i][0]} kg`;
  }
  return "";
}

export function pila(p: PvcParams, pvc: number, trm: number, destinoIdx = 0, kgG?: number): FilaPila[] {
  const kg_g = kgG ?? p.kg_g;
  const cred = (p.kg_excelso - kg_g) * p.excedente_val / kg_g;
  const d = p.destinos[destinoIdx] ?? p.destinos[0];
  return BANDAS5.map((b) => {
    const m = b === "Tyrian" ? p.tyrian_cierre : p.mult[b];
    const copc = pvc * m;
    const n0 = copc / trm / kg_g - cred;
    const n1 = n0 + p.proc;
    const sin = n1 + p.palet + p.transp + p.exp;
    const tarifa = p.tarifa_base * p.factor[b] + p.rec.FCA;
    const n2 = sin + tarifa;
    const moq = p.moq[b];
    const flete = fleteKg(p, moq);
    const seg = p.seguro * p.seguro_base * (n2 + flete);
    const n3 = n2 + flete + seg + p.rec.CIP;
    const n4b = n3 + d[1] + d[2] + p.rec.DDP;
    const iva = p.ddp_iva ? n4b * d[3] : 0;
    const n4 = n4b + iva;
    const ref = b === "Tyrian" ? null : p.ref[b];
    return {
      b, m, copc, usd_carga: copc / trm, n0, n1, sin, tarifa, n2, moq, flete, seg, n3, dest: d[1] + d[2], n4, iva,
      n2_lb: n2 / LB, n3_lb: n3 / LB, n4_lb: n4 / LB, escala: escalaDe(p, moq),
      ref, sobre: ref ? n2 / LB / ref - 1 : null, taza: ref ? ((n2 / LB - ref) * 12 / 453.592) * 100 : null,
      bolsas: Math.floor(kg_g / p.bolsa), cargas_moq: Math.ceil(moq / kg_g), cubre: p.min_cargas[b] * kg_g >= moq,
    };
  });
}

/* ── 4 · el back-proof ────────────────────────────────────────────────────── */
export type FranjaBackproof = { franja: string; start: [number, number]; pvc: number; precios: number[]; venta: number[]; prima: number; black: number; disp: number; gob: string; piso: number };
export type ResumenBackproof = { n: number; prima_media: number; prima_min: number; negativas: number; black_media: number; black_min: number; black_neg: number; disparos: number; piso: number; pec: number; rows: FranjaBackproof[] };

function precioMensual(y: number, m: number, serie = FNC_MENSUAL): number {
  const v = serie[y]?.[m - 1];
  if (v == null) throw new Error("sin dato");
  return v;
}
function addm(y: number, m: number, k: number): [number, number] {
  m += k; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return [y, m];
}

export function backproof(p: PvcParams, lead = p.lead, trigger = p.disparador, serie = FNC_MENSUAL): ResumenBackproof {
  const rows: FranjaBackproof[] = [];
  let prev: number | null = null;
  for (let y = 2019; y <= 2026; y++) {
    const starts: [number, number][] = [[y - 1, 12], [y, 3], [y, 6], [y, 9]];
    starts.forEach((start, fi) => {
      let lb: number[], venta: number[];
      try {
        lb = [0, 1, 2, 3, 4].map((i) => precioMensual(...addm(start[0], start[1], -lead - 4 + i), serie));
        venta = [0, 1, 2].map((k) => precioMensual(...addm(start[0], start[1], k), serie));
      } catch { return; }
      const L = lb.reduce((a, v, i) => a + (i + 1) * v, 0) / 15;
      const imp = clip(0.5 * (lb[4] / lb[0] - 1) * 3 / 5, -p.tope_impulso, p.tope_impulso);
      const P = lb[4] * (1 + imp);
      const ancla = p.peso_L * L + (1 - p.peso_L) * P;
      const pec = lb[4] * (1 + PEC_ADD_HIST) * (1 + p.prima);
      const piso = COSTO_ANUAL[Math.max(2019, start[0])] * (1 + p.margen);
      const terms = { piso, PEC: pec, mercado: ancla } as const;
      const bruto = Math.max(piso, pec, ancla);
      const gob = (Object.keys(terms) as (keyof typeof terms)[]).reduce((a, k) => (terms[k] > terms[a] ? k : a), "piso" as keyof typeof terms);
      let pvc = bruto;
      if (prev !== null) pvc = bruto >= prev * (1 - p.banda_muerta) ? Math.max(bruto, prev) : Math.max(bruto, prev * (1 - p.tope_bajista));
      pvc = Math.round(pvc / p.redondeo) * p.redondeo;
      let price = pvc, disp = 0;
      const precios: number[] = [];
      for (const fnc of venta) {
        precios.push(price);
        if (trigger && fnc > price) { price = Math.max(price, Math.round((fnc * (1 + PEC_ADD_HIST) * (1 + p.prima)) / p.redondeo) * p.redondeo); disp++; }
      }
      const prima = precios.reduce((a, pr, i) => a + (pr / venta[i] - 1), 0) / 3;
      const black = precios.reduce((a, pr, i) => a + ((pr * p.mult.Black) / (venta[i] * (1 + PEC_ADD_HIST + SELLO_HIST)) - 1), 0) / 3;
      rows.push({ franja: `${y}F${fi + 1}`, start, pvc, precios, venta, prima, black, disp, gob, piso });
      prev = pvc;
    });
  }
  const pr = rows.map((r) => r.prima), pb = rows.map((r) => r.black);
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    n: rows.length, prima_media: mean(pr), prima_min: Math.min(...pr), negativas: pr.filter((x) => x < 0).length,
    black_media: mean(pb), black_min: Math.min(...pb), black_neg: pb.filter((x) => x < 0).length,
    disparos: rows.filter((r) => r.disp).length, piso: rows.filter((r) => r.gob === "piso").length, pec: rows.filter((r) => r.gob === "PEC").length, rows,
  };
}

/* ── 5 · los KPIs y la salida completa de una edición ─────────────────────── */
export type PvcKpis = {
  prima_coop: number; retorno_black: number; sobre_fca_black: number; taza_black: number;
  vs_max90: number; vs_prom180: number; vs_costo: number; usd_carga: number; usd_lb_excelso: number;
};

export type PvcSalida = {
  edicion: PvcEdicion;
  escalera: EscalonPvc[];
  pila: FilaPila[];
  kpis: PvcKpis;
  backproof: Omit<ResumenBackproof, "rows">;
  cifra_salida: number;
};

/** Todo lo que una edición publica, calculado de una vez. Es lo que se guarda
 *  en `pvc_editions.outputs` y lo que expone la vista pública. */
export function calcular(p: PvcParams, e: PvcEntradas, destinoIdx = 0): PvcSalida {
  const ed = edicion(p, e);
  const esc = escalera(p, ed.pvc, e.trm);
  const pi = pila(p, ed.pvc, e.trm, destinoIdx);
  const B = pi[0];
  const { rows: _rows, ...bp } = backproof(p);
  void _rows;
  return {
    edicion: ed,
    escalera: esc,
    pila: pi,
    kpis: {
      prima_coop: ed.pvc / ed.pec_corte - 1,
      retorno_black: (ed.pvc * p.mult.Black) / ed.costo,
      sobre_fca_black: B.sobre ?? 0,
      taza_black: B.taza ?? 0,
      vs_max90: ed.pvc / e.fnc_max90 - 1,
      vs_prom180: ed.pvc / e.fnc_prom180 - 1,
      vs_costo: ed.pvc / ed.costo - 1,
      usd_carga: ed.pvc / e.trm,
      usd_lb_excelso: ed.pvc / e.trm / p.lb_excelso,
    },
    backproof: bp,
    cifra_salida: ed.pvc * p.cifra_salida,
  };
}

/** Huella determinista de (params, entradas): la misma que sella `pvc_editions.hash`. */
export function huella(p: PvcParams, e: PvcEntradas): string {
  const s = JSON.stringify({ p, e });
  let x = 0;
  for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return x.toString(16).padStart(8, "0");
}
