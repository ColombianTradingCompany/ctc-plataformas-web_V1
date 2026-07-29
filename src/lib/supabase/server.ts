import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { sharedCookieDomain } from "./cookieDomain";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-bound client for an already-authenticated request (respects RLS as the signed-in user). */
export async function createSessionClient() {
  const cookieStore = await cookies();
  // Session cookie shared across every *.ctcexport.com subdomain (see
  // cookieDomain.ts) — this is what lets a login made on one platform be
  // recognized by the others in production.
  const host = (await headers()).get("host");
  return createServerClient(url, anonKey, {
    cookieOptions: { domain: sharedCookieDomain(host), path: "/" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

// ── La sesión de las consolas internas vive en SU PROPIA cookie ─────────────
// (2026-07-29, el loop de login del BCP). La cookie compartida sb-…-auth-token
// es UN solo slot que se pelean todas las pestañas *.ctcexport.com: un tab de
// Kaffetal Regal abierto con un refresh token ya rotado reintenta cada ~90 s,
// recibe refresh_token_not_found y BORRA la cookie compartida — matando la
// sesión de BCP recién creada por el OTP (visto en vivo en los logs de Auth).
// Con nombre propio, ninguna superficie pública puede pisar la sesión interna;
// de paso, entrar al BCP ya no desloguea al productor/socio en el otro tab.
export const PANEL_AUTH_COOKIE = "ctc-panel-auth";

/**
 * Cookie-bound client for the INTERNAL consoles (BCP/ECP/OCP + master login).
 * Same mechanics as createSessionClient, but the session lives under
 * PANEL_AUTH_COOKIE — isolated from the public platforms' shared cookie.
 * The proxy renews this cookie too (same 1-hour-expiry gotcha as the shared one).
 */
export async function createPanelSessionClient() {
  const cookieStore = await cookies();
  const host = (await headers()).get("host");
  return createServerClient(url, anonKey, {
    cookieOptions: { name: PANEL_AUTH_COOKIE, domain: sharedCookieDomain(host), path: "/" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

/**
 * A throwaway client with no session persistence at all -- used to verify a
 * password during the BCP login flow's first factor without writing any
 * session cookie. The real cookie is only set once the OTP step succeeds.
 */
export function createEphemeralClient() {
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/**
 * Service-role client that bypasses Row Level Security entirely. Server-only
 * -- never import this from a client component. Reserved for audited BCP
 * mutations (approvals, publishing lots, etc.) that touch other users' rows.
 */
export function createServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
