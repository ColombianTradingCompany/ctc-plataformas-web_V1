"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// ── Terratalento · la lista de espera PRE-LANZAMIENTO (A6, 2026-08-19) ───────
// Terratalento es la única puerta de la red que todavía no abre, así que lo que
// se recoge aquí NO es una lista de correo: es material de investigación. Un
// correo suelto solo sirve para avisar; `rol` + `municipio` contestan la
// pregunta que de verdad importa antes de abrir —dónde hay manos y de qué lado
// están—, y esa respuesta no se puede reconstruir después.
//
// POR ESO TIENE TABLA PROPIA y no una fila más en `newsletter_subscribers`
// (decisión del owner): dos columnas que solo usaría una fuente habrían quedado
// nulas en las otras cuatro, y la tabla habría dejado de significar una cosa.
//
// `terratalento_interes` es service-role-only (RLS encendida, CERO políticas),
// igual que `newsletter_subscribers`. Esta acción es su única escritora pública.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Las dos orillas de Terratalento. Cerrada a propósito: el `check` de la
 *  columna dice lo mismo en la base, y si alguien manda otra cosa se rechaza
 *  aquí con un mensaje en vez de reventar contra la restricción. */
const ROLES = ["recolector", "finca"] as const;
type Rol = (typeof ROLES)[number];

export type InteresTtPayload = {
  email: string;
  rol: string;
  municipio: string;
  lang?: string;
  website?: string; // señuelo para bots
};

export type InteresTtResult = { ok: true } | { ok: false; error: "invalid" | "failed" };

export async function registrarInteresTerratalento(payload: InteresTtPayload): Promise<InteresTtResult> {
  // Señuelo: se finge que salió bien para que un bot no aprenda nada.
  if (payload.website) return { ok: true };

  const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 320);
  const rol = payload.rol as Rol;
  const municipio = String(payload.municipio ?? "").trim().slice(0, 120);
  if (!EMAIL_RE.test(email) || !ROLES.includes(rol) || !municipio) return { ok: false, error: "invalid" };
  const lang = ["en", "es", "de"].includes(payload.lang ?? "") ? payload.lang : null;

  const service = createServiceRoleClient();
  // `(email, rol)` es la clave única: la misma persona puede apuntarse como
  // recolector Y por su finca, que son dos intenciones distintas, pero no dos
  // veces por lo mismo.
  const { error } = await service
    .from("terratalento_interes")
    .upsert({ email, rol, municipio, lang }, { onConflict: "email,rol", ignoreDuplicates: true });

  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}

// ── Lo único que el tablero escribe ─────────────────────────────────────────
// Misma regla que las otras listas de espera (V4.29): solo se persiste lo que
// ninguna regla puede deducir de la fila. Aquí eso es un dato — si ya se le
// escribió a esa persona. Se puede DESMARCAR: en una tanda de envíos, marcar de
// más es tan fácil como marcar de menos.
export async function marcarInteresTtContactado(
  interesId: string,
  contactado: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: fila } = await service
    .from("terratalento_interes")
    .select("id")
    .eq("id", interesId)
    .maybeSingle();
  if (!fila) return { ok: false, error: "Esa persona ya no está en la lista." };

  const { error } = await service
    .from("terratalento_interes")
    .update(
      contactado
        ? { contacted_at: new Date().toISOString(), contacted_by: adminId }
        : { contacted_at: null, contacted_by: null }
    )
    .eq("id", interesId);
  if (error) return { ok: false, error: "No se pudo guardar." };

  await service.from("audit_log").insert({
    entity_type: "terratalento_interes",
    entity_id: interesId,
    action: contactado ? "contacted" : "contact_undone",
    performed_by: adminId,
  });

  revalidatePath("/ecp/terratalento");
  return { ok: true };
}
