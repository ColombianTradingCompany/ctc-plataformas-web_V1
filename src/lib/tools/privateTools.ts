import { EMBEDDED_TOOLS } from "./embedded";

// Herramientas internas que NO viven en public/: se sirven por un route handler
// autenticado (mismo patrón que el archivo de documentación). El generador de QR
// no contiene secretos, pero es una utilidad interna de CTC y el owner pidió que
// quedara detrás de la sesión.
//
// El HTML va EMBEBIDO en el bundle (src/lib/tools/embedded/, generado por
// scripts/embed-private-tools.mjs) — YA NO se lee del disco en runtime. Se leía
// con fs.readFile + outputFileTracingIncludes, pero eso resultó FRÁGIL con el
// build cache de Vercel: en un deploy incremental un .html NUEVO no quedaba en el
// bundle de la función y el handler devolvía 404 (sin ENOENT). Embebido, el HTML
// es parte del código compilado: cero lecturas de disco, cero dependencia del
// trazado. La lista blanca es exactamente lo embebido (ver el script).

export function isPrivateToolKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(EMBEDDED_TOOLS, key);
}

/**
 * Devuelve el HTML de una herramienta interna por CLAVE (no por nombre de
 * archivo: la clave nunca sale de una lista fija, así que no hay superficie de
 * path traversal). Async por compatibilidad con quien la consume.
 */
export async function readPrivateTool(key: string): Promise<string | null> {
  return EMBEDDED_TOOLS[key] ?? null;
}
