import { readFile } from "node:fs/promises";
import path from "node:path";
import { consolaDelModulo } from "@/lib/panel/consoles";
import { requireConsoleAccess, requirePanelIdentity } from "@/lib/panel/requireConsoleAccess";
import { appDelCotizador, segmentoDeApp } from "@/lib/cotizador/apps";

// ── /ocp-apps/<archivo> · las calculadoras de los cotizadores, solo con sesión de consola (TAR-119) ──────────────────────
// La URL es la de siempre (la usa `AppFrame.tsx` como `src` del iframe), pero los HTML ya no están en `public/`: viven en
// `private/ocp-apps/` y se sirven AQUÍ, después de la misma puerta de lectura que las páginas del cotizador. No se borró ni
// se cambió nada de las apps: retirarlas es decisión del owner.
//
// Orden de la puerta: (1) sin sesión de consola, al login maestro, sea cual sea el nombre (un anónimo no aprende qué
// archivos existen); (2) un nombre fuera de la lista blanca, 404; (3) la consola del módulo que monta la app, leída del
// rail. Un route handler no hereda ningún layout de consola, así que la puerta va aquí mismo.
export const dynamic = "force-dynamic";

const CABECERAS = {
  "content-type": "text/html; charset=utf-8",
  // Interno: nunca en una caché compartida, ni en un buscador.
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
  "x-content-type-options": "nosniff",
  // Solo la enmarca la propia plataforma (el iframe de AppFrame es del mismo origen). No se limita nada más: las apps cargan
  // sus fuentes y jsPDF de CDNs públicos y llevan su JS en línea, y son del owner tal cual.
  "content-security-policy": "frame-ancestors 'self'",
};

export async function GET(_req: Request, ctx: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await ctx.params;
  const app = appDelCotizador(archivo);
  const consola = app ? consolaDelModulo(segmentoDeApp(app)) : null;
  if (!app || !consola) {
    await requirePanelIdentity();
    return new Response("No encontrado.", { status: 404, headers: { "cache-control": "private, no-store" } });
  }
  await requireConsoleAccess(consola);

  // La ruta del disco se arma con la CLAVE de la lista blanca, nunca con lo que llegó en la URL. La carpeta va en LITERALES
  // (`"private", "ocp-apps"` = `CARPETA_APPS`): con la constante importada, Turbopack no sabe qué carpeta es y traza el
  // proyecto entero dentro de la función.
  const html = await readFile(path.join(process.cwd(), "private", "ocp-apps", app));
  return new Response(new Uint8Array(html), { headers: CABECERAS });
}
