// ── Las fichas de variedades, SACADAS del Mapa de Variedades (V5.167, owner 2026-10-06) ─────────────────────────────────
//
//   node scripts/build-variedades-datos.mjs            escribe src/lib/catacion/variedadesDatos.ts
//   node scripts/build-variedades-datos.mjs --check    no escribe: sale con 1 si el archivo no coincide con la herramienta
//
// El owner pidió que el dossier del lote incluya «información acerca de la(s) variedad(es) del café que componen el lote,
// sacada de la herramienta de Mapa de Variedades». La herramienta publicada (`public/tools/mapa-variedades/mapa-variedades.html`)
// trae, para cada variedad con ficha (`pf(id, {...})`): tipo, etimología, lugar, historia, bandas de altitud, tamaño de grano
// y notas en taza, en inglés, con su prosa en español (`ES_PROF`), el vocabulario de taza en español (`ES_NOTES`) y el grupo
// genético de cada nodo (`add(...)` + `GROUPS`, traducido en `ES`). Este script ejecuta SOLO esos bloques de datos en un
// contexto aislado (sin DOM) y genera el módulo que lee `src/lib/catacion/variedades.ts`. Una fuente: si la herramienta
// cambia, se regenera; `qa-centro-calidad` corre `--check`. Gratis y sin red.

import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const HERRAMIENTA = "public/tools/mapa-variedades/mapa-variedades.html";
const SALIDA = "src/lib/catacion/variedadesDatos.ts";
const raiz = new URL("../", import.meta.url);

/** El texto entre `desde` (incluido) y la primera aparición de `hasta` posterior (excluido). */
function tramo(html, desde, hasta) {
  const i = html.indexOf(desde);
  const j = html.indexOf(hasta, i + desde.length);
  if (i < 0 || j < 0) throw new Error(`No se encontró el tramo «${desde}» … «${hasta}» en ${HERRAMIENTA}`);
  return html.slice(i, j);
}

export function leerVariedadesDeLaHerramienta() {
  const html = readFileSync(new URL(HERRAMIENTA, raiz), "utf8");
  // Bloques de datos de un archivo del propio repo (no entra nada de fuera). Se ejecutan en un contexto vacío.
  const codigo = [
    "const D2R = Math.PI / 180;",
    tramo(html, "const pol=", "\n"),
    tramo(html, "const GROUPS={", "/* ══════════════════════ index"),
    tramo(html, "const ES = {", "const t = k =>"),
    tramo(html, "const ES_PROF = {", "const PROF={};"),
    tramo(html, "const PROF={};", "const PROFG={};"),
    tramo(html, "const TYPED={", "/* Low-poly"),
    "globalThis.__datos = { GROUPS, N, ES, ES_NOTES, ES_PROF, PROF, TYPED };",
  ].join("\n");
  const ctx = vm.createContext({ Math, Object, Array, String, Number, JSON });
  vm.runInContext(codigo, ctx, { timeout: 2000 });
  const { GROUPS, N, ES, ES_NOTES, ES_PROF, PROF, TYPED } = ctx.__datos;
  const nodo = new Map(N.map((n) => [n.id, n]));
  return Object.entries(PROF)
    .filter(([, p]) => p.type !== "species" && p.type !== "group")
    .map(([id, p]) => {
      const n = nodo.get(id);
      const grupoEn = n ? GROUPS[n.g]?.n ?? "" : "";
      const es = ES_PROF[id] ?? {};
      return {
        id,
        nombre: n?.label && n.label !== id ? n.label : id,
        tipo: p.type,
        tipoTexto: { en: TYPED[p.type] ?? "", es: ES[TYPED[p.type]] ?? TYPED[p.type] ?? "" },
        grupo: { en: grupoEn, es: ES[grupoEn] ?? grupoEn },
        color: n ? GROUPS[n.g]?.c ?? "#8a8a86" : "#8a8a86",
        lugar: { en: p.place ?? "", es: es.place ?? p.place ?? "" },
        // Sin traducción, el español va vacío (la herramienta cae al inglés; un documento en español no debe mezclar).
        historia: { en: p.hist ?? "", es: es.hist ?? "" },
        nombreOrigen: { en: p.ety ?? "", es: es.ety ?? p.ety ?? "" },
        altitud: Array.isArray(p.alt) ? p.alt : [],
        grano: typeof p.grain === "number" ? p.grain : null,
        notas: (p.notes ?? []).map((x) => ({ en: x, es: ES_NOTES[x] ?? x })),
        anio: n?.year ?? null,
      };
    });
}

export function generar() {
  const datos = leerVariedadesDeLaHerramienta();
  const lineas = [
    "// ── GENERADO por `scripts/build-variedades-datos.mjs` — NO editar a mano ─────────────────────────────────────────────",
    `// Las fichas de variedades del Mapa de Variedades (\`${HERRAMIENTA}\`): tipo, grupo genético, lugar, historia, altitud,`,
    "// grano y notas en taza, en inglés y español. Para cambiarlas se cambia la herramienta y se regenera; `qa-centro-calidad`",
    "// falla si este archivo y la herramienta dejan de coincidir. Lo lee `variedades.ts`.",
    "",
    "export type Bilingue = { es: string; en: string };",
    "/** `altitud`: bandas 0 ≤1.000 m · 1 1.000–1.400 · 2 1.400–1.800 · 3 1.800–2.000 · 4 >2.000. `grano`: 0 pequeño · 1 medio · 2 grande. */",
    "export type FichaDeVariedad = {",
    "  id: string;",
    "  nombre: string;",
    "  tipo: string;",
    "  tipoTexto: Bilingue;",
    "  grupo: Bilingue;",
    "  color: string;",
    "  lugar: Bilingue;",
    "  historia: Bilingue;",
    "  nombreOrigen: Bilingue;",
    "  altitud: number[];",
    "  grano: number | null;",
    "  notas: Bilingue[];",
    "  anio: string | null;",
    "};",
    "",
    "export const VARIEDADES_DATOS: readonly FichaDeVariedad[] = [",
    ...datos.map((v) => `  ${JSON.stringify(v)},`),
    "];",
    "",
  ];
  return lineas.join("\n");
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("build-variedades-datos.mjs")) {
  const salida = generar();
  const ruta = new URL(SALIDA, raiz);
  if (process.argv.includes("--check")) {
    let actual = "";
    try {
      actual = readFileSync(ruta, "utf8");
    } catch {
      /* no existe */
    }
    if (actual !== salida) {
      console.error(`✗ ${SALIDA} no coincide con la herramienta: node scripts/build-variedades-datos.mjs`);
      process.exit(1);
    }
    console.log(`✓ ${SALIDA} coincide con la herramienta`);
  } else {
    writeFileSync(ruta, salida);
    console.log(`✓ ${SALIDA} · ${salida.split("\n").filter((l) => l.startsWith("  {")).length} variedades`);
  }
}
