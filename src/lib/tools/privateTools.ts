import { readFile } from "node:fs/promises";
import path from "node:path";

// Herramientas internas que NO viven en public/: se sirven por un route handler
// autenticado (mismo patrón que el archivo de documentación). El generador de QR
// no contiene secretos, pero es una utilidad interna de CTC y el owner pidió que
// quedara detrás de la sesión.
//
// Sus TIPOGRAFÍAS sí están en public/tools/assets — una fuente no es secreto y
// así se comparten con las herramientas públicas sin duplicar 1,2 MB.

export const PRIVATE_TOOLS_DIR = path.join(process.cwd(), "private-tools");

/** Lista blanca explícita: solo estos nombres se pueden pedir. */
const PRIVATE_TOOL_FILES: Record<string, string> = {
  qr: "generador-qr.html",
  "mermas-ctc": "mermas-ctc.html",
  catacion: "rueda-catacion.html",
  "green-datasheet": "green-coffee-datasheet.html",
};

export type PrivateToolKey = keyof typeof PRIVATE_TOOL_FILES;

export function isPrivateToolKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(PRIVATE_TOOL_FILES, key);
}

/**
 * Lee una herramienta privada por CLAVE, no por nombre de archivo: el nombre
 * nunca llega desde la URL, así que no hay superficie de path traversal — lo que
 * no esté en la lista blanca de arriba, no existe.
 */
export async function readPrivateTool(key: string): Promise<string | null> {
  const file = PRIVATE_TOOL_FILES[key];
  if (!file) return null;
  return readFile(path.join(PRIVATE_TOOLS_DIR, file), "utf8");
}
