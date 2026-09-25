// ── El Punto homologado · SCA 2004 ↔ CVA (V5.92, owner 2026-09-25) ────────────────────────────
// El informe del Q-Grader («CTCx · Homologación SCA 2004 ↔ CVA», 2026-09-25; copia en `reference/homologacion-sca-cva-2026-09-25/`,
// fuera del repo; transcrito en `docs/PLAN_CIRCUITO_DEL_LOTE.md` §10) y lo que el owner fijó al leerlo:
//   · El PROTOCOLO PRIMARIO es el SCA 2004 NATIVO: es la evaluación que se busca por defecto y la que calibra la escala de grados.
//   · Un puntaje CVA no es un Punto: se HOMOLOGA (por lo general baja) de forma metódica y determinista, con un intervalo, y el
//     grado firme se calcula sobre el PISO (R4). Tyrian nunca sale de un Punto homologado (R6). Lo nativo manda (R2).
//   · Mientras no haya calibración (≥ 30 lotes catados en las dos escalas), la banda es la heurística cualitativa del SCA:
//     SCA ≈ 79 + (CVA − 79) / k, con k entre 1 y 2 — ancha a propósito: empuja las decisiones al límite a una recata nativa.
// Puro: no importa nada del servidor. Lo leen `labEvaluation.ts`, las acciones que escriben `lot_evaluations` y el guardián.

import { GRADO_POR_ID, SCA_MINIMO, gradoPorPuntaje, type Grado } from "@/lib/grados/definicion";

export type ProtocoloDeTaza = "sca2004" | "cva";
export type OrigenDelPunto = "nativo" | "homologado";

/** El Punto con su procedencia. `bajo === alto === valor` cuando es nativo. */
export type PuntoSca = {
  valor: number;
  bajo: number;
  alto: number;
  origen: OrigenDelPunto;
  protocoloFuente: ProtocoloDeTaza;
  /** El modelo de homologación que produjo el intervalo (`banda-k1-2` sin calibrar); null si es nativo. */
  modelo: string | null;
  /** El total CVA registrado: el que se homologó, o el que acompaña a un SCA nativo (evaluación dual = banco comparativo). */
  cvaTotal: number | null;
};

/** La rejilla del formulario: los puntajes se expresan en pasos de 0,25. */
export const PASO_PUNTO = 0.25;

/** La banda sin calibrar (informe §6, «Before calibration data exist»). */
export const BANDA_SIN_CALIBRAR = { modelo: "banda-k1-2", pivote: 79, kMin: 1, kMax: 2, kValor: 1.5 } as const;

/** Decisión 4 del informe: UNA frase de propósito CVA para todas las sesiones de la casa (los afectivos solo se comparan dentro de un propósito). */
export const CVA_PROPOSITO = "Evaluación de lotes de especialidad para comercialización CTCx";

/** Cuántos lotes catados en las dos escalas hacen falta antes de estrechar la banda (decisión 5). */
export const LOTES_PARA_CALIBRAR = 30;

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Lleva un número a la rejilla de 0,25: al más cercano, hacia abajo o hacia arriba (los bordes de un intervalo se redondean hacia afuera). */
export function alGrid(x: number, modo: "cerca" | "abajo" | "arriba" = "cerca"): number {
  const q = x / PASO_PUNTO;
  const e = 1e-9;
  const n = modo === "abajo" ? Math.floor(q + e) : modo === "arriba" ? Math.ceil(q - e) : Math.round(q);
  return r2(n * PASO_PUNTO);
}

/** SCA ≈ pivote + (CVA − pivote) / k. */
const scaConK = (cva: number, k: number) => BANDA_SIN_CALIBRAR.pivote + (cva - BANDA_SIN_CALIBRAR.pivote) / k;

/** Homologa un total CVA a un intervalo en unidades SCA 2004 (determinista; los bordes hacia afuera, el valor al más cercano). */
export function homologarCva(cvaTotal: number): { valor: number; bajo: number; alto: number; modelo: string } {
  const a = scaConK(cvaTotal, BANDA_SIN_CALIBRAR.kMin);
  const b = scaConK(cvaTotal, BANDA_SIN_CALIBRAR.kMax);
  return {
    valor: alGrid(scaConK(cvaTotal, BANDA_SIN_CALIBRAR.kValor), "cerca"),
    bajo: alGrid(Math.min(a, b), "abajo"),
    alto: alGrid(Math.max(a, b), "arriba"),
    modelo: BANDA_SIN_CALIBRAR.modelo,
  };
}

export function puntoNativo(sca: number, cvaTotal: number | null = null): PuntoSca {
  const v = r2(sca);
  return { valor: v, bajo: v, alto: v, origen: "nativo", protocoloFuente: "sca2004", modelo: null, cvaTotal };
}

export function puntoHomologado(cvaTotal: number): PuntoSca {
  const h = homologarCva(cvaTotal);
  return { valor: h.valor, bajo: h.bajo, alto: h.alto, origen: "homologado", protocoloFuente: "cva", modelo: h.modelo, cvaTotal: r2(cvaTotal) };
}

/** Una fila de `lot_evaluations` (con o sin `punto`) como Punto: las filas anteriores a la V5.92 son nativas por definición. */
export function puntoDeFila(row: { sca_total: number | string | null; punto?: unknown }): PuntoSca | null {
  const p = row.punto as Partial<PuntoSca> | null | undefined;
  if (p && typeof p === "object" && Number.isFinite(Number(p.bajo)) && Number.isFinite(Number(p.alto)) && (p.origen === "nativo" || p.origen === "homologado")) {
    return {
      valor: r2(Number(p.valor ?? p.bajo)),
      bajo: r2(Number(p.bajo)),
      alto: r2(Number(p.alto)),
      origen: p.origen,
      protocoloFuente: p.protocoloFuente === "cva" ? "cva" : "sca2004",
      modelo: p.modelo ?? null,
      cvaTotal: p.cvaTotal == null ? null : r2(Number(p.cvaTotal)),
    };
  }
  if (row.sca_total == null) return null;
  const n = Number(row.sca_total);
  return Number.isFinite(n) ? puntoNativo(n) : null;
}

/** R6: Tyrian exige un Punto NATIVO. */
export function admiteTyrian(p: PuntoSca): boolean {
  return p.origen === "nativo" && p.valor >= GRADO_POR_ID.tyrian.scaMin;
}

/** El grado FIRME: se lee del piso; un homologado que caiga en Tyrian queda en Gold (R4 + R6). Null si el piso no llega a Black. */
export function gradoFirme(p: PuntoSca): Grado | null {
  const g = gradoPorPuntaje(p.bajo);
  if (!g) return null;
  if (g.id === "tyrian" && !admiteTyrian(p)) return GRADO_POR_ID.gold;
  return g;
}

/** El TECHO: el grado que daría el borde alto del intervalo (informativo: «hasta X con recata SCA»). Null si es nativo o no sube. */
export function techoDelPunto(p: PuntoSca): Grado | null {
  if (p.origen === "nativo") return null;
  const alto = gradoPorPuntaje(p.alto);
  const firme = gradoFirme(p);
  if (!alto || (firme && alto.id === firme.id)) return null;
  return alto;
}

export type DecisionDePunto =
  | { tipo: "galardon"; grado: Grado; techo: Grado | null }
  | { tipo: "sin_grado" }
  /** R5: el intervalo homologado cruza los 80 — ni galardón ni rechazo: recata SCA nativa. */
  | { tipo: "pendiente_recata" };

/** Lo que el Punto decide por sí solo (el puntaje manda): galardón con grado firme, sin grado, o pendiente de recata. */
export function decidirPorPunto(p: PuntoSca): DecisionDePunto {
  const firme = gradoFirme(p);
  if (firme) return { tipo: "galardon", grado: firme, techo: techoDelPunto(p) };
  if (p.origen === "homologado" && p.alto >= SCA_MINIMO) return { tipo: "pendiente_recata" };
  return { tipo: "sin_grado" };
}

const f2 = (n: number) => n.toFixed(2);

/** El rótulo que enseñan todas las pantallas: nunca un homologado se lee como un SCA catado. */
export function rotuloDelPunto(p: PuntoSca): string {
  if (p.origen === "nativo") return `SCA 2004 nativo ${f2(p.valor)}${p.cvaTotal != null ? ` · CVA ${f2(p.cvaTotal)} registrado (banco comparativo)` : ""}`;
  return `Punto homologado desde CVA ${p.cvaTotal != null ? f2(p.cvaTotal) : "—"}: ${f2(p.bajo)}–${f2(p.alto)} (rige el piso ${f2(p.bajo)}; ${p.modelo ?? BANDA_SIN_CALIBRAR.modelo}, sin calibrar; no catado en SCA)`;
}
