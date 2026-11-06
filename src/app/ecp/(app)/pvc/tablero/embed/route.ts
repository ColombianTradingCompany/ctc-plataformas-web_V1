import { tableroConPuente } from "@/lib/pvc/tablero";
import { esOwnerDelPvc, SOLO_OWNER_PVC } from "../../soloDelOwner";

// Sirve el tablero HTML AUTENTICADO con `window.PVC_DB` inyectado (la edición
// vigente, el historial y la URL de publicación). La compuerta de la consola
// redirige si la sesión no vale, así que el archivo nunca sale sin identidad; y
// desde la V6.20 es solo del owner (decisión del owner del 5 nov): a los demás, 403.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await esOwnerDelPvc())) return new Response(SOLO_OWNER_PVC, { status: 403, headers: { "cache-control": "private, no-store" } });
  // V5.179: `?borrador=<uuid>` arranca el tablero desde el borrador del agente.
  const b = new URL(request.url).searchParams.get("borrador");
  const html = await tableroConPuente(b && /^[0-9a-f-]{36}$/i.test(b) ? b : null);
  if (!html) return new Response("El tablero no está disponible en este despliegue.", { status: 404 });
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      // Tipografías de Google son lo único externo que carga el tablero.
      "content-security-policy": "default-src 'self' 'unsafe-inline' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
    },
  });
}
