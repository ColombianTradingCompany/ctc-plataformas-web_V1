import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { sharedCookieDomain } from "./cookieDomain";
import { unaPorNombre } from "./cookiesDeSesion";

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
        // `cookies()` es un mapa por nombre: sin `unaPorNombre`, el borrado host-only que @supabase/ssr manda
        // DESPUÉS del borrado con dominio lo reemplazaba, y la cookie compartida no se borraba nunca (V5.138).
        unaPorNombre(cookiesToSet).forEach(({ name, value, options }) => cookieStore.set(name, value, options));
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
        // `cookies()` es un mapa por nombre: sin `unaPorNombre`, el borrado host-only que @supabase/ssr manda
        // DESPUÉS del borrado con dominio lo reemplazaba, y la cookie compartida no se borraba nunca (V5.138).
        unaPorNombre(cookiesToSet).forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

// ── La sesión de los SOCIOS vive en SU PROPIA cookie (V5.145, owner 2026-10-02) ───────────────────────────────────────
// «Haz que la sesión del Centro de Calidad dure al menos 10 horas sin cerrarse automáticamente.» No había un límite de
// tiempo: la sesión del socio vivía en la cookie COMPARTIDA (`sb-…`), que es UN solo cupo para todas las plataformas
// públicas. Se la llevaba por delante cualquier otra cosa del mismo navegador:
//   · una sesión asistida («Entrar como el productor») la reemplazaba;
//   · Kaffetal Regal, al ver una cuenta que no puede ser productor, la cerraba (`gateMatriz` → signOut);
//   · «Cerrar sesión asistida» o salir de cualquier plataforma pública la borraba.
// Es el mismo problema que tuvieron las consolas el 2026-07-29, y la misma solución: cookie propia. Con
// `ctc-socios-auth`, nada de lo público la toca; el proxy la renueva en las rutas de `/socios` (el token de acceso
// vence a la hora y un Server Component no puede escribir cookies) y `SesionViva` la mantiene fresca mientras el
// evaluador tiene la planilla abierta. No vence por tiempo: dura hasta que el socio sale.
export const PARTNER_AUTH_COOKIE = "ctc-socios-auth";

/** El cliente de sesión de un SOCIO (los cinco nodos de `/socios`). Misma mecánica que los otros dos; cookie propia. */
export async function createPartnerSessionClient() {
  const cookieStore = await cookies();
  const host = (await headers()).get("host");
  return createServerClient(url, anonKey, {
    cookieOptions: { name: PARTNER_AUTH_COOKIE, domain: sharedCookieDomain(host), path: "/" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        unaPorNombre(cookiesToSet).forEach(({ name, value, options }) => cookieStore.set(name, value, options));
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
