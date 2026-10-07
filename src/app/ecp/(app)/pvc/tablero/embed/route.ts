import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { tableroConPuente } from "@/lib/pvc/tablero";

// Sirve el tablero HTML AUTENTICADO con `window.PVC_DB` inyectado (la edición
// vigente, el historial y la URL de publicación). requireConsoleAccess
// redirige si la sesión no vale, así que el archivo nunca sale sin identidad.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireConsoleAccess("ecp");
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
