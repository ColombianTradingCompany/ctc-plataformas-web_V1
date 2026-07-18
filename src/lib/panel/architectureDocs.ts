import { readdir, readFile, stat } from "fs/promises";
import path from "path";

// ── El archivo vivo de documentación, leído del disco ────────────────────────
// docs/architecture/ es la fuente ÚNICA de verdad (la gestiona el skill
// architecture-doc-versioning). No se copia a public/: se lee de aquí y se sirve
// por un route handler autenticado, para que no haya dos copias que se
// desincronicen y para que los snapshots NO queden expuestos públicamente —
// describen el modelo de permisos entero.
//
// Vercel solo empaqueta lo que se importa, así que next.config.ts declara
// `outputFileTracingIncludes` para esta carpeta; si no, en producción el
// directorio no existiría.

export const DOCS_DIR = path.join(process.cwd(), "docs", "architecture");

export type DocKind = "snapshot" | "log" | "report";

export type ArchitectureDoc = {
  /** Nombre de archivo real — es también la clave para servirlo. */
  file: string;
  kind: DocKind;
  /** Versión mayor (14, 13…) cuando el nombre la lleva. */
  version: number | null;
  /** Commit corto embebido en el nombre del snapshot, si lo hay. */
  sha: string | null;
  title: string;
  sizeKb: number;
  modified: string; // ISO
};

const SNAPSHOT_RE = /^Documentacion_Interactiva_V(\d+)\.0\(([0-9a-f]+)\)\.html$/i;
const LOG_RE = /^Log_Documentacion_Interactiva_V(\d+)\.txt$/i;
const REPORT_RE = /^(.+?)_V(\d+)\.html$/i;

function classify(file: string): Omit<ArchitectureDoc, "sizeKb" | "modified" | "file"> | null {
  const snap = SNAPSHOT_RE.exec(file);
  if (snap) {
    return {
      kind: "snapshot",
      version: Number(snap[1]),
      sha: snap[2],
      title: `Documentación Interactiva V${snap[1]}.0`,
    };
  }
  const log = LOG_RE.exec(file);
  if (log) {
    return { kind: "log", version: Number(log[1]), sha: null, title: `Bitácora pendiente sobre V${log[1]}` };
  }
  // Cualquier otro HTML versionado de la carpeta (p. ej. la auditoría) entra
  // como "informe" en vez de quedar invisible.
  if (file.toLowerCase().endsWith(".html")) {
    const rep = REPORT_RE.exec(file);
    return {
      kind: "report",
      version: rep ? Number(rep[2]) : null,
      sha: null,
      title: (rep ? rep[1] : file.replace(/\.html$/i, "")).replace(/_/g, " "),
    };
  }
  return null;
}

/** Lista el archivo completo, ordenado: versión desc, y snapshot antes que su bitácora. */
export async function listArchitectureDocs(): Promise<ArchitectureDoc[]> {
  let names: string[];
  try {
    names = await readdir(DOCS_DIR);
  } catch {
    return []; // carpeta ausente (p. ej. un build que no la incluyó) — la UI lo dice
  }

  const docs: ArchitectureDoc[] = [];
  for (const file of names) {
    const meta = classify(file);
    if (!meta) continue;
    const info = await stat(path.join(DOCS_DIR, file));
    docs.push({
      ...meta,
      file,
      sizeKb: Math.max(1, Math.round(info.size / 1024)),
      modified: info.mtime.toISOString(),
    });
  }

  const kindRank: Record<DocKind, number> = { snapshot: 0, report: 1, log: 2 };
  return docs.sort(
    (a, b) => (b.version ?? -1) - (a.version ?? -1) || kindRank[a.kind] - kindRank[b.kind] || a.file.localeCompare(b.file)
  );
}

/**
 * Lee un documento del archivo POR NOMBRE, validándolo contra el listado real.
 * Es la defensa contra path traversal: no se sanea la cadena (`../` codificado,
 * symlinks, unicode…), se exige que el nombre EXISTA en el directorio. Lo que no
 * está en la lista, no se sirve.
 */
export async function readArchitectureDoc(
  file: string
): Promise<{ body: Buffer; contentType: string } | null> {
  const docs = await listArchitectureDocs();
  const match = docs.find((d) => d.file === file);
  if (!match) return null;

  const body = await readFile(path.join(DOCS_DIR, match.file));
  const contentType = match.file.toLowerCase().endsWith(".html")
    ? "text/html; charset=utf-8"
    : "text/plain; charset=utf-8";
  return { body, contentType };
}
