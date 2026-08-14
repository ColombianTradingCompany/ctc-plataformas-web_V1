import type { NextRequest } from "next/server";
import { SUBDOMAIN_ROUTES, ROOT_DOMAIN, WWW_ORIGIN } from "@/lib/red/subdominios";

// ── El sitemap de la red (2026-08-14) ────────────────────────────────────────
// POR QUÉ ES UN ROUTE HANDLER Y NO EL `sitemap.ts` DE NEXT: los sitemaps son
// POR HOST y esta casa tiene 18 subdominios sirviéndose del mismo deploy. El
// `sitemap.ts` de Next se genera en build, cuando no hay ningún Host que leer,
// así que emitiría el mismo archivo para todos — y un sitemap que anuncia URLs
// de otro host es un sitemap que los buscadores descartan. Este handler lee el
// Host EN LA PETICIÓN y responde el sitemap de esa superficie.
//
// Llega aquí en todos los hosts porque `src/proxy.ts` EXCLUYE `sitemap.xml` de
// su matcher (igual que robots.txt): la petición no se reescribe a la ruta de
// la plataforma y cae siempre en esta ruta raíz. Si algún día ese matcher
// cambia, esto deja de funcionar en los subdominios — se rompen juntos.
//
// QUÉ LISTA CADA HOST: su portada, y nada más. Cada superficie es una landing
// de una sola página (las rutas internas van tras login y además están en
// robots.txt); y aunque toda superficie también responde bajo www, su canonical
// —puesto por `metadatosDeSuperficie`— apunta al subdominio, así que el sitemap
// de www anuncia SOLO la casa matriz. Anunciar en www lo que el canonical manda
// al subdominio sería pedirle al buscador dos cosas contrarias.

export const dynamic = "force-dynamic";

/** Las URLs que anuncia un host dado. */
function urlsFor(host: string): string[] {
  const sub = host.split(":")[0].split(".")[0];
  const base = SUBDOMAIN_ROUTES[sub];
  if (base) return [`https://${sub}.${ROOT_DOMAIN}/`];
  // www, el ápex, previews de Vercel y localhost caen aquí: anuncian la casa
  // matriz. En dev no hay subdominios, así que localhost también lista las
  // superficies por ruta — es la única forma de probar el formato en local.
  if (host.startsWith("localhost") || host.startsWith("127.")) {
    const origin = `http://${host}`;
    return [`${origin}/`, ...Object.values(SUBDOMAIN_ROUTES).map((r) => `${origin}${r}`)];
  }
  return [`${WWW_ORIGIN}/`];
}

export function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? ROOT_DOMAIN;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsFor(host)
  .map((u) => `  <url><loc>${u}</loc></url>`)
  .join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Un día entero de caché: el contenido solo cambia cuando se añade una
      // superficie al mapa de la red, que es un deploy.
      "Cache-Control": "public, max-age=86400",
    },
  });
}
