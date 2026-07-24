import { createBrowserClient } from "@supabase/ssr";
import { sharedCookieDomain } from "./cookieDomain";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Shared across every *.ctcexport.com subdomain (see cookieDomain.ts);
      // host-only on localhost/previews. During SSR of a client component
      // there's no window — and no cookie writes either, so undefined is fine.
      cookieOptions: {
        domain: typeof window === "undefined" ? undefined : sharedCookieDomain(window.location.hostname),
        path: "/",
      },
    }
  );
}
