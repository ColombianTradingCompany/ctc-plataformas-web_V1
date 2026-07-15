import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import type { PanelConsoleKey } from "./consoles";
import { getPanelUser, grantedConsoles, isPanelOwner } from "./panelUsers";

export type PanelIdentity = {
  userId: string;
  displayName: string;
  /** Which internal consoles this identity may enter. */
  consoles: PanelConsoleKey[];
  /** May this identity manage collaborators (/bcp/usuarios)? */
  isOwner: boolean;
};

/**
 * Authenticate an internal operator and load their access, WITHOUT gating on a
 * specific console. Two layers: `profiles.role='bcp_admin'` is the coarse gate;
 * the `panel_users` row adds status (suspended ⇒ bounced instantly on the next
 * navigation) and the per-console grant. A suspended collaborator keeps the role
 * but is rejected here. Partner accounts are a separate tier — never here.
 */
async function loadPanelIdentity(): Promise<PanelIdentity> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await session
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "bcp_admin") redirect("/login");

  const row = await getPanelUser(user.id);
  if (row && row.status !== "active") redirect("/login"); // suspended / not-yet-activated
  // Security follow-up: a fresh/reset temp password must be replaced before any
  // console is usable. The page does its own light auth (no loop through here).
  if (row?.must_change_password) redirect("/cambiar-contrasena");

  return {
    userId: user.id,
    displayName: row?.display_name ?? profile.full_name ?? profile.email ?? "",
    consoles: grantedConsoles(row),
    isOwner: isPanelOwner(row),
  };
}

/**
 * Read-path gate for a specific console shell (BCP / ECP / OCP). Redirects to the
 * master login if not an active internal operator, or to the hub if authenticated
 * but without a grant for THIS console. Does NOT replace the independent
 * `requireAdmin()` re-check inside every Server Action.
 */
export async function requireConsoleAccess(consoleKey: PanelConsoleKey): Promise<PanelIdentity> {
  const identity = await loadPanelIdentity();
  if (!identity.consoles.includes(consoleKey)) redirect("/panel");
  return identity;
}

/** Identity-only variant for the neutral console hub (`/panel`). No console gate. */
export async function requirePanelIdentity(): Promise<PanelIdentity> {
  return loadPanelIdentity();
}
