import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── GVG-Space lock ───────────────────────────────────────────────────────────
// The owner's personal space inside the ECP has its OWN soft password on top of
// the master login (Admin Lock pattern: sha256 in platform_settings). Unlike the
// Admin Lock — which verifies per-action — this one gates a whole route tree, so
// a successful verification mints a signed cookie derived from the lock hash:
// change the password and every open unlock dies with it. 12h lifetime.

export const GVG_LOCK_KEY = "gvg_space_lock";
export const GVG_COOKIE = "gvg-space";
export const GVG_COOKIE_MAX_AGE = 60 * 60 * 12;

export async function readGvgLockHash(): Promise<string | null> {
  const service = createServiceRoleClient();
  const { data } = await service.from("platform_settings").select("value").eq("key", GVG_LOCK_KEY).maybeSingle();
  const v = data?.value as { hash?: string } | null;
  return v?.hash ?? null;
}

/** Cookie value = HMAC(lockHash, userId): unforgeable without the stored hash,
 *  bound to the operator, and invalidated by any password change. */
export function gvgCookieValue(lockHash: string, userId: string): string {
  return createHmac("sha256", lockHash).update(userId).digest("hex");
}

export async function isGvgUnlocked(userId: string): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(GVG_COOKIE)?.value;
  if (!cookie) return false;
  const hash = await readGvgLockHash();
  if (!hash) return false;
  return cookie === gvgCookieValue(hash, userId);
}
