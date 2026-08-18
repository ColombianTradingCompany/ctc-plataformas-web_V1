// Guardián de la mudanza de rutas entre consolas (paso (ii) del plan V5).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-rutas-consolas.mjs
//
// Nació el 2026-08-18 con PR-A, y se queda para siempre: PR-B y PR-C mueven más
// módulos, y el paso (iii) vuelve a mover Black Stock.
//
// EL FALLO QUE ESTÁ AQUÍ PARA IMPEDIR. Mover un módulo de consola son ~234 rutas
// escritas a mano en 66 archivos, y la mitad son `revalidatePath()`. Revalidar
// una ruta que ya no existe **no lanza**: Next la marca y sigue. El resultado es
// un panel que muestra datos rancios después de guardar, sin un solo error en
// los registros y sin que `tsc`, `eslint` ni `next build` tengan nada que decir.
// Una ruta vieja olvidada en un `revalidatePath` es invisible hasta que el owner
// dice «guardé y no se actualizó». Por eso la comprobación (c) es la importante.

import { readdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { CONSOLES } from "../src/lib/panel/consoles.ts";
import { RUTAS_MOVIDAS, destinoDe } from "../src/lib/panel/rutasMovidas.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") =>
  cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : ""));

const CONSOLAS = ["bcp", "ecp", "ocp"];
const railLinks = (k) => CONSOLES[k].nav.flatMap((g) => g.links);

/** ¿Existe una página servible para esta ruta de consola? */
function tienePagina(href) {
  const [, consola, ...resto] = href.split("/");
  const base = join("src", "app", consola, "(app)", ...resto);
  if (existsSync(join(base, "page.tsx"))) return true;
  // el Panel de cada consola es el page.tsx del propio (app)
  if (resto.length === 0 && existsSync(join("src", "app", consola, "(app)", "page.tsx"))) return true;
  return false;
}

/** El talón que dejó una ruta vieja: fuera de `(app)`, con catch-all opcional. */
function tieneTalon(rutaVieja) {
  const [, consola, ...resto] = rutaVieja.split("/");
  const dir = join("src", "app", consola, ...resto, "[[...resto]]");
  return existsSync(join(dir, "page.tsx"));
}

// ── (a) todo enlace del rail tiene su página ────────────────────────────────
for (const k of CONSOLAS) {
  for (const l of railLinks(k)) {
    check(`(a) ${l.href} («${l.label}») tiene página`, tienePagina(l.href));
    check(`(a) ${l.href} pertenece a la consola ${k}`, l.href === `/${k}` || l.href.startsWith(`/${k}/`));
  }
}

// ── (b) toda ruta movida tiene talón, y su destino tiene página ─────────────
for (const { de, a } of RUTAS_MOVIDAS) {
  check(`(b) ${de} dejó su talón`, tieneTalon(de), "falta [[...resto]]/page.tsx fuera de (app)");
  check(`(b) el destino ${a} tiene página`, tienePagina(a));
  check(`(b) ${de} resuelve a ${a}`, destinoDe(de) === a, `destinoDe dio ${destinoDe(de)}`);
  check(`(b) las sub-rutas de ${de} viajan`, destinoDe(`${de}/xyz`) === `${a}/xyz`);
}

// ── (c) NINGÚN literal de una ruta vieja sigue vivo en src/ ─────────────────
const EXENTOS = new Set(["src/lib/panel/rutasMovidas.ts"]);
const fuentes = execFileSync("git", ["ls-files", "src", "scripts"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(ts|tsx|mjs)$/.test(f))
  .filter((f) => !EXENTOS.has(f))
  // los talones nombran su propia ruta vieja: es su razón de existir
  .filter((f) => !f.includes("[[...resto]]"));

const supervivientes = [];
for (const f of fuentes) {
  const texto = readFileSync(f, "utf8");
  for (const { de } of RUTAS_MOVIDAS) {
    // frontera de segmento: /bcp/club no debe casar con /bcp/clubes
    const rx = new RegExp(de.replace(/[/-]/g, "\\$&") + "(?![\\w-])", "g");
    const n = (texto.match(rx) ?? []).length;
    if (n) supervivientes.push(`${f}: ${de} ×${n}`);
  }
}
check(
  `(c) no queda ninguna ruta vieja escrita en src/ (${fuentes.length} archivos revisados)`,
  supervivientes.length === 0,
  supervivientes.slice(0, 12).join(" · ")
);

// ── (d) sin colisión de prefijo sin página intermedia ──────────────────────
for (const k of CONSOLAS) {
  const hrefs = railLinks(k).map((l) => l.href);
  for (const corto of hrefs) {
    for (const largo of hrefs) {
      if (corto === largo || !largo.startsWith(corto + "/")) continue;
      check(
        `(d) ${corto} es prefijo de ${largo} y tiene página propia`,
        tienePagina(corto),
        "la lección del 2026-08-16: dos enlaces se encendían a la vez"
      );
    }
  }
}

// ── (e) sin cadenas de talones ─────────────────────────────────────────────
const destinos = new Set(RUTAS_MOVIDAS.map((r) => r.a));
for (const { de } of RUTAS_MOVIDAS) {
  check(
    `(e) ${de} no es a la vez el destino de otra mudanza`,
    !destinos.has(de),
    "reapunte la entrada original en vez de encadenar talones"
  );
}

// ── informe ────────────────────────────────────────────────────────────────
if (fallos.length) {
  console.error(`✗ qa-rutas-consolas: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-rutas-consolas: ${ok} comprobaciones OK, 0 fallos (${RUTAS_MOVIDAS.length} rutas mudadas)`);
