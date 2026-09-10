import { readdir, readFile, stat } from "node:fs/promises";
import path from "path";

// ── PVC · el dossier (los PDF D0–D9 + la calculadora, por versión) ───────────
// Mismo patrón que `panel/architectureDocs.ts`: se lee del disco en tiempo de
// ejecución (next.config.ts lo traza con `outputFileTracingIncludes`) y se sirve
// por un route handler AUTENTICADO. No va en public/: el D2 y el D3 describen
// el modelo económico entero, incluidos los costos estimados.
//
// Cada versión del dossier es una carpeta `docs/pvc/vX.Y.Z/`. Hoy hay una
// (v2.1.1); cuando el ciclo regenere el dossier por edición, cada edición
// tendrá la suya (docs/PVC_BCP_PLAN.md §1, fase 3).

export const PVC_DOCS_DIR = path.join(process.cwd(), "docs", "pvc");

export type DossierDoc = { version: string; file: string; title: string; kind: "pdf" | "xlsx" | "otro"; sizeKb: number };

const TITULOS: [RegExp, string][] = [
  [/D0_/, "D0 · Índice del conjunto"], [/D1_/, "D1 · Fuentes y datos"], [/D2_/, "D2 · Método"], [/D3_/, "D3 · Aplicación de la franja"],
  [/D4_.*_ES/, "D4 · One-pager (ES)"], [/D4_.*_EN/, "D4 · One-pager (EN)"], [/D5_/, "D5 · Prueba de fuego"], [/D6_/, "D6 · Formatos operativos"],
  [/D7_/, "D7 · Guion y preguntas del productor"], [/D8_/, "D8 · Guiones de comunicación"], [/D9_/, "D9 · Guion de video"], [/Calculadora/, "Calculadora (Excel)"],
];

function titulo(file: string): string {
  for (const [re, t] of TITULOS) if (re.test(file)) return t;
  return file;
}

export async function listarDossier(): Promise<DossierDoc[]> {
  let versiones: string[];
  try { versiones = (await readdir(PVC_DOCS_DIR)).filter((n) => /^v\d/.test(n)); } catch { return []; }
  const out: DossierDoc[] = [];
  for (const v of versiones.sort().reverse()) {
    const dir = path.join(PVC_DOCS_DIR, v);
    let files: string[];
    try { files = await readdir(dir); } catch { continue; }
    for (const f of files.sort()) {
      const ext = f.toLowerCase().split(".").pop();
      if (ext !== "pdf" && ext !== "xlsx") continue;
      const info = await stat(path.join(dir, f));
      out.push({ version: v, file: f, title: titulo(f), kind: ext === "pdf" ? "pdf" : "xlsx", sizeKb: Math.max(1, Math.round(info.size / 1024)) });
    }
  }
  return out;
}

/** Lee un documento POR NOMBRE validado contra el listado real (defensa contra path traversal). */
export async function leerDossier(version: string, file: string): Promise<{ body: Buffer; contentType: string } | null> {
  const docs = await listarDossier();
  const match = docs.find((d) => d.version === version && d.file === file);
  if (!match) return null;
  const body = await readFile(path.join(PVC_DOCS_DIR, match.version, match.file));
  return { body, contentType: match.kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
}
