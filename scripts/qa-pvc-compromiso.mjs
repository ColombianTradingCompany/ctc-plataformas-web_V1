// Guardián de la oportunidad Cherry Picked: escalera de desbloqueo y penalización (V5.47).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-compromiso.mjs
//
// LO QUE PROTEGE. Un contrato que el productor firma. Si la aritmética se mueve,
// el número que se le enseñó antes de firmar deja de ser el que se le cobra — y
// eso no es un bug de pantalla, es una promesa rota.
//
// La REFERENCIA no la inventa este archivo: es la tabla de ejemplo del documento
// del CEO del 2026-09-16 (docs/PVC_BCP_PLAN.md §12.9) — 8 cargas de Red, PVC
// $2.500.000, retirando todo en cada mes, a 3 %, 4 % y 8 %. Si el módulo deja de
// reproducirla EXACTA, algo cambió la regla.
//
// Tres reglas fáciles de romper:
//   · los tramos son CUARTOS acumulados (25 % → 50 %), no mitades — cambió ese día;
//   · el tramo libre es ACUMULADO: en el mes 3 está libre la mitad, no un cuarto;
//   · la penalización es el 4 %, la mitad del 8 % de params.prima.

import {
  MESES_DEL_PERIODO, PENALIZACION, TRAMO_LIBRE_ACUMULADO, cargasLibres, cargasPenalizadas,
  penalizacion, tablaDeSalida, tramoLibre, valorPorCarga,
} from "../src/lib/pvc/compromiso.ts";
import { PARAMS_V211 } from "../src/lib/pvc/motor.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const CARGAS = 8, PVC = 2_500_000, RED = 1.3;

// ── 1 · la tabla del documento, EXACTA ────────────────────────────────────
const DOC = {
  0.03: [780_000, 585_000, 390_000],
  0.04: [1_040_000, 780_000, 520_000],
  0.08: [2_080_000, 1_560_000, 1_040_000],
};
for (const [pct, esperado] of Object.entries(DOC)) {
  const t = tablaDeSalida(CARGAS, PVC, RED, Number(pct));
  esperado.forEach((monto, i) => {
    check(`${Number(pct) * 100} %, mes ${i + 1} = $${monto.toLocaleString("es-CO")}`, Math.round(t[i].monto) === monto);
  });
}
check("cargas penalizadas por mes: 8 · 6 · 4", JSON.stringify(tablaDeSalida(CARGAS, PVC, RED).map((r) => r.penalizadas)) === JSON.stringify([8, 6, 4]));

// ── 2 · por carga ─────────────────────────────────────────────────────────
check("una carga de Red vale $3.250.000", valorPorCarga(PVC, RED) === 3_250_000);
check("por carga al 3 % = $97.500", valorPorCarga(PVC, RED) * 0.03 === 97_500);
check("por carga al 4 % = $130.000", valorPorCarga(PVC, RED) * 0.04 === 130_000);
check("por carga al 8 % = $260.000", valorPorCarga(PVC, RED) * 0.08 === 260_000);
check("lo comprometido suma $26.000.000", CARGAS * valorPorCarga(PVC, RED) === 26_000_000);

// ── 3 · la decisión: 4 %, la mitad de la prima ────────────────────────────
check("la penalización decidida es el 4 %", PENALIZACION === 0.04);
check("y es la mitad de params.prima", PENALIZACION === PARAMS_V211.prima / 2);

// ── 4 · la escalera: cuartos acumulados ───────────────────────────────────
check("el periodo son tres meses", MESES_DEL_PERIODO === 3);
check("mes 1: nada libre", tramoLibre(1) === 0);
check("mes 2: un cuarto libre", tramoLibre(2) === 0.25);
check("mes 3: la mitad libre (ACUMULADO, no un cuarto)", tramoLibre(3) === 0.5);
check("los tramos son cuartos, no mitades", TRAMO_LIBRE_ACUMULADO[2] === 0.25 && TRAMO_LIBRE_ACUMULADO[3] - TRAMO_LIBRE_ACUMULADO[2] === 0.25);
check("nunca se libera más de la mitad", Object.values(TRAMO_LIBRE_ACUMULADO).every((v) => v <= 0.5));
check("un mes inválido no libera nada", tramoLibre(0) === 0 && tramoLibre(1.5) === 0);
check("más allá del mes 3 se queda en la mitad", tramoLibre(4) === 0.5);

// ── 5 · las propiedades que sostienen el trato ────────────────────────────
check("quien cumple desarma la mitad en el mes 3 sin costo",
  penalizacion(CARGAS, cargasLibres(CARGAS, 3), 3, PVC, RED) === 0);
check("quien se va de golpe en el mes 1 paga sobre TODO",
  cargasPenalizadas(CARGAS, CARGAS, 1) === CARGAS);
check("retirar dentro del tramo libre no cuesta nada",
  penalizacion(CARGAS, 2, 2, PVC, RED) === 0);
check("retirar menos nunca cuesta más que retirar más", (() => {
  for (let mes = 1; mes <= 3; mes++) {
    let prev = -1;
    for (let r = 0; r <= CARGAS; r++) {
      const p = penalizacion(CARGAS, r, mes, PVC, RED);
      if (p < prev) return false;
      prev = p;
    }
  }
  return true;
})());
check("la escalera premia esperar: el costo de salir baja mes a mes", (() => {
  const t = tablaDeSalida(CARGAS, PVC, RED);
  return t[0].monto > t[1].monto && t[1].monto > t[2].monto;
})());
check("las cargas penalizadas nunca son negativas", cargasPenalizadas(CARGAS, 1, 3) === 0);

console.log(`qa-pvc-compromiso: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
