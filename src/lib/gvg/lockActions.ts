"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { GVG_COOKIE, GVG_COOKIE_MAX_AGE, gvgCookieValue, readGvgLockHash } from "./lock";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Verify the GVG-Space password and mint the unlock cookie. Owner-only — a
 * collaborator with the password still bounces here.
 */
export async function unlockGvgSpace(password: string): Promise<Result> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data: pu } = await service.from("panel_users").select("is_owner").eq("profile_id", adminId).maybeSingle();
  if (pu && !pu.is_owner) return { ok: false, error: "Solo el owner puede entrar al GVG-Space." };

  const hash = await readGvgLockHash();
  if (!hash) return { ok: false, error: "El GVG-Space no está configurado." };
  if (createHash("sha256").update(password, "utf8").digest("hex") !== hash) {
    return { ok: false, error: "Incorrect password." };
  }

  const store = await cookies();
  store.set(GVG_COOKIE, gvgCookieValue(hash, adminId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/ecp/gvg",
    maxAge: GVG_COOKIE_MAX_AGE,
  });
  return { ok: true };
}

/** Drop the unlock cookie (the "Lock space" button). */
export async function lockGvgSpace(): Promise<Result> {
  await requireActiveAdmin();
  const store = await cookies();
  store.set(GVG_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/ecp/gvg", maxAge: 0 });
  return { ok: true };
}
