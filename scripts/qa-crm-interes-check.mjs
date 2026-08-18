// Guardián de los tableros de interés — CRM CP Roast y CRM CP X (paso (iii)-3).
//
//   node scripts/qa-crm-interes-check.mjs
//
// Nació el 2026-08-18 con V4.30. Roast y X son LISTAS DE ESPERA de programas
// que abren en 2027, no embudos de venta, y por eso lo que hay que proteger no
// son etapas sino tres cosas concretas.

import { readFileSync, existsSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));
const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

const BOARD = "src/app/ocp/(app)/crm/InteresBoard.tsx";
const ROW = "src/app/ocp/(app)/crm/InteresRow.tsx";
const ACC = "src/app/ocp/(app)/crm/interesActions.ts";
const CSS = "src/components/panel/shared.module.css";

const board = lee(BOARD);
const row = lee(ROW);
const acciones = lee(ACC);
const css = lee(CSS);

// ── 1. Las dos páginas existen y comparten el MISMO componente ──────────────
for (const f of ["roast", "x"]) {
  const ruta = `src/app/ocp/(app)/crm/${f}/page.tsx`;
  check(`${f}: la página existe`, existsSync(new URL(`../${ruta}`, import.meta.url)));
  const p = lee(ruta);
  check(`${f}: usa el componente compartido`, p.includes("InteresBoard"));
  check(`${f}: pasa su propia fuente`, p.includes(`fuente="${f}"`));
}

// ── 2. Cada tablero ve SOLO su lista ───────────────────────────────────────
// Si el filtro por fuente se cayera, Roast enseñaría los correos de X y de
// CTC Home. No fallaría nada: saldrían más filas, y nadie las contaría.
check("el tablero filtra por la fuente que recibe", board.includes('.eq("source", fuente)'));
check(
  "y el tipo de fuente está cerrado a roast | x",
  /FuenteInteres\s*=\s*"roast"\s*\|\s*"x"/.test(board)
);

// ── 3. Solo se persiste lo que no se puede deducir ─────────────────────────
// La regla que dejó CRM CP Green (V4.29). Aquí eso es UN dato: si ya se le
// escribió a esa persona. Idioma, antigüedad y recuentos salen de la fila.
check("el tablero NO escribe en la base", !board.includes(".update(") && !board.includes(".insert("));
check(
  "la única escritura del módulo es contacted_at/contacted_by",
  (acciones.match(/\.update\(/g) ?? []).length === 1 && acciones.includes("contacted_at")
);
check("se puede DESMARCAR (contacted_at vuelve a null)", acciones.includes("contacted_at: null"));
check("queda rastro en audit_log", acciones.includes("audit_log"));
check("y exige admin activo", acciones.includes("requireActiveAdmin"));

// ── 4. Revalidar de menos no avisa ─────────────────────────────────────────
// Una fila pertenece a UNA fuente, pero saber cuál exige leerla. Revalidar los
// dos tableros cuesta nada; revalidar solo uno deja el otro rancio en silencio
// — el mismo fallo mudo que persigue `qa-rutas-consolas`.
check("la acción revalida el tablero de Roast", acciones.includes('revalidatePath("/ocp/crm/roast")'));
check("la acción revalida el tablero de X", acciones.includes('revalidatePath("/ocp/crm/x")'));

// ── 5. Ninguna clase de CSS module inventada ───────────────────────────────
// `styles.loQueSea` que no exista en el .module.css sale como `undefined`: el
// elemento se pinta SIN estilo y ni TypeScript ni el build dicen nada. Pasó de
// verdad al escribir esta tanda (`styles.btn`, que no existe — los botones de
// las consolas usan las clases globales `btn btn-sm`).
const clasesCss = new Set([...css.matchAll(/^\.([a-zA-Z][\w-]*)/gm)].map((m) => m[1]));
// Se miran las clases del CÓDIGO, no las de la prosa: este mismo guardián
// falló sobre el comentario que explica la trampa, porque el comentario cita
// `styles.btn` para decir que NO existe. Fuera comentarios antes de buscar.
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
for (const [archivo, texto] of [[BOARD, board], [ROW, row]]) {
  const usadas = [...sinComentarios(texto).matchAll(/styles\.([a-zA-Z][\w]*)/g)].map((m) => m[1]);
  const inventadas = [...new Set(usadas)].filter((c) => !clasesCss.has(c));
  check(
    `${archivo.split("/").pop()}: no usa clases inexistentes${inventadas.length ? ` (${inventadas.join(", ")})` : ""}`,
    inventadas.length === 0
  );
}

if (fallos.length) {
  console.error(`✗ qa-crm-interes: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-crm-interes: ${ok} comprobaciones OK, 0 fallos`);
