import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Maps a subdomain label to the internal route that should serve it.
const SUBDOMAIN_ROUTES: Record<string, string> = {
  "kaffetal-regal": "/kaffetal-regal",
  "cherry-picked": "/cherry-picked",
  // The Cherry Picked family: Green lives on the original subdomain above;
  // Roast and X are its sibling programmes (scaffolds until their ordering
  // logic connects to the Green catalog).
  "cherry-picked-roast": "/cherry-picked-roast",
  "cherry-picked-x": "/cherry-picked-x",
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
  if (!hasAuthCookie) return build();

  let response = build();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Dos pasos, como pide @supabase/ssr: primero al request (para que el
          // render que sigue vea ya el token nuevo), y luego a una respuesta
          // reconstruida a partir de ese request (para que viaje al navegador).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = build();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
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
