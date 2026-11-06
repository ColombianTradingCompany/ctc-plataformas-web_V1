import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireConsoleAccess, type PanelIdentity } from "@/lib/panel/requireConsoleAccess";

// ── ECP · Modelo Económico · solo del owner (V6.20) · SOLO SERVIDOR ──────────
// El Modelo Económico es solo del owner en todas las consolas (decisión del owner del 5 nov; en la CTCx OS desde la V6.19).
// La regla vive en cada pieza del módulo, no solo en el rail (`ownerOnly` de `/ecp/pvc` en `consoles.ts`): la pide el layout
// de `/ecp/pvc`, cada página y cada route handler, antes de leer nada. La identidad sale de `requireConsoleAccess("ecp")`
// (`isOwner` = `isPanelOwner`, la misma fuente que las escrituras del PVC y que la OS). Sin sesión, la compuerta de la consola
// manda al login como siempre. La vigila `qa-pvc-owner-check`. No escribe.

/** Páginas y layout: quien no es el owner vuelve al Panel del ECP. Una lectura de identidad por petición (`cache`). */
export const exigirOwnerDelPvc = cache(async (): Promise<PanelIdentity> => {
  const identity = await requireConsoleAccess("ecp");
  if (!identity.isOwner) redirect("/ecp");
  return identity;
});

/** Route handlers: la misma regla, sin redirigir; quien la llama responde 403 si es `false`. */
export async function esOwnerDelPvc(): Promise<boolean> {
  const identity = await requireConsoleAccess("ecp");
  return identity.isOwner;
}

/** El texto del 403 de los route handlers del módulo. */
export const SOLO_OWNER_PVC = "El Modelo Económico es solo del owner.";
