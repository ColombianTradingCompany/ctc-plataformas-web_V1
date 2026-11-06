import { createServiceRoleClient } from "@/lib/supabase/server";
import { CONSOLE_ORDER, type PanelConsoleKey } from "./consoles";
import { nivelEn, type ConsoleLevel } from "./niveles";

// Server-only helpers over `panel_users`. The table is service-role-only (RLS
// on, zero policies), so a user's own JWT can never read it — every access here
// goes through the service-role client. Never import this from a client component.

export type { ConsoleLevel } from "./niveles";

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

/** Lo que oye quien pulsó un botón cuando los permisos no se pudieron leer. */
export const PERMISOS_ILEGIBLES = "No se pudieron leer los permisos. Inténtalo de nuevo en un momento.";

/**
 * La lectura de la fila tiene TRES salidas, y quien la pide decide con las tres (2026-11-06):
 *   · `{ ok: true, row }`        la fila del colaborador: manda ella.
 *   · `{ ok: true, row: null }`  no hay fila: el `bcp_admin` de antes de `panel_users` (ver `grantedConsoles`).
 *   · `{ ok: false }`            no se pudieron leer los permisos: la consola no abre y la acción no se hace.
 * «No se pudo leer» nunca se trata como «no hay fila».
 */
export type LecturaDePanelUser = { ok: true; row: PanelUserRow | null } | { ok: false };

export async function leerPanelUser(profileId: string): Promise<LecturaDePanelUser> {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service.from("panel_users").select("*").eq("profile_id", profileId).maybeSingle();
    if (error) return { ok: false };
    return { ok: true, row: (data as PanelUserRow | null) ?? null };
  } catch {
    return { ok: false };
  }
}

/** ¿Es owner activo? Si los permisos no se pueden leer, la respuesta es NO (las decisiones del owner no se toman). */
export async function esOwnerDelPanel(profileId: string): Promise<boolean> {
  const lectura = await leerPanelUser(profileId);
  return lectura.ok && isPanelOwner(lectura.row);
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

/**
 * El NIVEL de una identidad en una consola. `grantedConsoles()` responde «¿entra?»; esto responde
 * «¿qué puede hacer dentro?» — y hasta la V5.57 nadie lo preguntaba (ver `./niveles.ts`).
 * Sin fila = el fundador de antes de `panel_users`: admin, igual que `grantedConsoles` lo deja entrar.
 */
export function nivelDeConsola(row: PanelUserRow | null, consola: PanelConsoleKey): ConsoleLevel | null {
  if (!row) return "admin";
  return nivelEn(row.consoles, consola);
}

/** True if this identity may manage collaborators. Grandfathered when no row. */
export function isPanelOwner(row: PanelUserRow | null): boolean {
  if (!row) return true;
  return row.is_owner && row.status === "active";
}
