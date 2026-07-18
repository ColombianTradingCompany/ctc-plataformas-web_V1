import { readPrivateTool } from "@/lib/tools/privateTools";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

// Sirve una herramienta INTERNA con la sesión de la consola. El archivo vive
// fuera de public/, así que la única puerta es esta — y requireConsoleAccess
// redirige (no lanza) si la sesión no vale.
//
// La clave de la URL se resuelve contra una LISTA BLANCA en privateTools.ts; el
// nombre de archivo nunca viaja en la URL.
export async function GET(_req: Request, ctx: { params: Promise<{ tool: string }> }) {
  await requireConsoleAccess("ecp");

  const { tool } = await ctx.params;
  const html = await readPrivateTool(tool);
  if (!html) return new Response("Herramienta no encontrada.", { status: 404 });

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
