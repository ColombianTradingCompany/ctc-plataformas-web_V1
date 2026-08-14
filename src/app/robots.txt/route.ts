import type { NextRequest } from "next/server";
import { ROOT_DOMAIN } from "@/lib/red/subdominios";

// ── robots.txt (route handler desde 2026-08-14; antes era `robots.ts`) ───────
// Se convirtió en handler el día que nació el sitemap por host: la línea
// `Sitemap:` debe apuntar al sitemap DEL HOST que responde, y el `robots.ts`
// de Next se genera en build, sin Host que leer. Las REGLAS siguen siendo las
// mismas para los 18 subdominios; lo único que varía es esa línea.
//
// Las rutas prohibidas son ORDEN, no seguridad: quien de verdad protege las
// consolas es `requireConsoleAccess()` + el re-chequeo de cada Server Action.
// Este archivo es público, y pedir que no se rastree una ruta es justamente
// anunciar que existe.
//   · /bcp /ecp /ocp — las tres consolas internas (ecp/ocp añadidas 2026-08-14;
//     nacieron con el login maestro del 2026-07-15 y faltaban aquí desde
//     entonces).
//   · /lab — la mesa de pruebas del owner (tipografía del titular): no está
//     enlazada desde ningún sitio y no debe indexarse. Ver app/lab/.
//
// El proxy excluye `robots.txt` de su matcher, así que esta ruta responde en
// todos los hosts sin reescritura — mismo contrato que sitemap.xml/route.ts.

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const host = (request.headers.get("host") ?? ROOT_DOMAIN).split(":")[0];
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const port = request.headers.get("host")?.split(":")[1];
  const origin = `${proto}://${host}${port ? `:${port}` : ""}`;

  const body = `User-Agent: *
Disallow: /bcp
Disallow: /ecp
Disallow: /ocp
Disallow: /lab

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
