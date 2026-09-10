// Guardián del motor PVC: paridad con el motor Python de referencia.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-motor.mjs
//
// `src/lib/pvc/paridad.json` son cifras exportadas de `pvc_model_v2.py`
// (reference_internal_apps/PVC - Modelo/v2.0, vals.json) para la edición
// PVC-F4-2026 v2.1.1. Si este archivo y el motor Python se separan, el número
// que publica la plataforma y el del dossier dejan de ser el mismo — que es
// exactamente lo que el módulo existe para impedir.

import { readFileSync } from "node:fs";
import { PARAMS_V211, ENTRADAS_F4_2026, calcular, huella } from "../src/lib/pvc/motor.ts";

const ref = JSON.parse(readFileSync(new URL("../src/lib/pvc/paridad.json", import.meta.url), "utf8"));
const out = calcular(PARAMS_V211, ENTRADAS_F4_2026);

let ok = 0;
const fallos = [];
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));

check("PVC", out.edicion.pvc === ref.pvc);
for (const k of ["L", "P", "ancla", "pec30", "piso", "modificador", "mercado"]) {
  const mine = k === "min_atractivo" ? out.edicion.min_atr : out.edicion[k];
  check(`edición.${k}`, close(mine, ref[k]));
}
check("edición.min_atractivo", close(out.edicion.min_atr, ref.min_atractivo));
check("gobierna", out.edicion.gob === ref.gobierna);
for (const e of out.escalera) check(`escalera.${e.banda}`, close(e.cop, ref.escalera[e.banda]));
for (const f of out.pila) {
  for (const k of ["n0", "n2", "n3", "n4", "n2_lb"]) check(`pila.${f.b}.${k}`, close(f[k], ref.pila[f.b][k]));
}
// La serie mensual embebida en motor.ts va redondeada a pesos enteros (la del
// motor Python conserva los decimales del promedio): las primas del back-proof
// se comparan a 1e-4, que absorbe ese redondeo y sigue detectando cualquier
// cambio de regla (un mes de anticipación de más mueve la prima media en 1e-2).
for (const k of ["n", "prima_media", "prima_min", "negativas", "disparos", "piso", "pec", "black_min"]) check(`backproof.${k}`, close(out.backproof[k], ref.backproof[k], 1e-4));
check("la huella es determinista", huella(PARAMS_V211, ENTRADAS_F4_2026) === huella(PARAMS_V211, ENTRADAS_F4_2026));
check("y cambia con una entrada", huella(PARAMS_V211, ENTRADAS_F4_2026) !== huella(PARAMS_V211, { ...ENTRADAS_F4_2026, trm: 3200 }));

console.log(`qa-pvc-motor: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
