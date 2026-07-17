import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  // Read the Host header, not request.nextUrl.hostname: the dev server
  // normalizes nextUrl to "localhost" regardless of the incoming Host
  // (verified 2026-07-17), while the header carries the real hostname in
  // both dev and on Vercel.
  const host = request.headers.get("host") ?? request.nextUrl.hostname;
  const sub = host.split(":")[0].split(".")[0];
  const base = SUBDOMAIN_ROUTES[sub];

  if (base && !request.nextUrl.pathname.startsWith(base)) {
    const url = request.nextUrl.clone();
    url.pathname = `${base}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // `docs` (public/docs/*, e.g. the EUDR reference PDFs) must be excluded like
  // `images`: otherwise on a subdomain host the rewrite turns /docs/eudr/x.pdf
  // into /kaffetal-regal/docs/eudr/x.pdf, which 404s. Static public assets
  // should always be served from the root, never proxied to a platform path.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|docs).*)"],
};
