import { createServiceRoleClient } from "@/lib/supabase/server";
import { CONSOLE_ORDER, type PanelConsoleKey } from "./consoles";

// Server-only helpers over `panel_users`. The table is service-role-only (RLS
// on, zero policies), so a user's own JWT can never read it — every access here
// goes through the service-role client. Never import this from a client component.

export type ConsoleLevel = "admin" | "viewer";

export type PanelUserRow = {
  profile_id: string;
  email: string;
  /** Real inbox for invites/OTPs/resets; null = the login email itself. */
  delivery_email: string | null;
  display_name: string | null;
  is_owner: boolean;
  consoles: Partial<Record<PanelConsoleKey, ConsoleLevel>>;
  status: "invited" | "active" | "suspended";
  must_change_password: boolean;
  invited_by: string | null;
  invited_at: string;
  activated_at: string | null;
  suspended_at: string | null;
  last_login_at: string | null;
  invite_email_sent_at: string | null;
  invite_email_error: string | null;
  created_at: string;
};

export async function getPanelUser(profileId: string): Promise<PanelUserRow | null> {
  const service = createServiceRoleClient();
  const { data } = await service.from("panel_users").select("*").eq("profile_id", profileId).maybeSingle();
  return (data as PanelUserRow) ?? null;
}

/**
 * Which consoles a row may enter. A `bcp_admin` with NO row predates
 * `panel_users` (e.g. the founder before this migration in a partial-apply
 * scenario) — grandfather them to all consoles rather than lock them out
 * (see [[project-bcp-admin-role-footgun]]). Once a row exists it is authoritative.
 */
export function grantedConsoles(row: PanelUserRow | null): PanelConsoleKey[] {
  if (!row) return [...CONSOLE_ORDER];
  return CONSOLE_ORDER.filter((k) => Boolean(row.consoles?.[k]));
}

/** True if this identity may manage collaborators. Grandfathered when no row. */
export function isPanelOwner(row: PanelUserRow | null): boolean {
  if (!row) return true;
  return row.is_owner && row.status === "active";
}
