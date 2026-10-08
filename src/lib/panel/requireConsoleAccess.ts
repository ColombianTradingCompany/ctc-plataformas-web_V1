import { redirect } from "next/navigation";
import { createPanelSessionClient } from "@/lib/supabase/server";
import type { PanelConsoleKey } from "./consoles";
import { getPanelUser, grantedConsoles, isPanelOwner, nivelDeConsola } from "./panelUsers";
import type { ConsoleLevel } from "./niveles";

export type PanelIdentity = {
  userId: string;
  displayName: string;
  /** Which internal consoles this identity may enter. */
  consoles: PanelConsoleKey[];
  /** May this identity manage collaborators (/bcp/usuarios)? */
  isOwner: boolean;
  /** El nivel en cada consola concedida (V5.57): la concha lo usa para decir «Lectura y borradores». */
  niveles: Partial<Record<PanelConsoleKey, ConsoleLevel>>;
};

/**
 * Authenticate an internal operator and load their access, WITHOUT gating on a
 * specific console. Two layers: `profiles.role='bcp_admin'` is the coarse gate;
 * the `panel_users` row adds status (suspended ⇒ bounced instantly on the next
 * navigation) and the per-console grant. A suspended collaborator keeps the role
 * but is rejected here. Partner accounts are a separate tier — never here.
 */
// V5.192: la identidad se LEE en un solo sitio; quien la exige redirige (`loadPanelIdentity`) y quien solo pregunta, no
// (`tieneConsola`). Las mismas reglas para las dos: rol, fila activa, contraseña ya cambiada.
type LecturaDeIdentidad = { ok: true; identity: PanelIdentity } | { ok: false; destino: "/login" | "/cambiar-contrasena" };

async function leerIdentidad(): Promise<LecturaDeIdentidad> {
  const session = await createPanelSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, destino: "/login" };

  const { data: profile } = await session
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "bcp_admin") return { ok: false, destino: "/login" };

  const row = await getPanelUser(user.id);
  if (row && row.status !== "active") return { ok: false, destino: "/login" }; // suspended / not-yet-activated
  // Security follow-up: a fresh/reset temp password must be replaced before any
  // console is usable. The page does its own light auth (no loop through here).
  if (row?.must_change_password) return { ok: false, destino: "/cambiar-contrasena" };

  return {
    ok: true,
    identity: {
      userId: user.id,
      displayName: row?.display_name ?? profile.full_name ?? profile.email ?? "",
      consoles: grantedConsoles(row),
      isOwner: isPanelOwner(row),
      niveles: Object.fromEntries(
        grantedConsoles(row).flatMap((k) => {
          const n = nivelDeConsola(row, k);
          return n ? [[k, n]] : [];
        }),
      ),
    },
  };
}

async function loadPanelIdentity(): Promise<PanelIdentity> {
  const r = await leerIdentidad();
  if (!r.ok) redirect(r.destino);
  return r.identity;
}

/**
 * V5.192 (owner): ¿hay aquí un operador ACTIVO con acceso a esta consola? Sin redirigir: es la SEGUNDA llave de una página que no
 * es de la consola — el Dossier y la Visa de un lote son del productor (Kaffetal Regal) y el OCP los abre desde la vista del lote.
 * La cookie del panel se comparte entre subdominios (`sharedCookieDomain`). Solo LECTURA: no reemplaza a ninguna compuerta de escritura.
 */
export async function tieneConsola(consoleKey: PanelConsoleKey): Promise<boolean> {
  try {
    const r = await leerIdentidad();
    return r.ok && r.identity.consoles.includes(consoleKey);
  } catch {
    return false;
  }
}

/**
 * Read-path gate for a specific console shell (BCP / ECP / OCP). Redirects to the
 * master login if not an active internal operator, or to the selector if authenticated
 * but without a grant for THIS console. Does NOT replace the independent
 * `requireAdmin()` re-check inside every Server Action.
 */
export async function requireConsoleAccess(consoleKey: PanelConsoleKey): Promise<PanelIdentity> {
  const identity = await loadPanelIdentity();
  if (!identity.consoles.includes(consoleKey)) redirect("/panel");
  return identity;
}

/** Identity-only variant for the neutral console selector (`/panel`). No console gate. */
export async function requirePanelIdentity(): Promise<PanelIdentity> {
  return loadPanelIdentity();
}
