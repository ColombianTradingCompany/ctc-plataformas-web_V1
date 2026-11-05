// Guardián del puente entre los cotizadores y las dos calculadoras del owner (2026-11-05).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cotizador-puente-check.mjs
//
// LO QUE PROTEGE. `AppFrame.tsx` no reescribe las apps (Mermas V15, CoGS V19): las embebe y LEE de ellas ids del DOM y globales
// de JavaScript. «Actualizar una calculadora es reemplazar un archivo», y un archivo nuevo puede renombrar un id o cambiar un
// `var` por un `let` sin que falle nada —ni tsc, ni eslint, ni el build—: la cotización se guarda con el total en blanco.
// Pasó: `state` (Mermas) es un `const` de primer nivel, `window` no lo ve, y la etiqueta, los kg finales, la merma y los costos
// de cada cotización de lote se guardaban vacíos (comprobado en Chromium el 2026-11-05). Este guardián lee las apps del disco y
// el puente, sin navegador ni red.

import { existsSync, readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c, d) => (c ? ok++ : fallos.push(d ? `${n} (${d})` : n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));

// Las apps viven en `private/ocp-apps/` desde TAR-119 (antes, `public/ocp-apps/`): se busca donde estén.
const carpeta = ["private/ocp-apps", "public/ocp-apps"].find((c) => existe(`${c}/cotizador-lotes.html`));
check("las dos apps están en el repo", !!carpeta && existe(`${carpeta}/cotizador-logistico.html`));
const lotes = carpeta ? lee(`${carpeta}/cotizador-lotes.html`) : "";
const logistico = carpeta ? lee(`${carpeta}/cotizador-logistico.html`) : "";
const frame = lee("src/components/cotizador/AppFrame.tsx");
const puente = lee("src/lib/cotizador/puente.ts");

const declaradaComo = (html, nombre) => {
  const m = new RegExp(`(?:^|[^.\\w$])(var|let|const|function)\\s+${nombre}\\b`).exec(html);
  return m ? m[1] : null;
};

// ── 1 · los ids del DOM que lee el titular del cotizador logístico existen en la CoGS ──
{
  const desde = frame.indexOf('if (kind === "logistico")');
  const hasta = frame.indexOf("// Mermas V15", desde);
  const bloque = desde > -1 && hasta > desde ? frame.slice(desde, hasta) : "";
  const ids = [...bloque.matchAll(/\b(?:txt|val)\("([^"]+)"\)/g)].map((m) => m[1]);
  check("el titular logístico lee ids del DOM", ids.length >= 5, ids.join(","));
  for (const id of new Set(ids)) check(`la CoGS tiene el id «${id}»`, logistico.includes(`id="${id}"`));
}

// ── 2 · lo que el puente lee por `window` es de verdad propiedad de `window` ──
// Una `function` (o un `var`) de primer nivel lo es; un `let`/`const`, no.
check("Mermas declara lotValue como función de primer nivel (window la ve)", declaradaComo(lotes, "lotValue") === "function");
check("Mermas declara fncRecord como función de primer nivel (AppFrame le inyecta el ancla FNC)", declaradaComo(lotes, "fncRecord") === "function");
check("la CoGS declara recalc como función de primer nivel", declaradaComo(logistico, "recalc") === "function");

// ── 3 · `state` de Mermas es léxico: el titular lo lee por globalDeLaApp, no por window ──
{
  const comoSeDeclara = declaradaComo(lotes, "state");
  check("Mermas declara state (si deja de ser const/let, revisa este guardián)", comoSeDeclara !== null, String(comoSeDeclara));
  const desde = frame.indexOf("// Mermas V15");
  const titularLote = desde > -1 ? frame.slice(desde, frame.indexOf("export function AppFrame", desde)) : "";
  check("el titular de lote lee state por globalDeLaApp", titularLote.includes('globalDeLaApp(win, "state")'));
  const codigo = titularLote.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check("el titular de lote no vuelve a leer w.state (window no lo ve)", !/\bw\.state\b/.test(codigo));
  for (const campo of ["_totalMerma", "_cf", "_costs"]) {
    check(`Mermas escribe state.${campo} (lo lee el titular)`, lotes.includes(`state.${campo}`) || lotes.includes(`${campo}:`));
  }
  // Los kg finales: `state._final` va en la unidad elegida en la app (kg, lb, t, sacos, cargas); `state._costs.finalKg` es kg.
  check("Mermas escribe finalKg en state._costs (en kg)",
    /const finalKg=\(state\._final\|\|0\)\*\(UNIT_KG\[state\.unit\]\|\|1\)/.test(lotes) && /const d=\{[^}]*\bfinalKg\b/.test(lotes) && lotes.includes("state._costs=d"));
  check("el titular de lote toma los kg finales de _costs.finalKg", codigo.includes("st?._costs?.finalKg"));
  check("el titular de lote no arma la etiqueta ni kgFinal con _final (va en la unidad de la app)", !/\bst\??\._final\b/.test(codigo));
}

// ── 4 · GLOBAL_KEYS: cada una existe en una app, y el archivo dice por qué hoy no se guardan ──
{
  const m = /const GLOBAL_KEYS = \[([\s\S]*?)\];/.exec(frame);
  const claves = m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  check("GLOBAL_KEYS se lee", claves.length > 5, String(claves.length));
  for (const k of claves) {
    const en = declaradaComo(lotes, k) ?? declaradaComo(logistico, k);
    check(`GLOBAL_KEYS · «${k}» está declarada en una de las apps`, en !== null);
  }
  const lexicas = claves.filter((k) => ["let", "const"].includes(declaradaComo(lotes, k) ?? declaradaComo(logistico, k) ?? ""));
  check("si alguna global es let/const, AppFrame dice en el propio archivo que hoy no se guarda (y por qué)",
    lexicas.length === 0 || (frame.includes("LO QUE ESTA LISTA HACE HOY") && frame.includes("decisión del owner")), lexicas.join(","));
}

// ── 5 · el lector: puro, autocontenido y solo con identificadores ──
{
  const sinComentarios = puente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check("puente.ts no importa nada (es puro)", !/^\s*import\s/m.test(sinComentarios));
  check("globalDeLaApp acepta SOLO un identificador antes de evaluar", /if \(!\/\^\[A-Za-z_\$\]\[\\w\$\]\*\$\/\.test\(nombre\)\) return undefined;/.test(sinComentarios));
  check("globalDeLaApp mira window primero y evalúa en el reino del iframe", sinComentarios.includes("if (nombre in w) return w[nombre];") && sinComentarios.includes("w.eval?.("));
  check("AppFrame importa el lector del módulo (no una copia)", frame.includes('import { globalDeLaApp } from "@/lib/cotizador/puente";') && !/function globalDeLaApp/.test(frame));
}

if (fallos.length) {
  console.error(`✗ qa-cotizador-puente: ${fallos.length} fallo(s), ${ok} OK`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-cotizador-puente: ${ok} comprobaciones OK, 0 fallos (apps en ${carpeta}/)`);
