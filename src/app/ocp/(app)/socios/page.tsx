import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { SociosClient, type PartnerRow } from "./SociosClient";

// Credenciales de los nodos partner (owner-only): aquí nace y se revoca cada una,
// "en un clic". Vive en el OCP desde 2026-07-20 porque los socios se administran
// donde se OPERAN — el OCP es el espejo de sus interfaces. El gate de owner se
// impone aquí, aparte de que el nav esconda el enlace.
export default async function OcpSociosPage() {
  const identity = await requireConsoleAccess("ocp");
  if (!identity.isOwner) redirect("/ocp");

  const service = createServiceRoleClient();
  const { data } = await service.from("partner_accounts").select("*").order("created_at", { ascending: true });

  return <SociosClient partners={(data as PartnerRow[]) ?? []} />;
}
