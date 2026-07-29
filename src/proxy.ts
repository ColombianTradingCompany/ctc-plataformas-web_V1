import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { sharedCookieDomain } from "@/lib/supabase/cookieDomain";

// Maps a subdomain label to the internal route that should serve it.
const SUBDOMAIN_ROUTES: Record<string, string> = {
  "kaffetal-regal": "/kaffetal-regal",
  "cherry-picked": "/cherry-picked",
  // The Cherry Picked family: Green lives on the original subdomain above;
  // Roast and X are its sibling programmes (scaffolds until their ordering
  // logic connects to the Green catalog).
  "cherry-picked-roast": "/cherry-picked-roast",
  "cherry-picked-x": "/cherry-picked-x",
  // Directorio de Especialistas del Café · Santander — la capa de PERSONAS
  // sobre el ecosistema (las otras superficies son de lotes y de café).
  // DNS/Vercel: docs/DIRECTORIO_DOMAIN_SETUP.md
  "directoriodelcafe": "/directorio",
  // Partner-node "couples" (landing + login), one subdomain per v3 node.
  // DNS/Vercel steps: docs/PARTNER_DOMAINS_SETUP.md
  "centro-calidad": "/socios/centro-calidad",
  "agente-carga": "/socios/agente-carga",
  "agente-nacionalizacion": "/socios/agente-nacionalizacion",
  "master-roaster": "/socios/master-roaster",
  // Public-facing subdomain is "ctc-content" (2026-07-16); the internal slug stays.
  "ctc-content": "/socios/estudio-contenido",
};

// ── Por qué el proxy renueva la sesión (2026-07-18) ─────────────────────────
// Los usuarios tenían que volver a iniciar sesión cada ~1 hora. La causa no era
// una configuración de Supabase sino un bug: `createSessionClient()` escribe las
// cookies renovadas con `cookies().set()`, pero en un SERVER COMPONENT (los
// layouts y páginas del panel) Next DESCARTA las escrituras de cookies — solo
// las permite en Server Actions y Route Handlers. Así que cuando el access token
// expiraba (1 h por defecto), supabase-js lo renovaba… y el token nuevo NUNCA se
// guardaba. A la siguiente navegación volvía a estar vencido y terminaba en /login.
//
// El proxy SÍ puede escribir cookies en la respuesta, así que la renovación va
// aquí: es el patrón que documenta Supabase para SSR.
const AUTH_COOKIE_HINT = /^sb-.*-auth-token/;
// La sesión de las consolas internas vive en su propia cookie (2026-07-29,
// PANEL_AUTH_COOKIE en lib/supabase/server.ts) — se renueva aparte, con la
// misma mecánica, para que el BCP tampoco caduque a la hora.
const PANEL_COOKIE_HINT = /^ctc-panel-auth/;

export async function proxy(request: NextRequest) {
  // Read the Host header, not request.nextUrl.hostname: the dev server
  // normalizes nextUrl to "localhost" regardless of the incoming Host
  // (verified 2026-07-17), while the header carries the real hostname in
  // both dev and on Vercel.
  const host = request.headers.get("host") ?? request.nextUrl.hostname;
  const sub = host.split(":")[0].split(".")[0];
  const base = SUBDOMAIN_ROUTES[sub];

  const rewriteUrl =
    base && !request.nextUrl.pathname.startsWith(base)
      ? (() => {
          const url = request.nextUrl.clone();
          url.pathname = `${base}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
          return url;
        })()
      : null;

  const build = () =>
    rewriteUrl ? NextResponse.rewrite(rewriteUrl, { request }) : NextResponse.next({ request });

  // Sin cookie de sesión no hay nada que renovar: el visitante anónimo de la
  // web pública no paga ni una llamada extra a Supabase.
  const hasAuthCookie = request.cookies.getAll().some((c) => AUTH_COOKIE_HINT.test(c.name));
  const hasPanelCookie = request.cookies.getAll().some((c) => PANEL_COOKIE_HINT.test(c.name));
  if (!hasAuthCookie && !hasPanelCookie) return build();

  let response = build();

  // La cookie de sesión se comparte entre TODOS los subdominios *.ctcexport.com
  // (Domain=.ctcexport.com) — sin esto, cada plataforma guardaba una cookie
  // host-only y saltar de subdominio aterrizaba en la landing "deslogueada".
  const cookieDomain = sharedCookieDomain(host);

  // Las escrituras de cookies se ACUMULAN y se aplican una sola vez al final:
  // cada renovación reconstruye `response` (para que el render vea el request
  // con el token nuevo), y aplicar dentro del setAll haría que la segunda
  // renovación descartara los Set-Cookie de la primera.
  type PendingCookie = { name: string; value: string; options: CookieOptions };
  const pending: PendingCookie[] = [];

  const renew = async (name: string | undefined) => {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { name, domain: cookieDomain, path: "/" },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            // Dos pasos, como pide @supabase/ssr: primero al request (para que el
            // render que sigue vea ya el token nuevo), y luego a una respuesta
            // reconstruida a partir de ese request (para que viaje al navegador).
            cookiesToSet.forEach(({ name: n, value }) => request.cookies.set(n, value));
            response = build();
            cookiesToSet.forEach((c) => pending.push(c));
          },
        },
      }
    );
    // Es la llamada que dispara la renovación si el access token venció. Se ignora
    // el resultado a propósito: aquí NO se autoriza nada — de eso siguen
    // encargándose requireConsoleAccess / requireActiveAdmin en cada ruta y acción.
    try {
      await supabase.auth.getUser();
    } catch {
      // Un fallo de red con el servidor de Auth no debe tumbar la navegación:
      // se sirve la página y el guard de la ruta decidirá con lo que haya.
    }
  };

  if (hasAuthCookie) await renew(undefined); // cookie compartida sb-…-auth-token
  if (hasPanelCookie) await renew("ctc-panel-auth"); // sesión de las consolas internas

  for (const { name: n, value, options } of pending) {
    // Migración: al escribir la variante compartida (Domain=…), se expira la
    // vieja cookie host-only del mismo nombre en ESTE host — si quedara viva,
    // el navegador enviaría ambas y la vieja podría "taparle" la sesión nueva
    // al servidor. OJO (2026-07-29): tiene que ir como header crudo —
    // ResponseCookies es un mapa por nombre y un segundo .set() del mismo
    // nombre TRAGABA el borrado (verificado contra el Next instalado).
    if (cookieDomain) response.headers.append("set-cookie", `${n}=; Path=/; Max-Age=0`);
    response.cookies.set(n, value, options);
  }

  return response;
}

export const config = {
  // `docs` (public/docs/*, e.g. the EUDR reference PDFs) and `tools`
  // (public/tools/*, las herramientas embebidas en iframe) must be excluded like
  // `images`: otherwise on a subdomain host the rewrite turns /tools/x.html
  // into /kaffetal-regal/tools/x.html, which 404s. Static public assets
  // should always be served from the root, never proxied to a platform path.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|docs|tools).*)"],
};
