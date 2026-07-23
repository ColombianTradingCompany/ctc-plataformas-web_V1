import { readPrivateTool } from "@/lib/tools/privateTools";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

// Sirve una herramienta INTERNA con la sesión de la consola. El archivo vive
// fuera de public/, así que la única puerta es esta — y requireConsoleAccess
// redirige (no lanza) si la sesión no vale.
//
// La clave de la URL se resuelve contra una LISTA BLANCA en privateTools.ts; el
// nombre de archivo nunca viaja en la URL.

// SIEMPRE dinámica, NUNCA cacheada en el borde. Síntoma visto en prod
// (2026-07-23, herramientas recién agregadas): una ruta [tool] nueva, en la
// ventana de propagación del deploy, servía el _not-found estático (404) y
// Vercel lo CACHEABA; después ese 404 se servía en los HITs mientras el MISS
// devolvía 200 correctamente. force-dynamic + no-store en TODAS las respuestas
// impide que ninguna (ni el 404) quede pegada en la CDN.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ tool: string }> }) {
  await requireConsoleAccess("ecp");

  const { tool } = await ctx.params;
  const html = await readPrivateTool(tool);
  if (!html)
    return new Response("Herramienta no encontrada.", {
      status: 404,
      headers: { "cache-control": "private, no-store" },
    });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Interno: nunca en cachés compartidas.
      "cache-control": "private, no-store",
      // La herramienta es autocontenida y sus fuentes son locales; se le permite
      // solo el propio origen (más inline, que es como está escrita).
      "content-security-policy":
        "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
    },
  });
}
