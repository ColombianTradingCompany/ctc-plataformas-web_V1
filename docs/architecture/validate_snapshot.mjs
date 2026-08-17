#!/usr/bin/env node
// ── Batería de validación de un snapshot de la Documentación Interactiva ─────
// Uso:  node docs/architecture/validate_snapshot.mjs <snapshot.html> [--dump] [--prev <anterior.html>]
//
// Corre en NODE, no en la consola del navegador (lección de V35: el panel de
// vista previa no navega a un archivo suelto). Lee el HTML, extrae los literales
// `DICT` / `WIRES` / `SCENARIOS` / `CTX` / `ANN` / `FILETREE` casando corchetes y
// los evalúa con `new Function`. Las OCHO comprobaciones de la cabecera del log
// tienen que volver VACÍAS; con `--prev` imprime además los contadores del
// snapshot anterior para comprobar que suben EXACTAMENTE lo esperado.
//
// ⚠️ Ningún chequeo va envuelto en un guard de existencia (lección de V34): si
// un símbolo no está, esto revienta — y eso es lo que queremos.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("uso: node validate_snapshot.mjs <snapshot.html> [--dump] [--prev <anterior.html>]");
  process.exitCode = 2;
} else {
  const dump = args.includes("--dump");
  const prevIdx = args.indexOf("--prev");
  const prev = prevIdx >= 0 ? args[prevIdx + 1] : null;
  const html = readFileSync(file, "utf8");

  const r = analyze(html);
  if (prev) {
    const p = analyze(readFileSync(prev, "utf8"));
    console.log(`\nContadores ${basename(prev)} → ${basename(file)}:`);
    for (const k of ["nodes", "dict", "scenarios", "wires", "ctx", "ann", "files"]) {
      const a = p.counts[k], b = r.counts[k];
      console.log(`  ${k.padEnd(9)} ${String(a).padStart(4)} → ${String(b).padStart(4)}  (${b - a >= 0 ? "+" : ""}${b - a})`);
    }
  }
  console.log(`\n${basename(file)} — contadores:`, r.counts);
  if (dump) {
    console.log("\nnodos:", r.nodeIds.join(" "));
    console.log("\nDICT:", r.dictKeys.join(" "));
    console.log("\nSCENARIOS:", r.scenarioIds.join(" "));
    console.log("\nCTX:", Object.keys(r.CTX).join(" "));
  }
  let bad = 0;
  for (const [name, list] of Object.entries(r.problems)) {
    if (list.length) { bad += list.length; console.log(`\n✗ ${name} (${list.length}):`); list.forEach((x) => console.log("   ", x)); }
    else console.log(`✓ ${name}: vacío`);
  }
  console.log(bad ? `\n${bad} problema(s).` : "\nTodo vacío: el snapshot es coherente.");
  process.exitCode = bad ? 1 : 0;
}

// ── extracción ───────────────────────────────────────────────────────────────
function extractLiteral(src, name) {
  // Busca `const NAME = ` y devuelve el literal casando corchetes/llaves,
  // saltando strings, template literals y comentarios.
  const re = new RegExp(`const\\s+${name}\\s*=\\s*`);
  const m = re.exec(src);
  if (!m) throw new Error(`no encuentro const ${name}`);
  let i = m.index + m[0].length;
  const open = src[i];
  const close = open === "[" ? "]" : open === "{" ? "}" : null;
  if (!close) throw new Error(`${name}: literal inesperado empieza con '${open}'`);
  let depth = 0, inStr = null, esc = false, inLineC = false, inBlockC = false;
  const start = i;
  for (; i < src.length; i++) {
    const ch = src[i], nx = src[i + 1];
    if (inLineC) { if (ch === "\n") inLineC = false; continue; }
    if (inBlockC) { if (ch === "*" && nx === "/") { inBlockC = false; i++; } continue; }
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "/" && nx === "/") { inLineC = true; i++; continue; }
    if (ch === "/" && nx === "*") { inBlockC = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error(`${name}: literal sin cerrar`);
}
function evalLiteral(lit) { return new Function(`return (${lit});`)(); }

function analyze(html) {
  const DICT = evalLiteral(extractLiteral(html, "DICT"));
  const WIRES = evalLiteral(extractLiteral(html, "WIRES"));
  const SCENARIOS = evalLiteral(extractLiteral(html, "SCENARIOS"));
  const CTX = evalLiteral(extractLiteral(html, "CTX"));
  const ANN = evalLiteral(extractLiteral(html, "ANN"));
  const FILETREE = evalLiteral(extractLiteral(html, "FILETREE"));

  const scriptAt = html.indexOf("<script>");
  const markup = scriptAt >= 0 ? html.slice(0, scriptAt) : html;
  const nodeIds = [...markup.matchAll(/class="node[^"]*"\s+id="([^"]+)"/g)].map((m) => m[1]);
  const nodeSet = new Set(nodeIds);
  const dictKeys = Object.keys(DICT);

  // rutas del FILETREE (relativas a la raíz del workspace, con "/")
  const paths = new Set();
  (function walk(nodes, prefix) {
    for (const n of nodes) {
      const p = prefix ? `${prefix}/${n.n}` : n.n;
      paths.add(p);
      if (n.c) walk(n.c, p);
    }
  })(FILETREE, "");

  const problems = {
    "1 pasos de traza (n/from) contra nodos": [],
    "2 DICT[k].a[] contra claves DICT": [],
    "3 WIRES contra nodos": [],
    "4 CTX — nodo real y claves reales": [],
    "5 ANN huérfanas (ruta ausente del FILETREE)": [],
    "6 ANN[...].info contra DICT": [],
    "7 .ibtn[data-info] del marcado contra DICT": [],
    "8 .chip[data-info] (solo marcado antes de <script>) contra DICT": [],
    "9 claves duplicadas en DICT/CTX (texto)": [],
  };
  SCENARIOS.forEach((s) => s.steps.forEach((st) => {
    if (!nodeSet.has(st.n)) problems["1 pasos de traza (n/from) contra nodos"].push(`${s.id}: n=${st.n}`);
    if (st.from && !nodeSet.has(st.from)) problems["1 pasos de traza (n/from) contra nodos"].push(`${s.id}: from=${st.from}`);
  }));
  for (const [k, v] of Object.entries(DICT)) (v.a || []).forEach((ref) => { if (!DICT[ref]) problems["2 DICT[k].a[] contra claves DICT"].push(`${k} -> ${ref}`); });
  WIRES.forEach(([a, b]) => { if (!nodeSet.has(a)) problems["3 WIRES contra nodos"].push(a); if (!nodeSet.has(b)) problems["3 WIRES contra nodos"].push(b); });
  for (const [nid, keys] of Object.entries(CTX)) {
    if (!nodeSet.has(nid)) problems["4 CTX — nodo real y claves reales"].push(`nodo ${nid}`);
    keys.forEach((k) => { if (!DICT[k]) problems["4 CTX — nodo real y claves reales"].push(`${nid} -> ${k}`); });
  }
  for (const [p, a] of Object.entries(ANN)) {
    if (!paths.has(p)) problems["5 ANN huérfanas (ruta ausente del FILETREE)"].push(p);
    if (a.info && !DICT[a.info]) problems["6 ANN[...].info contra DICT"].push(`${p} -> ${a.info}`);
  }
  for (const m of markup.matchAll(/class="ibtn"[^>]*data-info="([^"]+)"/g)) if (!DICT[m[1]]) problems["7 .ibtn[data-info] del marcado contra DICT"].push(m[1]);
  for (const m of markup.matchAll(/class="chip[^"]*"[^>]*data-info="([^"]+)"/g)) if (!DICT[m[1]]) problems["8 .chip[data-info] (solo marcado antes de <script>) contra DICT"].push(m[1]);
  // 9: claves repetidas en el TEXTO del literal (JS se queda con la última en silencio)
  for (const name of ["DICT", "CTX"]) {
    const lit = extractLiteral(html, name);
    const seen = new Map();
    for (const m of lit.matchAll(/^\s*"?([A-Za-z0-9_-]+)"?\s*:\s*[{\[]/gm)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
    // el filtro por nivel es imperfecto (claves anidadas como "a"/"k" también casan), así que
    // solo se avisa de duplicados que sean claves REALES del objeto evaluado
    const obj = name === "DICT" ? DICT : CTX;
    for (const [k, n] of seen) if (n > 1 && k in obj) problems["9 claves duplicadas en DICT/CTX (texto)"].push(`${name}.${k} ×${n}`);
  }

  return {
    counts: { nodes: nodeIds.length, dict: dictKeys.length, scenarios: SCENARIOS.length, wires: WIRES.length, ctx: Object.keys(CTX).length, ann: Object.keys(ANN).length, files: paths.size },
    nodeIds, dictKeys, scenarioIds: SCENARIOS.map((s) => s.id), CTX, problems,
  };
}
