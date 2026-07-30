import "server-only";
import { createPanelSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPanelUser, grantedConsoles } from "@/lib/panel/panelUsers";

/**
 * Compuerta de las Server Actions de Coffeed. Desde el 2026-07-30 el módulo
 * vive en el **ECP** (dirección), no en el socio Estudio de Contenido: la
 * narrativa de la red la decide CTC, y quien la opera es un operador interno
 * con grant de `ecp`.
 *
 * Variante SIN redirect a propósito — una action devuelve {ok:false}, no
 * navega; el gate con redirect sigue siendo `requireConsoleAccess("ecp")` en
 * la page. Lee la sesión INTERNA (`createPanelSessionClient`, cookie propia).
 */
export async function coffeedGate(): Promise<{ userId: string } | null> {
  const session = await createPanelSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") return null;

  const row = await getPanelUser(user.id);
  if (row && row.status !== "active") return null;
  if (!grantedConsoles(row).includes("ecp")) return null;

  return { userId: user.id };
}

/** El bucket y el prefijo del logo de marca (service-role, como gvg/). */
export const COFFEED_BUCKET = "kaffetal-media";
export const COFFEED_PREFIX = "coffeed";

export function coffeedServiceClient() {
  return createServiceRoleClient();
}
