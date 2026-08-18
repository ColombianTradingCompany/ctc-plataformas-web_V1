import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { SociosClient, type PartnerRow } from "./SociosClient";

// Credenciales de los nodos partner (owner-only): aquí nace y se revoca cada
// una, «en un clic».
//
// Vivió en el OCP desde 2026-07-20 con el argumento de que un socio se
// administra donde se OPERA. La reorganización V5 se quedó con el contrario y
// lo trajo al BCP en PR-B (V4.25): **emitir una credencial es configurar la
// red**, y eso es el negocio. Lo que el socio HACE sigue siendo del OCP.
//
// Desde V4.31 cada nodo tiene además su FICHA en `/bcp/socios/<nodo>`: el
// estado de sus credenciales de un vistazo, sus puertas de entrada y lo que
// sella en el pasaporte. Este tablero conserva las ACCIONES (alta, baja,
// reenvío); la ficha solo mira.
export default async function BcpSociosPage() {
  const identity = await requireConsoleAccess("bcp");
  if (!identity.isOwner) redirect("/bcp");

  const service = createServiceRoleClient();
  const { data } = await service.from("partner_accounts").select("*").order("created_at", { ascending: true });

  return <SociosClient partners={(data as PartnerRow[]) ?? []} />;
}
