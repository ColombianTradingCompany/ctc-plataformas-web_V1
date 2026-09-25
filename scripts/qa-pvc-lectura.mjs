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
// 2. EL MOQ Y EL EMPAQUE (§9.2 y §14.8). Desde el 2026-09-25 (owner) Black y Red
//    NO se cuentan por productores: su mínimo es el MOQ DE COMPRA (una demanda de
//    al menos tres cargas, leída del §14.8 del plan) y la mezcla es Single Origin
//    o Regional Blend según la composición de sus lotes. Los nombres de la regla
//    vieja (LOTES_EN_MEZCLA, MOQ_MEZCLA, CARGAS_POR_PRODUCTOR, COMPOSICION_MEZCLA)
//    tienen que seguir retirados. El incremento es la mitad del mínimo.
//
// La pestaña EXHIBE estas reglas; todavía no gobiernan precio (los parámetros
// del modelo vigente siguen con la tabla vieja hasta la versión v2.2.0). El
// guardián existe para que las dos copias no se separen en silencio.

import { readFileSync } from "node:fs";
import {
  CARGA_KG_CPS, SACO_KG_CPS, EMPAQUES, MOQ_CARGAS_BLACK_RED, TIPOS_DE_MEZCLA, COMPOSICION_POR_GRADO,
  admiteSaco, desviacionDeMercado, embudoDeCarga, empaqueDe, holguraDisparador,
  incrementoCargas, moqCargas, primaMinima, sobreBasePergamino, verdeFobCop,
} from "../src/lib/pvc/lectura.ts";
import * as lectura from "../src/lib/pvc/lectura.ts";

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

// ── 3 · el MOQ de compra (owner, 2026-09-25: la regla 3–4 se retiró de raíz) ──
const plan14_8 = (lee("docs/PVC_BCP_PLAN.md").match(/### 14\.8[\s\S]*$/) ?? [""])[0];
const moqPlan = Number(plan14_8.match(/una demanda de al menos (\d+) cargas/)?.[1]);
check("el plan (§14.8) fija el MOQ de compra de Black y Red y el código lo lee igual", moqPlan === MOQ_CARGAS_BLACK_RED && moqCargas("Black") === moqPlan && moqCargas("Red") === moqPlan);
check("Black y Red ya no se cuentan por productores: los nombres de la regla vieja se retiraron", ["LOTES_EN_MEZCLA", "MOQ_MEZCLA", "CARGAS_POR_PRODUCTOR", "COMPOSICION_MEZCLA"].every((n) => !(n in lectura)) && moqCargas.length === 1);
check("los dos tipos de mezcla son los del owner y en su orden: Single Origin · Regional Blend", JSON.stringify(TIPOS_DE_MEZCLA) === JSON.stringify(["Single Origin", "Regional Blend"]) && /\*\*Single Origin\*\*/.test(plan14_8) && /\*\*Regional Blend\*\*/.test(plan14_8));
check("Black y Red admiten los dos tipos; Blue, Gold y Tyrian son Single Estate", COMPOSICION_POR_GRADO.Black.tipos === TIPOS_DE_MEZCLA && COMPOSICION_POR_GRADO.Red.tipos === TIPOS_DE_MEZCLA && ["Blue", "Gold", "Tyrian"].every((b) => JSON.stringify(COMPOSICION_POR_GRADO[b].tipos) === JSON.stringify(["Single Estate"])));
check("la mezcla nunca baja de tres cargas (el MOQ de compra)", MOQ_CARGAS_BLACK_RED >= 3);

check("Blue son 2 cargas", moqCargas("Blue") === 2);
check("Gold estándar es 1 carga", moqCargas("Gold") === 1);
check("Gold admite el piso de saco", admiteSaco("Gold"));
check("Tyrian admite el piso de saco", admiteSaco("Tyrian"));
check("Blue NO admite el piso de saco", !admiteSaco("Blue"));
check("Black NO admite el piso de saco", !admiteSaco("Black"));
check("el saco son 70 kg de pergamino", SACO_KG_CPS === 70);

// ── 4 · el incremento es la mitad del mínimo ──────────────────────────────
check("Black y Red → incremento de 1,5 cargas (la mitad de 3)", incrementoCargas(moqCargas("Black")) === 1.5 && incrementoCargas(moqCargas("Red")) === 1.5);
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
check("la pestaña Lectura está en el tab strip", lee("src/components/panel/pvc/PvcTabs.tsx").includes("/ecp/pvc/lectura"));
check("la página lee la edición por su ventana", lee("src/app/ecp/(app)/pvc/lectura/page.tsx").includes("edicionVigente"));
check("la página lee el mercado de market_anchors", lee("src/lib/pvc/servicio.ts").includes("lecturaDeMercado"));

// ── 7 · la doctrina está escrita ──────────────────────────────────────────
const plan = lee("docs/PVC_BCP_PLAN.md");
check("el plan declara los dos estándares de empaque", /GrainPro-type \+ yute/.test(plan));
// La mezcla, tal como la reescribió el owner el 2026-09-25 (§14.8): composición por lote, Single Origin o Regional Blend,
// el mínimo es el MOQ de compra. La regla del 2026-09-19 (3 a 4 productores, una carga cada uno) queda tachada en el §9.2.
check("el plan tiene la cuarta ronda del owner (§14.8) y retira la regla 3–4 de raíz", /### 14\.8 .*composición por lote y MOQ de compra/.test(plan) && /se retira de raíz\*\*/.test(plan14_8));
check("el §9.2 ya no trae viva la tabla «3 → 3 · 4 → 4»", !/\| \*\*3\*\* \| \*\*3 cargas\*\* \|/.test(plan) && /Superado el 2026-09-25/.test(plan));
check("el plan ya NO trae la mezcla de dos lotes", !/\*\*2 lotes\*\* \| \*\*4 cargas\*\*/.test(plan));
check("el plan dice que CTCx asegura un mínimo por temporada desde Adquisición", /asegura un mínimo por temporada desde Adquisición/.test(plan14_8));
check("el §14.4 ya no dice que Black 4 y Red 3 son fijos sin tacharlo", !/(?<!~~)Black 4 y Red 3\s+son fijos/.test(plan));
check("el plan declara el piso de saco", /70 kg de CPS/.test(plan));
check("el plan declara que el incremento es la mitad", /mitad del mínimo/.test(plan));

console.log(`qa-pvc-lectura: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
