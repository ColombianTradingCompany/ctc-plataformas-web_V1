import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { SociosClient, type PartnerRow } from "./SociosClient";

// Partner credentialing (owner-only): every partner-node credential is born and
// revoked here — "la credencial se emite desde el BCP y se revoca en un clic".
export default async function BcpSociosPage() {
  const identity = await requireConsoleAccess("ecp");
  if (!identity.isOwner) redirect("/ecp");

  const service = createServiceRoleClient();
  const { data } = await service.from("partner_accounts").select("*").order("created_at", { ascending: true });

  return <SociosClient partners={(data as PartnerRow[]) ?? []} />;
}
