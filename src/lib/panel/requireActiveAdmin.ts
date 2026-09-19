import { createPanelSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { CONSOLES, type PanelConsoleKey } from "./consoles";
import { getPanelUser, grantedConsoles, nivelDeConsola } from "./panelUsers";
import { mensajeSoloLectura, puede, type ClaseDeAccion } from "./niveles";

/**
 * Write-path gate shared by every BCP Server Action. Verifies the session user is
 * a `bcp_admin` AND — since panel_users (2026-07-15) — that their collaborator row
 * is still `active`, so suspending someone revokes their Server Actions instantly
 * (not just navigation). A bcp_admin with no row predates panel_users and is
 * grandfathered. Throws on failure; returns the admin's user id.
 */
export async function requireActiveAdmin(): Promise<string> {
  const session = await createPanelSessionClient();
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

export type Permiso = { ok: true; userId: string } | { ok: false; error: string };

/**
 * La compuerta de ESCRITURA de las acciones que nacieron detrás de `requireActiveAdmin()` (V5.57).
 *
 * `requireActiveAdmin()` no mira ni la consola ni el nivel: sirve para LEER. Todo lo que escribe pasa por
 * aquí, diciendo en qué consola vive y qué hace (`./niveles.ts`): un «viewer» pasa `borrador` y no `emite`.
 *
 * DOS SALIDAS, A PROPÓSITO DISTINTAS:
 *   · sin sesión, sin rol o suspendido → **lanza**, igual que antes. No es alcanzable desde una pantalla
 *     legítima (la página ya redirigió al login): es alguien llamando la action a mano.
 *   · con sesión pero sin nivel → **devuelve** `{ ok:false, error }`. ESO sí es alcanzable —un viewer
 *     pulsando un botón— y un `throw` en una Server Action tumba la página y producción redacta el mensaje.
 *
 * `consola` admite varias cuando una action sirve a más de un tablero (la lista de espera vive en el OCP
 * y en el ECP): basta con poder en UNA.
 */
export async function permisoDeEscritura(
  consola: PanelConsoleKey | PanelConsoleKey[],
  clase: Exclude<ClaseDeAccion, "lectura"> = "emite",
): Promise<Permiso> {
  const userId = await requireActiveAdmin();
  const row = await getPanelUser(userId);
  const consolas = Array.isArray(consola) ? consola : [consola];
  const concedidas = grantedConsoles(row);
  const vale = consolas.some((k) => concedidas.includes(k) && puede(nivelDeConsola(row, k), clase));
  if (vale) return { ok: true, userId };
  return { ok: false, error: mensajeSoloLectura(consolas.map((k) => CONSOLES[k].code).join(" / ")) };
}
