// Embeds the internal (auth-gated) tool HTML INTO the compiled bundle.
//
// Por qué: las herramientas privadas viven fuera de public/ y antes se leían del
// disco en tiempo de ejecución (fs.readFile con ruta dinámica) y se pedía a Next
// que las empaquetara con outputFileTracingIncludes. Eso resultó FRÁGIL en
// Vercel con build cache: en un deploy incremental los archivos NUEVOS no
// quedaban en el bundle de la función y el handler devolvía 404 (sin ENOENT
// visible) — sólo la herramienta vieja (qr) funcionaba. La cura definitiva es
// no depender de fs ni del trazado: se generan módulos TS con el HTML como
// string, que Turbopack compila DENTRO de la función. Cero lecturas de disco.
//
// Flujo al actualizar una herramienta:
//   1) reemplazar el .html en private-tools/
//   2) node scripts/vendor-tool-assets.mjs   (deja los assets offline)
//   3) node scripts/embed-private-tools.mjs   (regenera los módulos embebidos)
//
// Run:  node scripts/embed-private-tools.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PRIVATE_DIR = path.join(ROOT, "private-tools");
const OUT_DIR = path.join(ROOT, "src", "lib", "tools", "embedded");

// Clave de URL → archivo en private-tools/. ESTA es la lista blanca real: sólo lo
// que esté aquí se genera y, por lo tanto, se puede servir por la ruta interna.
// Sólo el QR queda como herramienta interna (auth-gated); las demás (calculadora
// de mermas CTC, rueda de catación, ficha de café verde) se sirven PÚBLICAS desde
// public/tools/ para que funcionen en Kaffetal Regal — una herramienta privada,
// servida por /ecp/herramientas/, no puede abrirse fuera de la consola.
const TOOLS = {
  qr: "generador-qr.html",
};

// Identificador JS válido a partir de una clave con guiones ("mermas-ctc" → "mermasCtc").
const ident = (key) => key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/[^A-Za-z0-9_$]/g, "");

await mkdir(OUT_DIR, { recursive: true });

const entries = [];
for (const [key, file] of Object.entries(TOOLS)) {
  const html = await readFile(path.join(PRIVATE_DIR, file), "utf8");
  // JSON.stringify produce un literal de string JS válido y correctamente
  // escapado (comillas, barras, saltos de línea, unicode) — a prueba de balas.
  const body = `// GENERADO por scripts/embed-private-tools.mjs — NO editar a mano.\n// Fuente: private-tools/${file}\nconst html: string = ${JSON.stringify(html)};\nexport default html;\n`;
  await writeFile(path.join(OUT_DIR, `${key}.ts`), body, "utf8");
  entries.push({ key, id: ident(key) });
  console.log(`  ${key.padEnd(16)} ← ${file} (${(html.length / 1024).toFixed(0)} KB)`);
}

const imports = entries.map((e) => `import ${e.id} from "./${e.key}";`).join("\n");
const map = entries.map((e) => (e.id === e.key ? `  ${e.id},` : `  ${JSON.stringify(e.key)}: ${e.id},`)).join("\n");
const index = `// GENERADO por scripts/embed-private-tools.mjs — NO editar a mano.
// El HTML de cada herramienta interna, embebido en el bundle (sin lecturas de disco).
${imports}

export const EMBEDDED_TOOLS: Record<string, string> = {
${map}
};
`;
await writeFile(path.join(OUT_DIR, "index.ts"), index, "utf8");
console.log(`\nGenerado ${entries.length} módulos + index.ts en src/lib/tools/embedded/`);
