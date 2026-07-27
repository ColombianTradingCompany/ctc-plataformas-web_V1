import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { isGvgUnlocked } from "./lock";

/**
 * Write-path gate for every GVG-Space Server Action: active admin AND owner
 * AND the space cookie in hand (the action must come from an unlocked space).
 * A collaborator (non-owner) never reaches this even with the password.
 * Throws on failure; returns the owner's user id.
 */
export async function requireGvgOwner(): Promise<string> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data: pu } = await service.from("panel_users").select("is_owner").eq("profile_id", adminId).maybeSingle();
  // Owner = grandfathered (no row) or explicit is_owner — same rule as the Admin Lock.
  if (pu && !pu.is_owner) throw new Error("Solo el owner puede usar el GVG-Space.");
  if (!(await isGvgUnlocked(adminId))) throw new Error("El GVG-Space está bloqueado.");
  return adminId;
}
