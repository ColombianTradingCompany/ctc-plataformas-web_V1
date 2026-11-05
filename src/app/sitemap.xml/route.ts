import type { NextRequest } from "next/server";
import { SUBDOMAIN_ROUTES, RUTAS_SOLO_WWW, RUTAS_QUE_REDIRIGEN, ROOT_DOMAIN, WWW_ORIGIN } from "@/lib/red/subdominios";
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
 *  sitemap no debe anunciar un 308. Hoy solo el subdominio viejo de CaaS. La
 *  lista vive en `subdominios.ts` porque robots.txt también la lee. */
const REDIRECCIONES = RUTAS_QUE_REDIRIGEN;

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
 *  normalización, este es el sitio que hay que mover con ella.
 *
 *  `RUTAS_SOLO_WWW` entra aquí en pie de igualdad (2026-09-18): son superficies
 *  públicas sin subdominio propio, y este sitemap —el de www— es el ÚNICO sitio
 *  de la red donde pueden anunciarse. En un subdominio ni siquiera responden
 *  (el proxy las reescribe), y la rama de abajo que sirve a los subdominios no
 *  las toca, así que no hay riesgo de anunciar una URL que dé 404. */
function rutasCanonicas(origin: string, fuera: Set<string>): string[] {
  const rutas = [...new Set([...Object.values(SUBDOMAIN_ROUTES), ...RUTAS_SOLO_WWW])]
    .filter((r) => !REDIRECCIONES.has(r) && !fuera.has(r))
    .sort();
  // La casa matriz también obedece al interruptor: Manejo de Plataformas ofrece
  // «/» con su casilla de sitemap como a cualquier otra superficie, y hasta la
  // noche del 2026-11-04 esta línea la anunciaba siempre, casilla o no.
  return [...(fuera.has("/") ? [] : [origin]), ...rutas.map((r) => `${origin}${r}`)];
}

/** Las URLs que anuncia un host dado. */
function urlsFor(host: string, fuera: Set<string>): string[] {
  const sub = host.split(":")[0].split(".")[0];
  // Un subdominio: su portada y nada más. El canonical hace el resto. (El que
  // solo reenvía —`co-create`— no llega aquí: GET responde 404 antes.) La
  // casilla de Manejo de Plataformas gobierna el sitemap de la CASA MATRIZ —así
  // la rotula el panel— y esta puerta de descubrimiento no la lee.
  if (SUBDOMAIN_ROUTES[sub]) return [`https://${sub}.${ROOT_DOMAIN}/`];
  // www, el ápex, las previews de Vercel y localhost caen aquí: son el sitemap
  // completo de la red, porque son el origen que el canonical señala.
  if (host.startsWith("localhost") || host.startsWith("127.")) {
    return rutasCanonicas(`http://${host}`, fuera);
  }
  return rutasCanonicas(WWW_ORIGIN, fuera);
}

/** El host es la puerta vieja de algo (su ruta solo responde un 308)? */
function esPuertaQueReenvia(host: string): boolean {
  const ruta = SUBDOMAIN_ROUTES[host.split(":")[0].split(".")[0]];
  return !!ruta && REDIRECCIONES.has(ruta);
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? ROOT_DOMAIN;
  // Un host que solo reenvía no tiene NADA que anunciar: su portada es un 308, y
  // un `<urlset>` vacío no vale contra el esquema 0.9 (pide al menos un `<url>`).
  // Así que no tiene sitemap, y su robots.txt no lo anuncia.
  if (esPuertaQueReenvia(host)) return new Response("Not found", { status: 404 });
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
