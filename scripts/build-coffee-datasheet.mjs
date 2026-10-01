// ── Los catálogos de CTCx Coffee Datasheet Tool, SACADOS de sus fuentes únicas (V5.132) ──────────────────────────────
//
//   node --experimental-strip-types scripts/build-coffee-datasheet.mjs            escribe el bloque en la herramienta
//   node --experimental-strip-types scripts/build-coffee-datasheet.mjs --check    no escribe: sale con 1 si no coincide
//
// La herramienta (`public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html`) es un HTML autocontenido: funciona
// suelta y sin internet, así que no puede importar nada. Pero lo que enseña YA tiene dueño en el repo, y una tercera
// copia escrita a mano se separaría de las otras dos sin que nada fallara. Por eso los catálogos no se escriben: se
// GENERAN entre las marcas `/*<CATALOGOS-GENERADOS>*/ … /*</CATALOGOS-GENERADOS>*/` del propio archivo.
//
//   · RUEDA       ← `const DATA` de la Rueda del Café publicada (`public/tools/catacion/rueda-del-cafe-v23.html`), la
//                   misma fuente de `src/lib/catacion/ruedaDatos.ts` (V5.131): familia → subcategoría → nota, con ES ·
//                   EN · DE, color, icono y la descripción corta de cada una.
//   · DEP_MUNI    ← `src/components/kaffetal-regal/ficha/fichaData.ts` (departamento → municipios de la Ficha de KR).
//   · VARIEDADES  ← `VARIETIES` del mismo archivo (nombre, linaje, especie).
//   · HS_CODES    ← `HS_CODES` del mismo archivo.
//
// Quien cambie una de esas fuentes regenera; `qa-coffee-datasheet-check` corre el modo `--check` y falla si no.
// Al publicar otra versión de la Rueda se cambia `RUEDA_FUENTE` aquí (y `HERRAMIENTA` en `build-rueda-datos.mjs`).

import { readFileSync, writeFileSync } from "node:fs";
import { DEP_MUNI, HS_CODES, VARIETIES } from "../src/components/kaffetal-regal/ficha/fichaData.ts";

export const RUEDA_FUENTE = "public/tools/catacion/rueda-del-cafe-v23.html";
export const HERRAMIENTA = "public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html";
const INICIO = "/*<CATALOGOS-GENERADOS>*/";
const FIN = "/*</CATALOGOS-GENERADOS>*/";
const raiz = new URL("../", import.meta.url);

export function leerRueda() {
  const html = readFileSync(new URL(RUEDA_FUENTE, raiz), "utf8");
  const i = html.indexOf("const DATA = [");
  const j = html.indexOf("\n];", i);
  if (i < 0 || j < 0) throw new Error(`No se encontró «const DATA = [ … ];» en ${RUEDA_FUENTE}`);
  // Es un literal de datos de un archivo del propio repo (no entra nada de fuera): se evalúa tal cual.
  const DATA = new Function(`${html.slice(i, j + 3)}\nreturn DATA;`)();
  const tres = (o, campo) => [o[campo], o[`${campo}_en`] ?? o[campo], o[`${campo}_de`] ?? o[campo]];
  return DATA.map((f) => ({
    id: f.id,
    n: tres(f, "name"),
    c: f.color,
    i: f.icon,
    d: tres(f, "desc"),
    s: f.subs.map((s) => ({
      id: s.id,
      n: tres(s, "name"),
      d: tres(s, "desc"),
      h: s.leaves.map((l) => ({ id: l.id, n: tres(l, "n"), d: tres(l, "d") })),
    })),
  }));
}

export function generarBloque() {
  const rueda = leerRueda();
  const variedades = VARIETIES.map((v) => ({ v: v.v, l: v.l, e: v.e }));
  const lineas = [
    INICIO,
    "// GENERADO por `scripts/build-coffee-datasheet.mjs` — NO editar a mano. Fuentes: la Rueda del Café publicada",
    `// (\`${RUEDA_FUENTE}\`) y la Ficha de Kaffetal Regal (\`fichaData.ts\`).`,
    "const RUEDA = [",
    ...rueda.map((f) => `  ${JSON.stringify(f)},`),
    "];",
    `const DEP_MUNI = ${JSON.stringify(DEP_MUNI)};`,
    `const VARIEDADES = ${JSON.stringify(variedades)};`,
    `const HS_CODES = ${JSON.stringify(HS_CODES)};`,
    FIN,
  ];
  return lineas.join("\n");
}

/** El archivo de la herramienta con el bloque puesto. `null` si faltan las marcas. */
export function aplicar(html) {
  const i = html.indexOf(INICIO);
  const j = html.indexOf(FIN);
  if (i < 0 || j < 0 || j < i) return null;
  return html.slice(0, i) + generarBloque() + html.slice(j + FIN.length);
}

const esDirecto = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (esDirecto) {
  const ruta = new URL(HERRAMIENTA, raiz);
  const actual = readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
  const nuevo = aplicar(actual);
  if (nuevo == null) {
    console.error(`✗ ${HERRAMIENTA} no tiene las marcas ${INICIO} … ${FIN}`);
    process.exit(1);
  }
  if (process.argv.includes("--check")) {
    if (actual !== nuevo) {
      console.error(`✗ Los catálogos de ${HERRAMIENTA} no coinciden con sus fuentes. Regenere: node --experimental-strip-types scripts/build-coffee-datasheet.mjs`);
      process.exit(1);
    }
    console.log(`✓ ${HERRAMIENTA}: catálogos al día con sus fuentes`);
  } else {
    writeFileSync(ruta, nuevo);
    const r = leerRueda();
    const notas = r.reduce((a, f) => a + f.s.reduce((b, s) => b + s.h.length, 0), 0);
    console.log(`✓ ${HERRAMIENTA}: ${r.length} familias · ${r.reduce((a, f) => a + f.s.length, 0)} subcategorías · ${notas} notas · ${Object.keys(DEP_MUNI).length} departamentos · ${VARIETIES.length} variedades`);
  }
}
