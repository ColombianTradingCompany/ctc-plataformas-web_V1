import "server-only";
import { createPanelSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPanelUser, grantedConsoles } from "./panelUsers";
import type { PanelConsoleKey } from "./consoles";

/**
 * Compuerta de ESCRITURA por consola. `requireActiveAdmin` comprueba que quien
 * escribe sea un `bcp_admin` activo, pero no MIRA a qué consola tiene acceso —
 * suficiente mientras todas las Server Actions eran del BCP. Con módulos propios
 * en OCP y ECP hace falta la versión fina: un colaborador con grant solo de BCP
 * no debe poder emitir una cotización del OCP por llamar la action a mano.
 *
 * Variante sin redirect (devuelve null): las actions responden {ok:false}, no
 * navegan. El gate con redirect para las pages sigue siendo
 * `requireConsoleAccess`.
 */
export async function requireConsoleWrite(consoleKey: PanelConsoleKey): Promise<{ userId: string } | null> {
  const session = await createPanelSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "bcp_admin") return null;

  const row = await getPanelUser(user.id);
  if (row && row.status !== "active") return null;
  if (!grantedConsoles(row).includes(consoleKey)) return null;

  return { userId: user.id };
}

export function quoteServiceClient() {
  return createServiceRoleClient();
}
