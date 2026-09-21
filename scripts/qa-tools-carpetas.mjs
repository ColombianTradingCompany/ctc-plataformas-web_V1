// Guardián de las carpetas de las herramientas (V5.66, 2026-09-21).
//
//   node --experimental-strip-types scripts/qa-tools-carpetas.mjs
//
// LO QUE PROTEGE: desde la V5.66 cada herramienta del repositorio vive en SU
// carpeta, `public/tools/<tools.id>/`, y la lista vive en UNA fuente:
// `src/lib/tools/carpetas.ts`. De esa lista salen las 308 que mantienen vivas
// las URLs planas de antes (`next.config.ts`). Lo que este guardián impide:
//
//   · que alguien suelte un HTML nuevo en la raíz de `public/tools/` (el
//     desorden del que se salió) o cree una carpeta que la lista no conoce;
//   · que la lista diga un archivo que no está en disco (la 308 llevaría a un
//     404) o que el disco tenga un HTML que la lista no dice;
//   · que una carpeta se llame como lo compartido (`assets`, `h` — esta última
//     es la ruta de las versiones subidas, `/tools/h/[slug]`);
//   · que el código vuelva a escribir una ruta plana vieja: funcionaría (por la
//     308) y nadie lo notaría, pero cada carga costaría un salto de más.
//
// No toca la base: que `tool_versions.src_publico` apunte a un archivo que
// existe lo comprueba `qa-tools-seo-espejo` (lee ese archivo; si no está, falla).

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { CARPETAS_HERRAMIENTAS, RAIZ_COMPARTIDA_TOOLS, REDIRECCIONES_HERRAMIENTAS } from "../src/lib/tools/carpetas.ts";

const raiz = new URL("../", import.meta.url);
const DIR = new URL("public/tools/", raiz);

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const ids = CARPETAS_HERRAMIENTAS.map((c) => c.id);
check("la lista no está vacía", ids.length >= 15);
check("ningún id se repite", new Set(ids).size === ids.length);
for (const id of ids) {
  check(`${id}: id con forma de slug`, /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(id));
  check(`${id}: no se llama como lo compartido`, !RAIZ_COMPARTIDA_TOOLS.includes(id));
}

// ── la raíz: solo carpetas de herramienta y lo compartido ─────────────────
for (const e of readdirSync(DIR, { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith(".html")) {
    check(`raíz: ${e.name} está suelto — va en public/tools/<id>/ y en carpetas.ts`, false);
    continue;
  }
  const conocido = RAIZ_COMPARTIDA_TOOLS.includes(e.name) || ids.includes(e.name);
  check(`raíz: «${e.name}» es una carpeta de herramienta o lo compartido`, conocido);
}
check("lo compartido sigue en la raíz: ctc-bridge.js", existsSync(new URL("ctc-bridge.js", DIR)));
check("lo compartido sigue en la raíz: assets/", existsSync(new URL("assets/", DIR)));

// ── cada carpeta: la lista y el disco dicen lo mismo ───────────────────────
for (const c of CARPETAS_HERRAMIENTAS) {
  const carpeta = new URL(c.id + "/", DIR);
  const hay = existsSync(carpeta) && statSync(carpeta).isDirectory();
  check(`${c.id}: su carpeta existe`, hay);
  if (!hay) continue;
  check(`${c.id}: declara al menos un archivo`, c.archivos.length >= 1);
  const enDisco = readdirSync(carpeta).filter((f) => f.endsWith(".html")).sort();
  for (const a of c.archivos) check(`${c.id}: ${a} está en disco`, enDisco.includes(a));
  for (const a of enDisco) check(`${c.id}: ${a} está declarado en carpetas.ts`, c.archivos.includes(a));
}

// ── las 308 ─────────────────────────────────────────────────────────────────
const fuentes = REDIRECCIONES_HERRAMIENTAS.map((r) => r.source);
check("una 308 por archivo declarado", fuentes.length === CARPETAS_HERRAMIENTAS.reduce((n, c) => n + c.archivos.length, 0));
check("ninguna URL vieja se repite", new Set(fuentes).size === fuentes.length);
for (const r of REDIRECCIONES_HERRAMIENTAS) {
  check(`308 ${r.source}: es permanente`, r.permanent === true);
  check(`308 ${r.source}: el destino existe`, existsSync(new URL("public" + r.destination, raiz)));
  check(`308 ${r.source}: la URL vieja ya no es un archivo`, !existsSync(new URL("public" + r.source, raiz)));
}
const config = readFileSync(new URL("next.config.ts", raiz), "utf8");
check("next.config.ts importa las 308 de carpetas.ts", /import\s*\{\s*REDIRECCIONES_HERRAMIENTAS\s*\}\s*from\s*["']\.\/src\/lib\/tools\/carpetas["']/.test(config));
check("next.config.ts las devuelve en redirects()", /redirects\(\)\s*\{[\s\S]*?return\s+REDIRECCIONES_HERRAMIENTAS/.test(config));

// ── nadie en el código escribe una ruta plana vieja ────────────────────────
const viejas = new RegExp(`/tools/(${CARPETAS_HERRAMIENTAS.flatMap((c) => c.archivos).map((a) => a.replace(/[.-]/g, "\\$&")).join("|")})`);
function recorre(rel, out = []) {
  const u = new URL(rel, raiz);
  for (const e of readdirSync(u, { withFileTypes: true })) {
    const r = rel + e.name;
    if (e.isDirectory()) recorre(r + "/", out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) out.push(r);
  }
  return out;
}
const codigo = [...recorre("src/"), ...recorre("scripts/")].filter((f) => f !== "src/lib/tools/carpetas.ts" && f !== "scripts/qa-tools-carpetas.mjs");
for (const f of codigo) {
  const m = readFileSync(new URL(f, raiz), "utf8").match(viejas);
  if (m) check(`${f}: usa la ruta plana vieja ${m[0]} (va con su carpeta)`, false);
}
check(`código revisado (${codigo.length} archivos)`, codigo.length > 100);

if (fallos.length) {
  console.error(`✗ qa-tools-carpetas: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-tools-carpetas: ${ok} comprobaciones OK, 0 fallos (${ids.length} carpetas, ${fuentes.length} redirecciones)`);
