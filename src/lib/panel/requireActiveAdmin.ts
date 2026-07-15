import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

/**
 * Write-path gate shared by every BCP Server Action. Verifies the session user is
 * a `bcp_admin` AND — since panel_users (2026-07-15) — that their collaborator row
 * is still `active`, so suspending someone revokes their Server Actions instantly
 * (not just navigation). A bcp_admin with no row predates panel_users and is
 * grandfathered. Throws on failure; returns the admin's user id.
 */
export async function requireActiveAdmin(): Promise<string> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") throw new Error("No autorizado.");

  const service = createServiceRoleClient();
  const { data: pu } = await service.from("panel_users").select("status").eq("profile_id", user.id).maybeSingle();
  if (pu && pu.status !== "active") throw new Error("No autorizado.");

  return user.id;
}
