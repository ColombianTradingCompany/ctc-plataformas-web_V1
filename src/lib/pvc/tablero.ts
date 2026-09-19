import "server-only";
import { readFile } from "node:fs/promises";
import path from "path";
import { edicionVigente, listarEdiciones } from "./servicio";

// ── PVC · el tablero interactivo, embebido con puente a la base ──────────────
// El tablero es un HTML autocontenido (reference_html_tools/PVC_Tablero_de_
// Control_CTC_V1.html, copiado a docs/pvc/tablero/). Se sirve AUTENTICADO por
// el route handler `/ecp/pvc/tablero/embed` dentro de un <iframe>, igual que
// las herramientas internas, y aquí se le inyecta `window.PVC_DB`: la edición
// vigente y el historial de la base, y la URL para publicar. Sin el puente el
// tablero cae a localStorage (así funciona abierto como archivo).

export const TABLERO_FILE = path.join(process.cwd(), "docs", "pvc", "tablero", "PVC_Tablero.html");

export async function tableroConPuente(): Promise<string | null> {
  let html: string;
  try { html = await readFile(TABLERO_FILE, "utf8"); } catch { return null; }
  const [vigente, ediciones] = await Promise.all([edicionVigente(), listarEdiciones(30)]);
  const puente = {
    publishUrl: "/ecp/pvc/tablero/embed/publicar",
    current: vigente ? { code: vigente.code, pvc: vigente.pvcCop, status: vigente.status, date: vigente.publishedAt, hash: vigente.hash, S: vigente.inputs, modelVersion: vigente.modelVersion } : null,
    editions: ediciones.map((e) => ({ id: e.id, code: e.code, pvc: e.pvcCop, status: e.status, date: e.publishedAt ?? e.createdAt, hash: e.hash, gob: e.outputs?.edicion?.gob ?? null, prima: e.outputs?.kpis?.prima_coop ?? null, modelVersion: e.modelVersion, S: e.inputs })),
  };
  // `<` escapado: el JSON va dentro de un <script> y una cadena con "</script>" lo cerraría.
  const inyeccion = `<script>window.PVC_DB=${JSON.stringify(puente).replace(/</g, "\\u003c")};</script>\n`;
  const idx = html.indexOf("<script>");
  return idx >= 0 ? html.slice(0, idx) + inyeccion + html.slice(idx) : html + inyeccion;
}
