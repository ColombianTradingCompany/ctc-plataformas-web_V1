import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import type { PanelUserRow } from "@/lib/panel/panelUsers";
import { UsuariosClient } from "./UsuariosClient";

// Collaborator management (owner-only). Identity is BCP's job in the v3 model,
// so this lives under BCP. panel_users is service-role-only, so the list is read
// with the service client here on the server.
export default async function BcpUsuariosPage() {
  const identity = await requireConsoleAccess("ecp");
  if (!identity.isOwner) redirect("/ecp");

  const service = createServiceRoleClient();
  const { data } = await service.from("panel_users").select("*").order("created_at", { ascending: true });
  const users = (data as PanelUserRow[]) ?? [];

  return <UsuariosClient users={users} currentUserId={identity.userId} />;
}
