import { redirect } from "next/navigation";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import type { PartnerSlug } from "./partners";

export type PartnerIdentity = {
  userId: string;
  orgName: string;
  contactName: string | null;
  email: string;
};

/**
 * Read-path gate for a partner panel. A partner is `profiles.role='partner'`
 * plus an ACTIVE `partner_accounts` row for EXACTLY this node — never bcp_admin,
 * and a Centro de Calidad credential opens nothing else (the v3 permission
 * matrix's coarse cut). partner_accounts is service-role-only, so the row is
 * read with the service client after the session check.
 */
export async function requirePartner(slug: PartnerSlug): Promise<PartnerIdentity> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect(`/socios/${slug}/acceso`);

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "partner") redirect(`/socios/${slug}/acceso`);

  const service = createServiceRoleClient();
  const { data: account } = await service
    .from("partner_accounts")
    .select("org_name, contact_name, email, node_type, status")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!account || account.node_type !== slug || account.status !== "active") {
    redirect(`/socios/${slug}/acceso`);
  }

  return { userId: user.id, orgName: account.org_name, contactName: account.contact_name, email: account.email };
}
