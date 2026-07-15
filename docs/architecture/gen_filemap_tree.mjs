// Regenerates the "Mapa de archivos" tree in an interactive-doc snapshot so it
// mirrors the REAL filesystem. Run this as part of EVERY Version Wrap (see the
// architecture-doc-versioning skill) against the new V{N}.0 snapshot.
//
//   node docs/architecture/gen_filemap_tree.mjs [path-to-snapshot.html]
//
// With no argument it targets the highest-numbered Documentacion_Interactiva_V*.0
// file in this folder. It ONLY rewrites the `const FILETREE = [...]` literal
// (the raw disk structure). The hand-curated `ANN` annotations, the renderer,
// the CSS and the mode toggle are left untouched — annotations attach by path,
// so new files just appear by name until someone adds an ANN entry for them.

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
// docs/architecture -> ctc-platform -> "CTC Web Platform" (the desktop root the map starts from)
const ROOT = resolve(HERE, "..", "..", "..");

// Machine/dependency dirs: shown as a single collapsed node, contents not listed.
const COLLAPSE = new Set(["node_modules", ".git", ".next"]);
// OS junk to omit entirely.
const SKIP = new Set(["desktop.ini", ".DS_Store", "Thumbs.db"]);

const ci = (a, b) => {
  const x = a.toLowerCase(), y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
};

function walk(dir) {
  let names;
  try { names = readdirSync(dir); } catch { return []; }
  const dirs = [], files = [];
  for (const n of names) {
    if (SKIP.has(n)) continue;
    let s;
    try { s = statSync(join(dir, n)); } catch { continue; }
    (s.isDirectory() ? dirs : files).push(n);
  }
  dirs.sort(ci); files.sort(ci);
  const out = [];
  for (const d of dirs) out.push(COLLAPSE.has(d) ? { n: d, x: 1 } : { n: d, c: walk(join(dir, d)) });
  for (const f of files) out.push({ n: f });
  return out;
}

function emit(node) {
  const n = JSON.stringify(node.n); // valid JS string, keeps unicode as-is
  if (node.x) return `{n:${n},x:1}`;
  if (node.c) return `{n:${n},c:[${node.c.map(emit).join(",")}]}`;
  return `{n:${n}}`;
}

function count(nodes) {
  let f = 0, d = 0;
  for (const x of nodes) {
    if (x.x) d++;
    else if (x.c) { d++; const [sf, sd] = count(x.c); f += sf; d += sd; }
    else f++;
  }
  return [f, d];
}

function newestSnapshot() {
  const files = readdirSync(HERE).filter((f) => /^Documentacion_Interactiva_V\d+\.0\(.*\)\.html$/.test(f));
  if (!files.length) return null;
  files.sort((a, b) => parseInt(a.match(/V(\d+)\.0/)[1]) - parseInt(b.match(/V(\d+)\.0/)[1]));
  return join(HERE, files[files.length - 1]);
}

const target = process.argv[2] ? resolve(process.argv[2]) : newestSnapshot();
if (!target) { console.error("No snapshot file given and none found."); process.exit(1); }

const tree = walk(ROOT);
const literal = "[" + tree.map(emit).join(",") + "]";
const [files, dirs] = count(tree);

let html = readFileSync(target, "utf8");
const re = /const FILETREE = \[[\s\S]*?\];/;
if (!re.test(html)) {
  console.error(`FILETREE literal not found in ${basename(target)} — is this a snapshot with the Mapa de archivos?`);
  process.exit(1);
}
html = html.replace(re, `const FILETREE = ${literal};`);
writeFileSync(target, html);
console.log(`Updated FILETREE in ${basename(target)} — ${files} files, ${dirs} dirs (root: ${basename(ROOT)})`);
