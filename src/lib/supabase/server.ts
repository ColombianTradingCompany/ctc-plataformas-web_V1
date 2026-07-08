import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-bound client for an already-authenticated request (respects RLS as the signed-in user). */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
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
