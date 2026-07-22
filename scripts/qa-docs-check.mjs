// Checks the ECP documentation module against the REAL docs/architecture folder:
// filename parsing, ordering, and the path-traversal defense.
// Run: node --experimental-strip-types scripts/qa-docs-check.mjs
import { listArchitectureDocs, readArchitectureDoc } from "../src/lib/panel/architectureDocs.ts";

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else { fail++; console.error("FAIL:", name); } };

const docs = await listArchitectureDocs();
console.log("total docs:", docs.length);
for (const d of docs.slice(0, 5)) {
  console.log(`  ${d.kind.padEnd(8)} v${String(d.version ?? "-").padEnd(3)} sha=${(d.sha ?? "-").padEnd(8)} ${String(d.sizeKb).padStart(4)}KB  ${d.title}`);
}
const kinds = docs.reduce((a, d) => (a[d.kind] = (a[d.kind] || 0) + 1, a), {});
console.log("by kind:", JSON.stringify(kinds));

// Expectativas DINÁMICAS (V2.0): las fijas ("14 snapshots", "V14") se volvían
// obsoletas con cada Version Wrap. Ahora se valida la FORMA, no el conteo.
const snapshots = docs.filter((d) => d.kind === "snapshot");
const maxVersion = Math.max(...snapshots.map((d) => d.version ?? 0));
check("finds documents at all", docs.length > 0);
check("finds snapshots (>=14)", snapshots.length >= 14);
check("finds logs", (kinds.log ?? 0) > 0);
check("finds the audit report", docs.some((d) => d.kind === "report" && /Auditor/i.test(d.title)));
check("newest snapshot first = max version", docs.find((d) => d.kind === "snapshot")?.version === maxVersion);
check("newest sha parsed (7 hex)", /^[0-9a-f]{7}$/.test(docs.find((d) => d.kind === "snapshot")?.sha ?? ""));
check("no .mjs leaked in", !docs.some((d) => d.file.endsWith(".mjs")));

// Path traversal must be refused: validation is by whitelist, not by sanitizing.
for (const bad of ["../../package.json", "../../../etc/passwd", "gen_filemap_tree.mjs", "", "."]) {
  check(`refuses ${JSON.stringify(bad)}`, (await readArchitectureDoc(bad)) === null);
}
const legit = await readArchitectureDoc(docs[0].file);
check("serves a legit doc", !!legit && legit.body.length > 0);
check("html content-type", legit?.contentType.startsWith("text/html"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
