// Genera `src/lib/arena/planillaInfo.ts` — los textos de los botones «i» de la planilla de evaluación — a partir del
// catálogo INFO de la Coffee Datasheet Tool (`public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html`).
// V5.153 (owner, 2026-10-05): «incluye "i" en estos y todos los conceptos de la herramienta». UNA fuente: la herramienta
// explica cada concepto en ES · EN · DE con su norma; la planilla de la plataforma (ES · EN) lee esos mismos textos, en
// texto plano (sin HTML). Si cambia la herramienta, se vuelve a generar: `node scripts/build-planilla-info.mjs`.
// `qa-coffee-datasheet-check.mjs` comprueba que el archivo generado esté al día.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(new URL("../public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html", import.meta.url), "utf8");
const i = html.indexOf("const INFO = {");
const j = html.indexOf("\n};", i);
if (i < 0 || j < 0) throw new Error("No encuentro `const INFO = {` en la herramienta.");
const INFO = new Function(`${html.slice(i, j + 3)}\nreturn INFO;`)();

/** HTML → texto plano legible: párrafos y viñetas en líneas; sin etiquetas; entidades resueltas. */
export function textoPlano(h) {
  return String(h)
    .replace(/\r?\n/g, " ")
    .replace(/<li>/gi, "• ")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function generar() {
  const claves = Object.keys(INFO);
  const porIdioma = (lang) => Object.fromEntries(claves.map((k) => [k, { titulo: INFO[k][lang][0], texto: textoPlano(INFO[k][lang][1]), std: INFO[k].std }]));
  const catalogo = { es: porIdioma("es"), en: porIdioma("en") };
  return (
    `// GENERADO por scripts/build-planilla-info.mjs a partir del catálogo INFO de la Coffee Datasheet Tool — NO editar a mano.\n` +
    `// V5.153 (owner, 2026-10-05): los botones «i» de la planilla de evaluación explican cada concepto con las MISMAS palabras que\n` +
    `// la herramienta (ES · EN), con la norma que lo respalda. Para cambiar un texto, cámbielo en la herramienta y regenere.\n\n` +
    `import type { IdiomaDePlanilla } from "./planillaI18n";\n\n` +
    `export type ClaveDeInfo =\n  | ${claves.map((k) => JSON.stringify(k)).join("\n  | ")};\n\n` +
    `export type InfoDePlanilla = { titulo: string; texto: string; std: string };\n\n` +
    `export const INFO_PLANILLA: Record<IdiomaDePlanilla, Record<ClaveDeInfo, InfoDePlanilla>> = ${JSON.stringify(catalogo, null, 2)};\n`
  );
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const salida = new URL("../src/lib/arena/planillaInfo.ts", import.meta.url);
  writeFileSync(salida, generar());
  console.log(`✓ planillaInfo.ts: ${Object.keys(INFO).length} conceptos × 2 idiomas`);
}
