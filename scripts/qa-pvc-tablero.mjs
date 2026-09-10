// Guardián del tablero PVC: el modelo del HTML da las mismas cifras que el motor.
//
//   node scripts/qa-pvc-tablero.mjs
//
// El tablero (docs/pvc/tablero/PVC_Tablero.html) lleva su propia copia del
// modelo en JavaScript — es un archivo autocontenido a propósito, funciona
// abierto como fichero y embebido en /bcp/pvc/tablero. Cuatro implementaciones
// (Python de referencia, Excel, motor.ts y este HTML) son cuatro sitios donde
// una regla puede separarse: aquí se recorta el tramo entre los marcadores
// @@MODELO_INICIO / @@MODELO_FIN, se evalúa sin DOM y se compara con
// paridad.json, la misma referencia que usa qa-pvc-motor.

import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/pvc/tablero/PVC_Tablero.html", import.meta.url), "utf8");
const ref = JSON.parse(readFileSync(new URL("../src/lib/pvc/paridad.json", import.meta.url), "utf8"));
const a = html.indexOf("/* @@MODELO_INICIO"), b = html.indexOf("/* @@MODELO_FIN */");
if (a < 0 || b < 0) { console.log("qa-pvc-tablero: faltan los marcadores @@MODELO en el HTML"); process.exit(1); }
const modelo = new Function("window", html.slice(a, b) + "\nreturn { DEFAULT, edicion, pila, backproof, MODEL_VERSION };")(undefined);

let ok = 0;
const fallos = [];
const close = (x, y, tol = 1e-6) => Math.abs(x - y) <= tol * Math.max(1, Math.abs(y));
const check = (n, c) => (c ? ok++ : fallos.push(n));

const S = JSON.parse(JSON.stringify(modelo.DEFAULT));
const E = modelo.edicion(S), PI = modelo.pila(S, E.pvc), BP = modelo.backproof(S, S.lead, S.disparador);
check("PVC", E.pvc === ref.pvc);
for (const k of ["L", "P", "ancla", "pec30", "piso", "modificador", "mercado"]) check(`edición.${k}`, close(E[k], ref[k]));
check("edición.min_atractivo", close(E.min_atr, ref.min_atractivo));
check("gobierna", E.gob === ref.gobierna);
for (const f of PI) for (const k of ["n0", "n2", "n3", "n4", "n2_lb"]) check(`pila.${f.b}.${k}`, close(f[k], ref.pila[f.b][k]));
for (const k of ["n", "prima_media", "prima_min", "negativas", "disparos", "piso", "pec", "black_min"]) {
  const v = k === "negativas" ? BP.neg : k === "black_min" ? BP.black_min : BP[k];
  check(`backproof.${k}`, close(v, ref.backproof[k], 1e-4));
}
check("la versión del modelo del tablero es la del dossier", modelo.MODEL_VERSION === "v2.1.1");

console.log(`qa-pvc-tablero: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
