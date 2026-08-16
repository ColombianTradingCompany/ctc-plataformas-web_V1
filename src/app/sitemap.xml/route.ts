import type { NextRequest } from "next/server";
import { SUBDOMAIN_ROUTES, ROOT_DOMAIN, WWW_ORIGIN } from "@/lib/red/subdominios";
import { overridesDeSuperficies } from "@/lib/seo/superficies";

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
// QUÉ LISTA CADA HOST — y OJO, esto se INVIRTIÓ el 2026-08-15 con el canonical.
// Mientras mandaba el subdominio, www anunciaba solo la casa matriz: anunciar
// ahí lo que el canonical mandaba al subdominio habría sido pedirle al buscador
// dos cosas contrarias. Ahora manda `www` + la ruta, así que la regla se da la
// vuelta entera:
//
//   · **www lista TODA la red** — la casa matriz y la ruta canónica de cada
//     superficie. Éste es el sitemap de verdad, y las URLs que lista son
//     exactamente las que declara el canonical.
//   · **un subdominio lista solo su propia portada.** No es contradicción: es la
//     puerta de descubrimiento para un rastreador que llega por ahí. Entra, lee
//     el canonical, y consolida en www. Lo que NO puede hacer es listar URLs de
//     www — un sitemap que anuncia URLs de otro host se descarta.
//
// Cada superficie es una landing de una sola página (las rutas internas van tras
// login y además están en robots.txt).

export const dynamic = "force-dynamic";

/** Rutas del mapa que NO son destino: responden con un redirect permanente, y un
 *  sitemap no debe anunciar un 308. Hoy solo el subdominio viejo de CaaS. */
const REDIRECCIONES = new Set(["/co-create"]);

/** Las rutas canónicas de la red, bajo un origen dado.
 *
 *  `fuera` son las que el owner apagó desde ECP → Direccionamiento → Manejo de
 *  Plataformas: poder sacar una superficie del sitemap sin un deploy es lo que
 *  hace que ese módulo gobierne de verdad y no solo describa.
 *
 *  ⚠️ LA CASA MATRIZ VA SIN BARRA FINAL, y no es capricho. Next normaliza el
 *  canonical de la raíz a `https://www.ctcexport.com` (sin barra), así que
 *  anunciar aquí `…/` dejaba a la casa diciendo DOS direcciones distintas para
 *  la misma página: una en el `<link rel="canonical">` y otra en el sitemap.
 *  Un buscador las reconcilia sin problema, pero el sitemap y el canonical son
 *  dos declaraciones nuestras sobre lo mismo — y la lección de esta tanda fue
 *  justamente que tienen que decir lo mismo. Manda el canonical, que es la
 *  declaración fuerte; el sitemap se ajusta a él. Si algún día Next cambia esa
 *  normalización, este es el sitio que hay que mover con ella. */
function rutasCanonicas(origin: string, fuera: Set<string>): string[] {
  const rutas = [...new Set(Object.values(SUBDOMAIN_ROUTES))]
    .filter((r) => !REDIRECCIONES.has(r) && !fuera.has(r))
    .sort();
  return [origin, ...rutas.map((r) => `${origin}${r}`)];
}

/** Las URLs que anuncia un host dado. */
function urlsFor(host: string, fuera: Set<string>): string[] {
  const sub = host.split(":")[0].split(".")[0];
  // Un subdominio: su portada y nada más. El canonical hace el resto.
  if (SUBDOMAIN_ROUTES[sub]) return [`https://${sub}.${ROOT_DOMAIN}/`];
  // www, el ápex, las previews de Vercel y localhost caen aquí: son el sitemap
  // completo de la red, porque son el origen que el canonical señala.
  if (host.startsWith("localhost") || host.startsWith("127.")) {
    return rutasCanonicas(`http://${host}`, fuera);
  }
  return rutasCanonicas(WWW_ORIGIN, fuera);
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? ROOT_DOMAIN;
  const overrides = await overridesDeSuperficies();
  const fuera = new Set(Object.entries(overrides).filter(([, v]) => !v.enSitemap).map(([r]) => r));
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsFor(host, fuera)
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
