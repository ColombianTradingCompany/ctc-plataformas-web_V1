// Guardián de la pestaña Lectura del Modelo Económico (V5.44).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-lectura.mjs
//
// LO QUE PROTEGE. Dos cosas distintas que comparten archivo:
//
// 1. LAS TRES CIFRAS (docs/PVC_BCP_PLAN.md §11.5). Son reglas de negocio, no
//    presentación: la prima mínima es el escalón Black contra el FNC del día,
//    no contra el PVC ni contra el promedio; el sobreprecio va por carga de
//    125 kg; el verde FOB sale de `n2` (FCA Bogotá), no de `n0` ni de `n1`.
//    Si alguien «arregla» una de las tres, el número que el owner enseña en una
//    finca cambia sin que nadie avise.
//
// 2. EL MOQ Y EL EMPAQUE (§9.2, addendum del owner del 2026-09-16). Black y Red
//    son mezclas y su mínimo sale de cuántos lotes las componen — una regla que
//    no se adivina leyendo el código y que es fácil de aplanar a «4 cargas
//    siempre». El incremento es la mitad del mínimo. Una mezcla de cinco no
//    existe.
//
// La pestaña EXHIBE estas reglas; todavía no gobiernan precio (los parámetros
// del modelo vigente siguen con la tabla vieja hasta la versión v2.2.0). El
// guardián existe para que las dos copias no se separen en silencio.

import { readFileSync } from "node:fs";
import {
  CARGA_KG_CPS, SACO_KG_CPS, EMPAQUES, LOTES_EN_MEZCLA, MOQ_MEZCLA,
  admiteSaco, desviacionDeMercado, embudoDeCarga, empaqueDe, holguraDisparador,
  incrementoCargas, moqCargas, primaMinima, sobreBasePergamino, verdeFobCop,
} from "../src/lib/pvc/lectura.ts";

const raiz = new URL("../", import.meta.url);
const lee = (r) => readFileSync(new URL(r, raiz), "utf8");

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const close = (a, b, tol = 1e-9) => a != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ── 1 · las tres cifras, con los números reales del 2026-09-16 ─────────────
// PVC-F4-2026 = 2.500.000; Black ×1,15; FNC del 15-sep = 2.045.000; TRM 3141,36.
const PVC = 2_500_000, MULT_BLACK = 1.15, FNC = 2_045_000, TRM = 3141.36;

check("prima mínima: Black contra el FNC del día", close(primaMinima(PVC, MULT_BLACK, FNC), (PVC * MULT_BLACK - FNC) / FNC));
check("prima mínima da +40,6 % con los datos de hoy", close(primaMinima(PVC, MULT_BLACK, FNC), 0.4058679706601467, 1e-9));
check("prima mínima NO se mide contra el PVC pelado", !close(primaMinima(PVC, MULT_BLACK, FNC), PVC / FNC - 1));
check("prima mínima sin FNC devuelve null", primaMinima(PVC, MULT_BLACK, 0) === null);

check("sobre base pergamino son pesos por carga", close(sobreBasePergamino(PVC, MULT_BLACK, FNC), 830_000));
check("la carga son 125 kg de pergamino", CARGA_KG_CPS === 125);

// n2 de Black en la edición vigente (paridad.json): 14,433444864318114 US$/kg.
check("verde FOB sale de n2 y la TRM", close(verdeFobCop(14.433444864318114, TRM), 14.433444864318114 * TRM));
check("verde FOB da 45.341 COP/kg", Math.round(verdeFobCop(14.433444864318114, TRM)) === 45341);

check("desviación de mercado compara contra la entrada de la edición", close(desviacionDeMercado(FNC, 2_252_419.35483871), FNC / 2_252_419.35483871 - 1));
check("desviación sin base devuelve null", desviacionDeMercado(FNC, 0) === null);
check("holgura del disparador es cuánto le falta al FNC para tocar el PVC", close(holguraDisparador(PVC, FNC), PVC / FNC - 1));

// ── 2 · el empaque: dos estándares, no cinco ──────────────────────────────
check("hay exactamente dos estándares de empaque", EMPAQUES.length === 2);
const vacio = empaqueDe("Blue"), grain = empaqueDe("Black");
check("Blue va en vacío", vacio.id === "vacio");
check("Gold va en vacío", empaqueDe("Gold").id === "vacio");
check("Tyrian va en vacío", empaqueDe("Tyrian").id === "vacio");
check("Black va en GrainPro + yute", grain.id === "grainpro");
check("Red va en GrainPro + yute", empaqueDe("Red").id === "grainpro");
check("el vacío admite 3, 6 y 12 kg", JSON.stringify(vacio.formatosKg) === JSON.stringify([3, 6, 12]));
check("el GrainPro es de 35 kg", JSON.stringify(grain.formatosKg) === JSON.stringify([35]));
check("Black y Red YA NO van en bolsa de 6 kg", !grain.formatosKg.includes(6));

// ── 3 · el MOQ de las mezclas ─────────────────────────────────────────────
check("mezcla de 2 lotes → 4 cargas", moqCargas("Black", 2) === 4);
check("mezcla de 3 lotes → 3 cargas", moqCargas("Black", 3) === 3);
check("mezcla de 4 lotes → 4 cargas", moqCargas("Black", 4) === 4);
check("Red sigue la misma regla que Black", [2, 3, 4].every((n) => moqCargas("Red", n) === moqCargas("Black", n)));
check("una mezcla de cinco no existe", !LOTES_EN_MEZCLA.includes(5) && MOQ_MEZCLA[5] === undefined);
check("cada lote de la mezcla aporta al menos una carga", LOTES_EN_MEZCLA.every((n) => MOQ_MEZCLA[n] / n >= 1));
check("la mezcla nunca baja de tres cargas", LOTES_EN_MEZCLA.every((n) => MOQ_MEZCLA[n] >= 3));

check("Blue son 2 cargas", moqCargas("Blue") === 2);
check("Gold estándar es 1 carga", moqCargas("Gold") === 1);
check("Gold admite el piso de saco", admiteSaco("Gold"));
check("Tyrian admite el piso de saco", admiteSaco("Tyrian"));
check("Blue NO admite el piso de saco", !admiteSaco("Blue"));
check("Black NO admite el piso de saco", !admiteSaco("Black"));
check("el saco son 70 kg de pergamino", SACO_KG_CPS === 70);

// ── 4 · el incremento es la mitad del mínimo ──────────────────────────────
check("mezcla de 4 → incremento de 2 cargas", incrementoCargas(moqCargas("Black", 4)) === 2);
check("mezcla de 3 → incremento de 1,5 cargas", incrementoCargas(moqCargas("Black", 3)) === 1.5);
check("Blue → incremento de 1 carga", incrementoCargas(moqCargas("Blue")) === 1);
check("Gold → incremento de media carga", incrementoCargas(moqCargas("Gold")) === 0.5);

// ── 5 · el embudo de una carga ────────────────────────────────────────────
const pasos = embudoDeCarga(93.09, 78, 35);
check("el embudo tiene cuatro escalones", pasos.length === 4);
check("empieza en una carga de pergamino", pasos[0].kg === CARGA_KG_CPS);
check("el embudo solo decrece", pasos.every((p, i) => i === 0 || p.kg <= pasos[i - 1].kg));
check("el excelso sale del factor de rendimiento", close(pasos[1].kg, 93.09));
check("el verde garantizado es el kg_g del modelo", pasos[2].kg === 78);
check("el empaque de 35 kg cabe dos veces en 78", pasos[3].kg === 70);

// ── 6 · la pantalla usa las funciones, no fórmulas sueltas ────────────────
const board = lee("src/components/panel/pvc/LecturaBoard.tsx");
for (const f of ["primaMinima", "sobreBasePergamino", "verdeFobCop", "moqCargas", "incrementoCargas", "empaqueDe", "embudoDeCarga"]) {
  check(`LecturaBoard usa ${f}`, board.includes(f));
}
check("LecturaBoard dice que el precio NO se recalcula", /no lo\s*\n?\s*recalcula|no recalcula/.test(board));
check("la pestaña Lectura está en el tab strip", lee("src/components/panel/pvc/PvcTabs.tsx").includes("/bcp/pvc/lectura"));
check("la página lee la edición por su ventana", lee("src/app/bcp/(app)/pvc/lectura/page.tsx").includes("edicionVigente"));
check("la página lee el mercado de market_anchors", lee("src/lib/pvc/servicio.ts").includes("lecturaDeMercado"));

// ── 7 · la doctrina está escrita ──────────────────────────────────────────
const plan = lee("docs/PVC_BCP_PLAN.md");
check("el plan declara los dos estándares de empaque", /GrainPro-type \+ yute/.test(plan));
check("el plan declara la regla de la mezcla", /3 lotes\*{0,2} \| \*{0,2}3 cargas/.test(plan));
check("el plan declara el piso de saco", /70 kg de CPS/.test(plan));
check("el plan declara que el incremento es la mitad", /mitad del mínimo/.test(plan));

console.log(`qa-pvc-lectura: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
