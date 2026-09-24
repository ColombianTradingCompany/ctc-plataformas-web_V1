import { redirect } from "next/navigation";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import type { PartnerSlug } from "./partners";

export type PartnerModulos = { evaluacion?: boolean; procesamiento?: boolean };

export type PartnerIdentity = {
  userId: string;
  orgName: string;
  contactName: string | null;
  email: string;
  /** V5.81 (respuesta 5 del owner): qué módulos tiene activos esta credencial (`partner_accounts.modulos`). */
  modulos: PartnerModulos;
};

/**
 * La identidad de un socio, o null. Un socio es `profiles.role='partner'` más una fila ACTIVA de
 * `partner_accounts` para EXACTAMENTE este nodo — nunca bcp_admin, y una credencial del Centro de Calidad no
 * abre nada más (el corte grueso de la matriz v3). `partner_accounts` es solo service role, así que la fila se
 * lee con el cliente de servicio tras comprobar la sesión. Las Server Actions usan ESTA función (devuelven un
 * resultado en vez de redirigir); las páginas usan `requirePartner`, que redirige.
 */
export async function getPartnerIdentity(slug: PartnerSlug): Promise<PartnerIdentity | null> {
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
    .select("org_name, contact_name, email, node_type, status, modulos")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!account || account.node_type !== slug || account.status !== "active") return null;

  const modulos = (account.modulos && typeof account.modulos === "object" ? account.modulos : {}) as PartnerModulos;
  return { userId: user.id, orgName: account.org_name, contactName: account.contact_name, email: account.email, modulos };
}

/** Read-path gate for a partner panel: redirige a `/socios/<slug>/acceso` si falta cualquiera de las tres condiciones. */
export async function requirePartner(slug: PartnerSlug): Promise<PartnerIdentity> {
  const identity = await getPartnerIdentity(slug);
  if (!identity) redirect(`/socios/${slug}/acceso`);
  return identity;
}
