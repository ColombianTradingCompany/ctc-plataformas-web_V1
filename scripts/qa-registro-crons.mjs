// ── Guardián del registro de crons (B6.0, P2 del plan de unificación) ─────────────────────────────────────
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-registro-crons.mjs
//        [--vivo]          además, solo lectura: las filas `activa` de cron en producción = los crons de vercel.json
//        [--contra-head]   la parte estática contra las rutas de HEAD y sin semilla (el «antes» del informe)
//        [--semilla-sql]   imprime el INSERT de las 14 filas semilla y sale (no escribe nada)
//
// Lo que puede romperse EN SILENCIO cuando alguien añade o cambia un cron:
//   1. que la ruta no esté envuelta en `conLatido()` con SU ruta como clave, o que la envoltura quede ANTES de
//      la comprobación de CRON_SECRET (un 401 escribiría latidos) → el tablero no sabría que existe;
//   2. que el cron no tenga su fila en `registroCrons.ts` → nunca mostraría «Atrasada»;
//   3. que el horario de la fila no sea el MISMO texto que el de vercel.json → «Atrasada» a deshoras, o nunca;
//   4. que el horario use algo fuera del subconjunto que `leerHorario` entiende (números, `*`, listas, `*/N`).
// Más la forma de la semilla (claves, enums, nombres de rol). La autoprueba corre tres accesorios rotos en
// MEMORIA (ruta sin envoltura, cron sin fila, horario distinto) y exige que cada uno falle: el árbol no se toca.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { CRONS, PROPUESTAS, SEMILLA, CLAVE_CRON_RE, leerHorario } from "../src/lib/integraciones/registroCrons.ts";
import { DOMINIOS, SISTEMAS, CRITICIDADES } from "../src/lib/integraciones/dominios.ts";

const ARGS = new Set(process.argv.slice(2));
const raiz = new URL("../", import.meta.url);
const leer = (rel) => readFileSync(new URL(rel, raiz), "utf8");
const VERCEL = JSON.parse(leer("vercel.json")).crons ?? [];
const rutaDe = (path) => `src/app${path}/route.ts`;

// ── --semilla-sql ─────────────────────────────────────────────────────────────────────────────────────────
if (ARGS.has("--semilla-sql")) {
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const filas = SEMILLA.map((f) =>
    `  (${q(f.nombre)}, ${q(f.proposito)}, ${q(f.clave)}, ${q(f.dominio)}, ${q(f.disparador)}, ` +
    `array[${f.sistemas.map(q).join(", ")}]::text[], ${q(f.criticidad)}, ${q(f.etapa)})`);
  console.log(
    "insert into public.automations (nombre, proposito, clave, dominio, disparador, sistemas, criticidad, etapa) values\n" +
    filas.join(",\n") +
    "\non conflict (clave) where clave is not null do nothing\nreturning clave, etapa;");
  process.exit(0);
}

// ── La revisión, pura: recibe sus entradas para que la autoprueba pueda darle accesorios rotos ─────────────
const INICIALES_PERMITIDAS = new Set(["FNC", "PVC", "EIA", "CTC", "CTCX", "API", "SCA"]);

export function revisar({ vercel, leerRuta, crons, propuestas }) {
  const fallos = [];
  const f = (m) => fallos.push(m);

  for (const { path, schedule } of vercel) {
    const texto = leerRuta(path);
    if (texto === null) { f(`${path}: no existe ${rutaDe(path)}`); continue; }
    const gate = texto.indexOf("Bearer ${secret}");
    const wrap = texto.indexOf(`conLatido("${path}"`);
    if (gate < 0) f(`${path}: la ruta perdió su comprobación de CRON_SECRET`);
    if (wrap < 0) f(`${path}: la ruta no está envuelta en conLatido("${path}", …)`);
    else if (gate >= 0 && wrap < gate) f(`${path}: conLatido va ANTES de la comprobación de CRON_SECRET (un 401 escribiría)`);
    if (!leerHorario(schedule)) f(`${path}: el horario «${schedule}» está fuera del subconjunto que entiende leerHorario`);

    const fila = crons.find((c) => c.clave === path);
    if (!fila) { f(`${path}: sin fila en registroCrons.ts`); continue; }
    if (fila.horario !== schedule) f(`${path}: horario de la fila «${fila.horario}» ≠ vercel.json «${schedule}»`);
    if (fila.disparador !== "cron" || fila.etapa !== "activa") f(`${path}: la fila no es cron/activa`);
  }
  for (const c of crons) {
    if (!vercel.some((v) => v.path === c.clave)) f(`${c.clave}: fila de cron sin entrada en vercel.json`);
    if (!CLAVE_CRON_RE.test(c.clave)) f(`${c.clave}: clave de cron con forma inválida`);
  }

  const todas = [...crons, ...propuestas];
  const claves = todas.map((x) => x.clave);
  if (new Set(claves).size !== claves.length) f("hay claves repetidas en la semilla");
  const dominios = DOMINIOS.map((d) => d.id);
  for (const x of todas) {
    if (!dominios.includes(x.dominio)) f(`${x.clave}: dominio «${x.dominio}» fuera del enum`);
    if (!x.sistemas.length || !x.sistemas.every((s) => SISTEMAS.includes(s))) f(`${x.clave}: sistemas inválidos`);
    if (!CRITICIDADES.includes(x.criticidad)) f(`${x.clave}: criticidad inválida`);
    if (!x.nombre.trim() || x.proposito.trim().length < 20) f(`${x.clave}: nombre o propósito vacío`);
    if (/@/.test(x.nombre + x.proposito)) f(`${x.clave}: una dirección en el nombre o el propósito`);
    const siglas = (x.nombre.match(/\b[A-ZÁÉÍÓÚÑ]{2,4}\b/g) ?? []).filter((s) => !INICIALES_PERMITIDAS.has(s.toUpperCase()));
    if (siglas.length) f(`${x.clave}: el nombre lleva siglas que parecen iniciales (${siglas.join(", ")}); los nombres son de rol`);
  }
  for (const p of propuestas) {
    if (!/^[a-z0-9-]+:[a-z0-9-]+$/.test(p.clave)) f(`${p.clave}: la clave de una propuesta es «familia:trabajo»`);
    if (p.etapa !== "propuesta" || p.disparador === "cron" || p.horario) f(`${p.clave}: una propuesta no es cron ni lleva horario`);
  }
  return fallos;
}

let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

const leerRutaArbol = (path) => (existsSync(new URL(rutaDe(path), raiz)) ? leer(rutaDe(path)) : null);
const leerRutaHead = (path) => {
  try { return execFileSync("git", ["show", `HEAD:${rutaDe(path)}`], { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

// ── --contra-head: el «antes» (rutas sin envoltura, sin semilla) ───────────────────────────────────────────
if (ARGS.has("--contra-head")) {
  const fallos = revisar({ vercel: VERCEL, leerRuta: leerRutaHead, crons: [], propuestas: [] });
  const crones = new Set(fallos.map((m) => m.split(":")[0]));
  console.log(`contra HEAD: ${fallos.length} fallos en ${crones.size} de ${VERCEL.length} crons`);
  for (const m of fallos) console.log("  ·", m);
  process.exit(fallos.length ? 1 : 0);
}

// ── Parte estática, sobre el árbol ─────────────────────────────────────────────────────────────────────────
check("vercel.json tiene crons", VERCEL.length > 0, `son ${VERCEL.length}`);
check("la semilla es 8 crons + 6 propuestas", CRONS.length === 8 && PROPUESTAS.length === 6 && SEMILLA.length === 14,
  `${CRONS.length} + ${PROPUESTAS.length}`);
const fallosArbol = revisar({ vercel: VERCEL, leerRuta: leerRutaArbol, crons: CRONS, propuestas: PROPUESTAS });
check("el árbol pasa la revisión", fallosArbol.length === 0, fallosArbol.join(" | "));
for (const { path } of VERCEL) check(`${path} envuelto y sembrado`, !fallosArbol.some((m) => m.startsWith(`${path}:`)));

// leerHorario: el subconjunto, con casos conocidos
const h = (s, iso) => leerHorario(s)?.(new Date(iso));
check("leerHorario: */10 toca a las :30", h("*/10 * * * *", "2026-10-26T11:30:00Z") === true);
check("leerHorario: */10 no toca a las :35", h("*/10 * * * *", "2026-10-26T11:35:00Z") === false);
check("leerHorario: el jueves 13:30", h("30 13 * * 4", "2026-10-29T13:30:00Z") === true && h("30 13 * * 4", "2026-10-28T13:30:00Z") === false);
check("leerHorario: listas con comas", h("5,35 * * * *", "2026-10-26T08:35:00Z") === true);
check("leerHorario rechaza rangos y nombres", leerHorario("0 9-17 * * *") === null && leerHorario("0 12 * * MON") === null);

// ── Autoprueba: tres accesorios rotos, en memoria ──────────────────────────────────────────────────────────
const objetivo = VERCEL.find((v) => v.path === "/api/cron/integraciones") ?? VERCEL[0];
const sinEnvoltura = (path) => {
  const t = leerRutaArbol(path);
  return path === objetivo.path && t ? t.replace(`conLatido("${path}"`, `ejecutar("${path}"`) : t;
};
const rotos = [
  ["ruta sin envoltura", { vercel: VERCEL, leerRuta: sinEnvoltura, crons: CRONS, propuestas: PROPUESTAS }],
  ["cron sin fila", { vercel: VERCEL, leerRuta: leerRutaArbol, crons: CRONS.filter((c) => c.clave !== objetivo.path), propuestas: PROPUESTAS }],
  ["horario distinto", {
    vercel: VERCEL, leerRuta: leerRutaArbol, propuestas: PROPUESTAS,
    crons: CRONS.map((c) => (c.clave === objetivo.path ? { ...c, horario: "35 11 * * *" } : c)),
  }],
];
for (const [nombre, entrada] of rotos) {
  const fallos = revisar(entrada);
  check(`autoprueba · «${nombre}» falla`, fallos.some((m) => m.startsWith(`${objetivo.path}:`)), "el accesorio roto pasó");
}

// ── Parte viva, solo lectura ───────────────────────────────────────────────────────────────────────────────
if (ARGS.has("--vivo")) {
  try {
    for (const line of leer(".env.local").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ||= m[2].trim();
    }
  } catch { /* sin .env.local */ }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    check("parte viva: hay credenciales en .env.local", false, "faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  } else {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db.from("automations").select("clave, disparador, etapa, make_scenario_id");
    if (error) check("parte viva: se leyó automations", false, error.code ?? "error");
    else {
      const activas = data.filter((r) => r.disparador === "cron" && r.etapa === "activa").map((r) => r.clave).sort();
      const esperadas = VERCEL.map((v) => v.path).sort();
      check("parte viva: filas cron activas = vercel.json", activas.join(",") === esperadas.join(","),
        `faltan [${esperadas.filter((p) => !activas.includes(p))}] · sobran [${activas.filter((p) => !esperadas.includes(p))}]`);
      const props = data.filter((r) => PROPUESTAS.some((p) => p.clave === r.clave));
      check("parte viva: las 6 propuestas, sin escenario", props.length === 6 && props.every((r) => r.etapa === "propuesta" && r.make_scenario_id === null),
        `${props.length} filas`);
    }
  }
}

console.log(`qa-registro-crons: ${pass} comprobaciones OK${fails.length ? `, ${fails.length} FALLAN` : ""}`);
if (fails.length) { console.log("\nFALLAN:"); for (const f of fails) console.log("  ·", f); }
// `exitCode`, no `process.exit()`: con el cliente de la parte viva abierto, salir de golpe tumba node en Windows.
process.exitCode = fails.length ? 1 : 0;
