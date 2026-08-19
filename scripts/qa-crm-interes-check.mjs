// Guardián de los tableros de interés — las LISTAS DE ESPERA (paso (iii)-3).
//
//   node scripts/qa-crm-interes-check.mjs
//
// Nació el 2026-08-18 con V4.30 para Roast y X: programas que abren en 2027, no
// embudos de venta, así que lo que hay que proteger no son etapas.
//
// ⚠️ LO QUE ESTE GUARDIÁN NO MIRABA, Y AHORA SÍ (V4.39). Comprobaba las dos
// fuentes que conocía, escritas a mano. Pero `subscribeNewsletter` acepta TRES
// —`ctc-home` se añadió el 2026-08-10— y la tercera estuvo nueve días recogiendo
// correos SIN TABLERO: el formulario guardaba, la base guardaba, y no fallaba
// nada porque no había nada que fallara. Sencillamente no había dónde mirarlos.
// Así que ahora la lista de fuentes se LEE de `SOURCES`, y cada una tiene que
// tener su página y su `revalidatePath`. Una fuente nueva sin tablero rompe esto
// el mismo día que se escribe, que es cuando se puede arreglar barato.

import { readFileSync, existsSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));
const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

// El módulo se mudó a `src/components/panel/` en V4.39: sirve a DOS consolas
// (Roast y X en el OCP, CTC Home en el ECP), y colgando del árbol del OCP la
// siguiente mudanza de módulos se habría llevado por delante una página del ECP.
const BOARD = "src/components/panel/interes/InteresBoard.tsx";
const ROW = "src/components/panel/interes/InteresRow.tsx";
const ACC = "src/components/panel/interes/interesActions.ts";
const CSS = "src/components/panel/shared.module.css";
const ALTAS = "src/lib/newsletter/actions.ts";
const RAIL = "src/lib/panel/consoles.ts";

// Dónde vive el tablero de cada fuente. El OCP es para lo de Cherry Picked; la
// lista de la portada es de la red entera y por eso está en el ECP, junto a
// Leads. Si mañana nace una cuarta fuente, la línea que falta aquí es la que
// hace fallar el guardián — a propósito.
const TABLEROS = {
  roast: "src/app/ocp/(app)/crm/roast/page.tsx",
  x: "src/app/ocp/(app)/crm/x/page.tsx",
  "ctc-home": "src/app/ecp/(app)/ctc-home/page.tsx",
};

const board = lee(BOARD);
const row = lee(ROW);
const acciones = lee(ACC);
const css = lee(CSS);
const altas = lee(ALTAS);
const rail = lee(RAIL);

// ── 0. NINGUNA FUENTE SIN TABLERO ──────────────────────────────────────────
// La comprobación que faltaba. La verdad de qué se puede recoger está en
// `SOURCES`, no en esta lista: se lee de ahí para que añadir una fuente y no
// darle sitio donde mirarla sea imposible de hacer en silencio.
const SOURCES = [...(altas.match(/const SOURCES = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
check("se pudo leer SOURCES de la acción de altas", SOURCES.length >= 3);
for (const f of SOURCES) {
  check(`${f}: la fuente tiene tablero declarado`, !!TABLEROS[f]);
}
for (const f of Object.keys(TABLEROS)) {
  check(`${f}: el tablero corresponde a una fuente real`, SOURCES.includes(f));
}

// ── 1. Cada página existe, comparte el MISMO componente y está en el rail ───
for (const [f, ruta] of Object.entries(TABLEROS)) {
  check(`${f}: la página existe`, existsSync(new URL(`../${ruta}`, import.meta.url)));
  const p = lee(ruta);
  check(`${f}: usa el componente compartido`, p.includes("InteresBoard"));
  check(`${f}: pasa su propia fuente`, p.includes(`fuente="${f}"`));
  // El estado vacío nombra de dónde entran las altas. Se parametriza porque
  // decirle «la landing del programa» a quien mira la lista de la portada lo
  // manda a buscar una landing que no existe.
  check(`${f}: dice de dónde entran las altas`, /origen="[^"]{6,}"/.test(p));
  // Una página sin entrada en el rail es una página que no existe para nadie:
  // es exactamente la forma que tenía este agujero.
  const href = "/" + ruta.replace(/^src\/app\//, "").replace(/\(app\)\//, "").replace(/\/page\.tsx$/, "");
  check(`${f}: su ruta ${href} está en el rail`, rail.includes(`"${href}"`));
}

// ── 2. Cada tablero ve SOLO su lista ───────────────────────────────────────
// Si el filtro por fuente se cayera, Roast enseñaría los correos de X y de
// CTC Home. No fallaría nada: saldrían más filas, y nadie las contaría.
check("el tablero filtra por la fuente que recibe", board.includes('.eq("source", fuente)'));
// El tipo sigue CERRADO: una fuente que no esté declarada no puede llegar aquí
// por descuido. Que estén las tres se comprueba contra `SOURCES`, no a mano.
check("el tipo de fuente está cerrado a una unión literal", /FuenteInteres\s*=\s*"[^;]+;/.test(board));
for (const f of SOURCES) {
  check(`${f}: la fuente está en el tipo FuenteInteres`, new RegExp(`FuenteInteres[^;]*"${f}"`).test(board));
}

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
// ⚠️ Y con la tercera fuente esto dejó de ser cosmético: su tablero vive en OTRA
// consola. Añadir una fuente y olvidar su `revalidatePath` deja una lista que se
// llena y no se refresca, sin un solo error.
for (const [f, ruta] of Object.entries(TABLEROS)) {
  const href = "/" + ruta.replace(/^src\/app\//, "").replace(/\(app\)\//, "").replace(/\/page\.tsx$/, "");
  check(`${f}: la acción revalida ${href}`, acciones.includes(`revalidatePath("${href}")`));
}

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
