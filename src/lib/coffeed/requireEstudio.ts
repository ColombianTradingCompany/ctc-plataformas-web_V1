import "server-only";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

export type EstudioIdentity = { userId: string; orgName: string };

/**
 * Compuerta de las Server Actions de Coffeed: el editor es la credencial del
 * socio **Estudio de Contenido** (profiles.role='partner' + fila ACTIVA en
 * partner_accounts con node_type='estudio-contenido'). Variante sin redirect
 * a propósito — una action devuelve {ok:false}, no navega; el gate con
 * redirect sigue siendo requirePartner() en la page.
 */
export async function estudioGate(): Promise<EstudioIdentity | null> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "partner") return null;

  const service = createServiceRoleClient();
  const { data: account } = await service
    .from("partner_accounts")
    .select("org_name, node_type, status")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!account || account.node_type !== "estudio-contenido" || account.status !== "active") return null;

  return { userId: user.id, orgName: account.org_name as string };
}
