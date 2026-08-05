// ── Guardián de la espina de integración ─────────────────────────────────────
//   node --experimental-strip-types scripts/qa-integraciones-check.mjs
//
// Comprueba lo que puede romperse EN SILENCIO: que el vocabulario compartido de
// TypeScript y el enum de Postgres digan lo mismo. Si se desalinean, la puerta
// de entrada rechaza eventos válidos —o acepta dominios que la base no tiene— y
// nadie se entera hasta que un escenario de Make falla en producción.
//
// El enum de Postgres se pasa por argumento para no necesitar credenciales:
//   node ... qa-integraciones-check.mjs "admin_estrategia,origen_suministro,..."
// Sin argumento, comprueba solo la coherencia interna del módulo.

import { DOMINIOS, DOMINIO_LABEL, SISTEMAS, ETAPAS, CRITICIDADES, CRITICIDAD_HINT } from "../src/lib/integraciones/dominios.ts";

let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

// ── Coherencia interna ──────────────────────────────────────────────────────
check("hay 7 dominios", DOMINIOS.length === 7, `son ${DOMINIOS.length}`);
check("los ids son únicos", new Set(DOMINIOS.map(d => d.id)).size === DOMINIOS.length);
check("los números 0-6 no se repiten", new Set(DOMINIOS.map(d => d.n)).size === DOMINIOS.length);
check("cada dominio tiene etiqueta", DOMINIOS.every(d => DOMINIO_LABEL[d.id]?.length > 0));
check("cada dominio declara su etiqueta de Gmail", DOMINIOS.every(d => typeof d.gmail === "string" && d.gmail.length > 0));
check("toda criticidad explica qué pasa si se cae", CRITICIDADES.every(c => CRITICIDAD_HINT[c]?.length > 10));
check("el ciclo de vida empieza en propuesta y acaba en deprecada",
  ETAPAS[0] === "propuesta" && ETAPAS[ETAPAS.length - 1] === "deprecada", ETAPAS.join("→"));
check("la plataforma está entre los sistemas", SISTEMAS.includes("plataforma"));
check("los sistemas del plan están todos", ["notion","gmail","drive","calendar","instagram","youtube","whatsapp"].every(s => SISTEMAS.includes(s)));

// ── Contra el enum real de Postgres, si se pasa ─────────────────────────────
const arg = process.argv[2];
if (arg) {
  const pg = arg.split(",").map(s => s.trim()).filter(Boolean);
  const ts = DOMINIOS.map(d => d.id);
  const faltanEnPg = ts.filter(x => !pg.includes(x));
  const faltanEnTs = pg.filter(x => !ts.includes(x));
  check("TS y Postgres tienen los mismos dominios",
    faltanEnPg.length === 0 && faltanEnTs.length === 0,
    `solo en TS: [${faltanEnPg}] · solo en PG: [${faltanEnTs}]`);
  check("y en el mismo orden", ts.join(",") === pg.join(","), `${ts} vs ${pg}`);
} else {
  console.log("(sin enum de Postgres: se comprobó solo la coherencia interna)");
}

console.log(`\nIntegraciones · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) { console.log("\nFALLAN:"); for (const f of fails) console.log("  ·", f); process.exit(1); }
console.log("El vocabulario está alineado.\n");
