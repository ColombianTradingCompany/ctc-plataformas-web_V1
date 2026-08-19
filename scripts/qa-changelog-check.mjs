// Guardián del registro de versiones (V5.1).
//
//   node scripts/qa-changelog-check.mjs
//
// LO QUE PROTEGE. `CHANGELOG.md` nació el 2026-08-19 (V5.0) como la vista de
// CONSULTA de las versiones — paralela a los logs narrativos del mapa, que
// existen para compilar el snapshot y no para responder «¿qué trajo la V4.42?».
// Un registro así solo vale si está completo, y la única forma de que lo esté
// es que sea IMPOSIBLE subir la versión sin escribir su entrada: este guardián
// falla si el `APP_VERSION` de la insignia no tiene entrada aquí.
//
// La lección que lo motiva es la de toda esta casa: una copia paralela sin
// guardián se despega en silencio (el inventario de `meta_description`, la
// escala de grados espejada mal en dos sitios). Este archivo es una copia
// paralela A PROPÓSITO — así que nace con su guardián, no lo espera.

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const raiz = new URL("../", import.meta.url);
const version = readFileSync(new URL("src/lib/version.ts", raiz), "utf8");
const APP = version.match(/APP_VERSION = "(\d+\.\d+)"/)?.[1];
check("se pudo leer APP_VERSION", !!APP);

const log = readFileSync(new URL("CHANGELOG.md", raiz), "utf8");

// ── 1. El contrato está escrito en la cabecera ─────────────────────────────
check("la cabecera nombra el contrato", log.includes("El contrato"));
check("y a este guardián", log.includes("qa-changelog-check.mjs"));

// ── 2. Las entradas parsean y la de arriba es la versión de la insignia ────
const RE = /^## \[V(\d+)\.(\d+)\] — (\d{4}-\d{2}-\d{2}) \(commit ([0-9a-f]{7}|pendiente)\)$/gm;
const entradas = [...log.matchAll(RE)].map((m) => ({
  mayor: Number(m[1]),
  menor: Number(m[2]),
  v: `${m[1]}.${m[2]}`,
  fecha: m[3],
  sha: m[4],
  desde: m.index,
}));
check("hay entradas", entradas.length > 0);
check(
  `la entrada de arriba es la versión de la insignia (V${APP})`,
  entradas[0]?.v === APP
);

// ── 3. Orden estrictamente descendente, comparando NÚMEROS ─────────────────
// El menor es un entero, no un decimal: 4.9 < 4.45. Compararlo como cadena
// ordenaría mal justo cuando más versiones hay.
for (let i = 1; i < entradas.length; i++) {
  const a = entradas[i - 1], b = entradas[i];
  const desc = a.mayor > b.mayor || (a.mayor === b.mayor && a.menor > b.menor);
  check(`V${a.v} viene antes que V${b.v}`, desc);
  check(`la fecha no crece hacia abajo (V${a.v} ≥ V${b.v})`, a.fecha >= b.fecha);
}
check("sin versiones repetidas", new Set(entradas.map((e) => e.v)).size === entradas.length);

// ── 4. Los shas se sellan; «pendiente» solo arriba ─────────────────────────
// La entrada nueva no puede conocer su propio commit — misma mecánica que el
// sellado de los logs del mapa. Todo lo demás tiene que estar sellado.
for (let i = 1; i < entradas.length; i++) {
  check(`V${entradas[i].v} tiene su sha sellado`, entradas[i].sha !== "pendiente");
}

// ── 5. Cada viñeta lleva su categoría, y cada entrada al menos una ─────────
const CATEGORIAS = ["Hito", "Añadido", "Cambiado", "Corregido", "Retirado", "Seguridad", "Datos", "Docs"];
for (let i = 0; i < entradas.length; i++) {
  const fin = i + 1 < entradas.length ? entradas[i + 1].desde : log.length;
  const cuerpo = log.slice(entradas[i].desde, fin);
  const vinetas = cuerpo.split("\n").filter((l) => l.startsWith("- "));
  check(`V${entradas[i].v}: al menos una viñeta`, vinetas.length > 0);
  const sueltas = vinetas.filter((l) => !CATEGORIAS.some((c) => l.startsWith(`- **${c}**`)));
  check(
    `V${entradas[i].v}: toda viñeta lleva categoría${sueltas.length ? ` (${sueltas[0].slice(0, 40)}…)` : ""}`,
    sueltas.length === 0
  );
}

// ── 6. El ciclo V5 no se recorta por accidente ─────────────────────────────
// El respaldo histórico empieza en V4.27 (donde arranca el ciclo compilado en
// el wrap V38); lo anterior vive en los logs sellados y en git, y la cabecera
// lo dice. Si alguien «limpia» el archivo, esto lo delata.
check("el ciclo V5 sigue entero (V4.27 presente)", entradas.some((e) => e.v === "4.27"));
check("la cabecera dice dónde vive lo anterior", log.includes("logs sellados"));

if (fallos.length) {
  console.error(`✗ qa-changelog: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-changelog: ${ok} comprobaciones OK, 0 fallos (${entradas.length} versiones, la última V${APP})`);
