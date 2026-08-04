import "server-only";
import { createPanelSessionClient, createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { getPanelUser, grantedConsoles } from "@/lib/panel/panelUsers";

/**
 * Compuerta de PRODUCCIÓN del Estudio de Contenido (Source Wrapper, Datawave y,
 * más adelante, Identity Value Creation).
 *
 * Reparto del 2026-08-03: **producir** es del Estudio, **publicar** sigue siendo
 * del ECP (`coffeedGate` en ./requireEcp). La regla del owner —"la narrativa se
 * dirige desde dentro, su producción es lo que se delega"— queda intacta: esta
 * compuerta no abre el Muro ni la Identidad de marca, solo las apps de taller.
 *
 * Abre para DOS identidades, a propósito:
 *   · el socio `estudio-contenido` (cookie PÚBLICA, `createSessionClient`)
 *   · un operador interno con grant de `ecp` (cookie del panel, `ctc-panel-auth`)
 *
 * El segundo caso no es un atajo: sin él, el día que la credencial del socio se
 * suspenda —o antes de que exista un socio real— nadie en CTC puede entrar al
 * taller que CTC misma opera. Son cookies distintas y no se mezclan nunca
 * (lección de la sesión compartida del panel): se prueban en orden.
 */

export type StudioIdentity = {
  userId: string;
  /** Quién entró: cambia la cabecera y de quién se firma la entrega. */
  via: "partner" | "ecp";
  displayName: string;
};

const STUDIO_NODE = "estudio-contenido";

/** Variante SIN redirect — para Server Actions, que devuelven {ok:false}. */
export async function studioGate(): Promise<StudioIdentity | null> {
  // 1. Operador interno con acceso al ECP.
  const panel = await createPanelSessionClient();
  const {
    data: { user: panelUser },
  } = await panel.auth.getUser();
  if (panelUser) {
    const { data: profile } = await panel.from("profiles").select("role, full_name, email").eq("id", panelUser.id).maybeSingle();
    if (profile?.role === "bcp_admin") {
      const row = await getPanelUser(panelUser.id);
      if ((!row || row.status === "active") && grantedConsoles(row).includes("ecp")) {
        return {
          userId: panelUser.id,
          via: "ecp",
          displayName: (profile.full_name as string | null) ?? (profile.email as string | null) ?? "CTC",
        };
      }
    }
  }

  // 2. Socio Estudio de Contenido, credencial activa para ESE nodo.
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "partner") return null;

  const service = createServiceRoleClient();
  const { data: account } = await service
    .from("partner_accounts")
    .select("org_name, contact_name, node_type, status")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!account || account.node_type !== STUDIO_NODE || account.status !== "active") return null;

  return {
    userId: user.id,
    via: "partner",
    displayName: (account.contact_name as string | null) ?? (account.org_name as string),
  };
}

/** El mismo gate para las pages: null ⇒ la page decide a dónde mandar. */
export async function getStudioIdentity(): Promise<StudioIdentity | null> {
  return studioGate();
}
