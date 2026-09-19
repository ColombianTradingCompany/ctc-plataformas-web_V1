import "server-only";
import { createPanelSessionClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPanelUser, grantedConsoles, nivelDeConsola } from "@/lib/panel/panelUsers";
import { puede, type ClaseDeAccion } from "@/lib/panel/niveles";
import { consolaDelModulo } from "@/lib/panel/consoles";

/**
 * Compuerta de las Server Actions de Coffeed. Desde el 2026-07-30 el módulo
 * es INTERNO, no del socio Estudio de Contenido: la narrativa de la red la
 * decide CTC, y quien la opera es un operador con grant de la consola donde
 * Coffeed vive.
 *
 * ⚠️ ESA CONSOLA NO SE ESCRIBE AQUÍ (V5.60): se lee del rail con
 * `consolaDelModulo("coffeed")`. Este archivo se llama `requireEcp` porque nació
 * en el ECP; Coffeed pasó al BCP y la clave `"ecp"` que llevaba dentro era un
 * permiso sin barras, de los que ninguna mudanza de rutas toca. Si nadie enlaza
 * Coffeed en el rail, la compuerta CIERRA.
 *
 * Variante SIN redirect a propósito — una action devuelve {ok:false}, no
 * navega; el gate con redirect es el `requireConsoleAccess()` de la page. Lee
 * la sesión INTERNA (`createPanelSessionClient`, cookie propia).
 */
/** `clase` (V5.57): qué hace la acción. Por defecto `emite` — un «viewer» de la consola no publica en el Muro ni
 *  gasta en Redacción; las lecturas del tablero se declaran `"lectura"`. Ver `@/lib/panel/niveles`. */
export async function coffeedGate(clase: ClaseDeAccion = "emite"): Promise<{ userId: string } | null> {
  const session = await createPanelSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") return null;

  const row = await getPanelUser(user.id);
  if (row && row.status !== "active") return null;
  const consola = consolaDelModulo("coffeed");
  if (!consola) return null;
  if (!grantedConsoles(row).includes(consola)) return null;
  if (!puede(nivelDeConsola(row, consola), clase)) return null;

  return { userId: user.id };
}

/** El bucket y el prefijo del logo de marca (service-role, como gvg/). */
export const COFFEED_BUCKET = "kaffetal-media";
export const COFFEED_PREFIX = "coffeed";

export function coffeedServiceClient() {
  return createServiceRoleClient();
}
