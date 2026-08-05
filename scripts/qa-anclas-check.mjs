// ── Guardián del lector de precio FNC ────────────────────────────────────────
//   node --experimental-strip-types scripts/qa-anclas-check.mjs
//
// El parseo es la pieza que puede fallar EN SILENCIO: si la Federación cambia el
// formato de su página y el lector devuelve un número que no es el precio, el
// cron lo anota igual y la calculadora cotiza con él. Por eso el lector prefiere
// devolver null antes que adivinar, y por eso esto lo comprueba.

import { parseFncPrice } from "../src/lib/anclas/parseFnc.ts";

let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

// ── Lo que debe reconocer ───────────────────────────────────────────────────
check("precio por carga con separador de miles",
  parseFncPrice("<p>Precio interno de referencia por carga de 125 kg: $2.210.000</p>") === 2210000);
check("sin el signo de pesos",
  parseFncPrice("<div>Carga de 125 kg 2.150.000 COP</div>") === 2150000);
check("con etiquetas y entidades de por medio",
  parseFncPrice("<td>Carga</td>&nbsp;<td><b>$1.980.500</b></td>") === 1980500, `${parseFncPrice("<td>Carga</td>&nbsp;<td><b>$1.980.500</b></td>")}`);
check("elige el mayor cuando hay varios cerca de «carga»",
  parseFncPrice("<p>carga: $2.100.000 y también $2.300.000 por carga</p>") === 2300000);

// ── Lo que NO debe tragarse ─────────────────────────────────────────────────
check("ignora el precio por libra", parseFncPrice("<p>Precio por libra: $9.500</p>") === null);
check("ignora cifras lejos de «carga»",
  parseFncPrice("<p>Visitas al sitio: 2.500.000 este año</p>") === null, "no menciona carga");
check("descarta lo que está fuera de rango por abajo",
  parseFncPrice("<p>carga $850.000</p>") === null);
check("descarta lo que está fuera de rango por arriba",
  parseFncPrice("<p>carga $9.900.000</p>") === null);
check("html vacío", parseFncPrice("") === null);
check("null de entrada no revienta", parseFncPrice(null) === null);
check("página sin precios", parseFncPrice("<html><body><h1>Estadísticas cafeteras</h1></body></html>") === null);

// ── Lo que ignora del ruido de la página ────────────────────────────────────
check("no confunde el contenido de un <script>",
  parseFncPrice("<script>var carga = 3.900.000;</script><p>Sin datos</p>") === null,
  "el script se borra antes de mirar");
check("no confunde el contenido de un <style>",
  parseFncPrice("<style>.carga{width:2.400.000px}</style><p>Sin datos</p>") === null);

console.log(`\nAnclas · lector FNC · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) {
  console.log("\nFALLAN:");
  for (const f of fails) console.log("  ·", f);
  process.exit(1);
}
console.log("El lector prefiere null antes que adivinar.\n");
