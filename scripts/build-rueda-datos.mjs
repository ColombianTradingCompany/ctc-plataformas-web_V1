// ── La taxonomía de la rueda, SACADA de la herramienta (V5.131, owner 2026-10-01) ────────────────────────────────────
//
//   node scripts/build-rueda-datos.mjs            escribe src/lib/catacion/ruedaDatos.ts
//   node scripts/build-rueda-datos.mjs --check    no escribe: sale con 1 si el archivo no coincide con la herramienta
//
// El owner puso la Rueda del Café del taller junto a la rueda de la planilla del Q-Grader: «no entiendo por qué la rueda es
// diferente… ¡deben ser iguales!». Lo eran distintas porque `rueda.ts` (V5.81) tenía una taxonomía resumida —9 familias y
// 28 descriptores escritos a mano— y la herramienta publicada (`public/tools/catacion/rueda-del-cafe-v23.html`) trae la
// completa: 9 familias → 22 subcategorías → 85 notas, con sus colores e iconos.
//
// Desde hoy hay UNA: la de la herramienta. Este script lee su bloque `const DATA = [ … ];` y genera `ruedaDatos.ts` con lo
// que las superficies React necesitan (ids, ES/EN, color, icono — las descripciones largas se quedan en la herramienta).
// `qa-centro-calidad` corre el modo `--check`: si la herramienta cambia y no se regenera, falla. Gratis y sin red.

import { readFileSync, writeFileSync } from "node:fs";

const HERRAMIENTA = "public/tools/catacion/rueda-del-cafe-v23.html";
const SALIDA = "src/lib/catacion/ruedaDatos.ts";
const raiz = new URL("../", import.meta.url);

export function leerDatosDeLaHerramienta() {
  const html = readFileSync(new URL(HERRAMIENTA, raiz), "utf8");
  const i = html.indexOf("const DATA = [");
  const j = html.indexOf("\n];", i);
  if (i < 0 || j < 0) throw new Error(`No se encontró «const DATA = [ … ];» en ${HERRAMIENTA}`);
  // Es un literal de datos de un archivo del propio repo (no entra nada de fuera): se evalúa tal cual.
  const DATA = new Function(`${html.slice(i, j + 3)}\nreturn DATA;`)();
  return DATA.map((f) => ({
    id: f.id,
    es: f.name,
    en: f.name_en,
    color: f.color,
    icono: f.icon,
    subs: f.subs.map((s) => ({
      id: s.id,
      es: s.name,
      en: s.name_en,
      hojas: s.leaves.map((l) => ({ id: l.id, es: l.n, en: l.n_en })),
    })),
  }));
}

export function generar() {
  const datos = leerDatosDeLaHerramienta();
  const q = (s) => JSON.stringify(s);
  const lineas = [
    "// ── GENERADO por `scripts/build-rueda-datos.mjs` — NO editar a mano ──────────────────────────────────────────────────",
    `// La taxonomía de la rueda del sabor, sacada de la herramienta publicada (\`${HERRAMIENTA}\`):`,
    "// familia → subcategoría → nota, con el color y el icono de cada familia. Para cambiarla se cambia la herramienta y se",
    "// regenera; `qa-centro-calidad` falla si este archivo y la herramienta dejan de coincidir. La lee `rueda.ts`.",
    "",
    "export type NotaDeLaRueda = { id: string; es: string; en: string };",
    "export type SubcategoriaDeLaRueda = { id: string; es: string; en: string; hojas: NotaDeLaRueda[] };",
    "export type FamiliaDeLaRueda = { id: string; es: string; en: string; color: string; icono: string; subs: SubcategoriaDeLaRueda[] };",
    "",
    "export const RUEDA_DATOS: readonly FamiliaDeLaRueda[] = [",
  ];
  for (const f of datos) {
    lineas.push("  {");
    lineas.push(`    id: ${q(f.id)}, es: ${q(f.es)}, en: ${q(f.en)}, color: ${q(f.color)}, icono: ${q(f.icono)},`);
    lineas.push("    subs: [");
    for (const s of f.subs) {
      lineas.push(`      { id: ${q(s.id)}, es: ${q(s.es)}, en: ${q(s.en)}, hojas: [`);
      for (const h of s.hojas) lineas.push(`        { id: ${q(h.id)}, es: ${q(h.es)}, en: ${q(h.en)} },`);
      lineas.push("      ] },");
    }
    lineas.push("    ],");
    lineas.push("  },");
  }
  lineas.push("];", "");
  return lineas.join("\n");
}

const esDirecto = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (esDirecto) {
  const texto = generar();
  if (process.argv.includes("--check")) {
    const actual = readFileSync(new URL(SALIDA, raiz), "utf8").replace(/\r\n/g, "\n");
    if (actual !== texto) {
      console.error(`✗ ${SALIDA} no coincide con ${HERRAMIENTA}. Regenere: node scripts/build-rueda-datos.mjs`);
      process.exit(1);
    }
    console.log(`✓ ${SALIDA} coincide con la herramienta`);
  } else {
    writeFileSync(new URL(SALIDA, raiz), texto);
    console.log(`✓ escrito ${SALIDA}`);
  }
}
