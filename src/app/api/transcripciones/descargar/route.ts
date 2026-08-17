import { readFile, readdir, stat } from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireConsoleWrite } from "@/lib/panel/requireConsoleWrite";

// ── Descargar el transcriptor (OCP · Transcripciones) ────────────────────────
// Arma el ZIP de `tools/transcriptor/` EN EL MOMENTO, leyéndolo del despliegue.
//
// Antes lo subía a mano un script a Storage, y eso tenía un defecto de diseño:
// el paso manual se olvida y la gente acaba instalando una versión vieja sin
// enterarse. Generándolo aquí, lo que se descarga es EXACTAMENTE el código que
// está desplegado — no puede desincronizarse porque no hay dos copias.
//
// Detrás del gate del OCP (`requireConsoleWrite`), como el resto del módulo:
// la herramienta no tiene secretos, pero tampoco hace falta que sea pública.
//
// ⚠️ `next.config.ts` tiene que trazar esta carpeta (outputFileTracingIncludes):
// Next solo empaqueta lo que se IMPORTA, y esto se lee del disco.

export const dynamic = "force-dynamic";

const TOOL_DIR = path.join(process.cwd(), "tools", "transcriptor");
const ZIP_ROOT = "transcriptor-ctc";

/** Nunca viajan. `.env` es el importante: en desarrollo tiene el token de
 *  Hugging Face y la clave de Supabase de ese equipo. En producción ni siquiera
 *  existe (git lo ignora), pero excluirlo aquí es la red que no depende de eso. */
const EXCLUIR_NOMBRE = new Set([".env", ".venv", "venv", "__pycache__", ".pytest_cache", ".git", "node_modules"]);
const EXCLUIR_EXT = new Set([".pyc", ".zip", ".log"]);

async function añadirCarpeta(zip: JSZip, dir: string, rel = ""): Promise<number> {
  let n = 0;
  let entradas: string[];
  try {
    entradas = await readdir(dir);
  } catch {
    return 0;
  }
  for (const nombre of entradas) {
    if (EXCLUIR_NOMBRE.has(nombre) || EXCLUIR_EXT.has(path.extname(nombre))) continue;
    const abs = path.join(dir, nombre);
    const relPath = rel ? `${rel}/${nombre}` : nombre;
    const info = await stat(abs);
    if (info.isDirectory()) {
      n += await añadirCarpeta(zip, abs, relPath);
    } else {
      zip.file(`${ZIP_ROOT}/${relPath}`, await readFile(abs));
      n += 1;
    }
  }
  return n;
}

export async function GET() {
  const who = await requireConsoleWrite("ocp");
  if (!who) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const zip = new JSZip();
  const n = await añadirCarpeta(zip, TOOL_DIR);
  if (!n) {
    // Mejor decirlo que servir un ZIP vacío que el usuario descubriría al abrirlo.
    return NextResponse.json(
      { error: "No encuentro la carpeta de la herramienta en el despliegue (tools/transcriptor)." },
      { status: 500 }
    );
  }

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="transcriptor-ctc.zip"`,
      "content-length": String(buf.length),
      "cache-control": "no-store",
      "x-archivos": String(n),
    },
  });
}
