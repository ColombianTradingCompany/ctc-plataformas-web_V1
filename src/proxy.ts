import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Maps a subdomain label to the internal route that should serve it.
const SUBDOMAIN_ROUTES: Record<string, string> = {
  "kaffetal-regal": "/kaffetal-regal",
  "cherry-picked": "/cherry-picked",
};

export function proxy(request: NextRequest) {
  const sub = request.nextUrl.hostname.split(".")[0];
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
