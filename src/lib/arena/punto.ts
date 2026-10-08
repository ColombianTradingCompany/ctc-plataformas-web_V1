// ── El Punto de la taza · CVA principal, SCA 2004 por equivalencia (V5.189, owner 2026-10-08) ────────────────────────────────
// Reemplaza la homologación de la V5.92 (`homologacion.ts`: banda k 1–2, intervalo, piso, techo, recata y Tyrian solo nativo —
// `PLAN_CIRCUITO_DEL_LOTE.md` §10.3, ANULADA por el owner el 2026-10-08). Desde esta versión:
//   · El PROTOCOLO PRINCIPAL es el CVA (SCA-104): la planilla abre en CVA y, con las dos llenas («Ambas»), rige el CVA y el total
//     del 2004 catado queda al lado (`comparativo`).
//   · Una planilla SCA 2004 vale LO MISMO que su equivalente CVA (`equivalencia.ts`): su total ES el Punto, sin intervalo.
//   · El grado se lee del Punto con la tríada, igual para los dos protocolos: no hay piso, ni techo, ni recata, ni tope en Gold.
// Las filas de `lot_evaluations` escritas antes guardan la forma vieja del `punto` (jsonb): `puntoDeFila` las lee — un
// «homologado» vale su CVA (la banda se anuló) y un «nativo» de la V5.92 era un SCA 2004 catado, que vale su total.
// Puro: no importa nada del servidor. Lo leen `labEvaluation.ts`, las acciones que escriben `lot_evaluations`, las pantallas y el guardián.

import { gradoDelLote, type Grado } from "@/lib/grados/definicion";
import type { Triada } from "@/lib/pvc/escala";
import { EQUIVALENCIA } from "./equivalencia";
import { PL, type IdiomaDePlanilla } from "./planillaI18n";

export type ProtocoloDeTaza = "cva" | "sca2004";
/** «nativo» = catado en el protocolo principal (CVA); «equivalente» = catado en SCA 2004, que vale lo mismo por la equivalencia. */
export type OrigenDelPunto = "nativo" | "equivalente";

/** El Punto con su procedencia. Es UN valor: el CVA, o el total del 2004 que vale lo mismo. */
export type PuntoSca = {
  valor: number;
  origen: OrigenDelPunto;
  protocoloFuente: ProtocoloDeTaza;
  /** La equivalencia con que vale un 2004 (`EQUIVALENCIA.modelo`); null si es CVA. */
  modelo: string | null;
  /** Con las dos planillas llenas («Ambas»): el total CATADO del otro protocolo, al lado (banco comparativo). */
  comparativo: { protocolo: ProtocoloDeTaza; total: number } | null;
};

/** La rejilla del formulario: los puntajes se expresan en pasos de 0,25. */
export const PASO_PUNTO = 0.25;

/** Decisión 4 del informe del Q-Grader (V5.92): UNA frase de propósito CVA para todas las sesiones de la casa. */
export const CVA_PROPOSITO = "Evaluación de lotes de especialidad para comercialización CTCx";

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Lleva un número a la rejilla de 0,25: al más cercano, hacia abajo o hacia arriba. */
export function alGrid(x: number, modo: "cerca" | "abajo" | "arriba" = "cerca"): number {
  const q = x / PASO_PUNTO;
  const e = 1e-9;
  const n = modo === "abajo" ? Math.floor(q + e) : modo === "arriba" ? Math.ceil(q - e) : Math.round(q);
  return r2(n * PASO_PUNTO);
}

/** El Punto de una planilla CVA (el protocolo principal); `sca2004Catado`, el total del 2004 si se cató también («Ambas»). */
export function puntoCva(total: number, sca2004Catado: number | null = null): PuntoSca {
  return {
    valor: r2(total),
    origen: "nativo",
    protocoloFuente: "cva",
    modelo: null,
    comparativo: sca2004Catado == null ? null : { protocolo: "sca2004", total: r2(sca2004Catado) },
  };
}

/** El Punto de una planilla SCA 2004: su total, que vale lo mismo en CVA. `cvaCatado` solo existe en filas de la V5.92 («Ambas»
 *  con el 2004 como primario); desde la V5.189, con las dos llenas rige el CVA. */
export function puntoSca2004(total: number, cvaCatado: number | null = null): PuntoSca {
  return {
    valor: r2(total),
    origen: "equivalente",
    protocoloFuente: "sca2004",
    modelo: EQUIVALENCIA.modelo,
    comparativo: cvaCatado == null ? null : { protocolo: "cva", total: r2(cvaCatado) },
  };
}

const finito = (v: unknown): number | null => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : null;
};

/** Una fila de `lot_evaluations` (con o sin `punto`) como Punto. Lee la forma nueva y las dos viejas (ver la cabecera); las filas
 *  anteriores a la V5.92 no traen `punto` y son SCA 2004. */
export function puntoDeFila(row: { sca_total: number | string | null; punto?: unknown }): PuntoSca | null {
  const p = row.punto as Record<string, unknown> | null | undefined;
  if (p && typeof p === "object") {
    // V5.92–V5.188: «homologado» desde CVA → la banda se anuló: vale su CVA.
    if (p.origen === "homologado") {
      const cva = finito(p.cvaTotal);
      if (cva != null) return puntoCva(cva);
    }
    const valor = finito(p.valor) ?? finito(p.bajo);
    if (valor != null) {
      if (p.protocoloFuente === "cva") {
        const c = p.comparativo as { total?: unknown } | null | undefined;
        return puntoCva(valor, finito(c?.total));
      }
      // Un 2004: el «nativo» de la V5.92 (con su CVA al lado si se cató en las dos) o el «equivalente» de la V5.189.
      const c = p.comparativo as { total?: unknown } | null | undefined;
      return puntoSca2004(valor, finito(c?.total) ?? finito(p.cvaTotal));
    }
  }
  const n = finito(row.sca_total);
  return n != null ? puntoSca2004(n) : null;
}

/** El total CVA de la evaluación (`lot_evaluations.cva_total`): el Punto si se cató en CVA; el comparativo si es un 2004 de la
 *  V5.92 con su CVA al lado; null si no hubo CVA. */
export function cvaDelPunto(p: PuntoSca): number | null {
  if (p.protocoloFuente === "cva") return p.valor;
  return p.comparativo?.protocolo === "cva" ? p.comparativo.total : null;
}

export type DecisionDePunto = { tipo: "galardon"; grado: Grado } | { tipo: "sin_grado" };

/** Lo que el Punto y la Tríada deciden (los puntos mandan; V5.160: sin tríada no hay grado — `triadaDeLaFicha` la deriva de la
 *  Ficha del lote). Igual para un CVA y para un 2004: valen lo mismo. */
export function decidirPorPunto(p: PuntoSca, triada: Triada, ajusteCtcx: number = 0): DecisionDePunto {
  const grado = gradoDelLote(p.valor, triada, ajusteCtcx).grado;
  return grado ? { tipo: "galardon", grado } : { tipo: "sin_grado" };
}

const f2 = (n: number) => n.toFixed(2);

/** El rótulo que enseñan todas las pantallas: el protocolo con que se cató y, si es un 2004, que vale lo mismo en CVA.
 *  V5.130: `lang` es el idioma de la planilla del Q-Grader; las notas, la auditoría y las consolas lo piden en español. */
export function rotuloDelPunto(p: PuntoSca, lang: IdiomaDePlanilla = "es"): string {
  const t = PL[lang];
  const base = p.protocoloFuente === "cva" ? t.puntoCva(f2(p.valor)) : t.puntoSca2004(f2(p.valor));
  return p.comparativo ? `${base}${t.puntoComparativo(p.comparativo.protocolo === "cva" ? "CVA" : "SCA 2004", f2(p.comparativo.total))}` : base;
}
