import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Read-path convenience for BCP pages: confirms there's a logged-in
 * bcp_admin and returns their profile, redirecting to the login flow
 * otherwise. This does NOT replace the independent `requireAdmin` check
 * inside every Server Action in actions.ts -- that check stays in place
 * as defense in depth on the write path.
 */
export async function requireAdminProfile() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/bcp/login");

  const { data: profile } = await session.from("profiles").select("id, role, full_name, email").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") redirect("/bcp/login");

  return { user, profile };
}
