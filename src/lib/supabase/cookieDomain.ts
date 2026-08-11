// One login, every subdomain (2026-07-24). In production each platform lives
// on its own subdomain (www, kaffetal-regal, cherry-picked, cherry-picked-green,
// directoriodelcafe,
// socios…). A host-only session cookie is invisible to the sibling subdomains,
// so hopping platforms landed on the destination's logged-out landing page.
// Scoping the cookie to the PARENT domain makes the one session visible
// everywhere — which is the whole "same account across the ecosystem" promise.
//
// localhost and *.vercel.app previews return undefined → default host-only
// cookie (a .ctcexport.com domain would be rejected there anyway).
export function sharedCookieDomain(host: string | null | undefined): string | undefined {
  const h = (host ?? "").split(":")[0].toLowerCase();
  if (h === "ctcexport.com" || h.endsWith(".ctcexport.com")) return ".ctcexport.com";
  return undefined;
}
