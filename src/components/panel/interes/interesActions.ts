"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// ── Listas de espera (Roast · X · CTC Home) · lo ÚNICO que escriben ─────────
// Marcar que ya se le escribió a alguien de la lista de espera. Es el único
// dato que la fila no puede deducir; todo lo demás —idioma, antigüedad,
// recuentos— se calcula al leer (regla que dejó CRM CP Green, V4.29).
//
// Se puede DESMARCAR a propósito: en una jornada de envíos masivos, marcar de
// más es tan fácil como marcar de menos, y un tablero del que no se puede
// volver atrás acaba siendo un tablero en el que nadie confía.

export async function marcarContactado(
  subscriberId: string,
  contactado: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { data: fila } = await service
    .from("newsletter_subscribers")
    .select("id, source")
    .eq("id", subscriberId)
    .maybeSingle();
  if (!fila) return { ok: false, error: "Esa persona ya no está en la lista." };

  const { error } = await service
    .from("newsletter_subscribers")
    .update(
      contactado
        ? { contacted_at: new Date().toISOString(), contacted_by: adminId }
        : { contacted_at: null, contacted_by: null }
    )
    .eq("id", subscriberId);
  if (error) return { ok: false, error: "No se pudo guardar." };

  await service.from("audit_log").insert({
    entity_type: "newsletter_subscriber",
    entity_id: subscriberId,
    action: contactado ? "contacted" : "contact_undone",
    performed_by: adminId,
  });

  // Se revalidan los TRES tableros: la fila pertenece a UNA fuente, pero saber
  // cuál exige leerla, y revalidar de más aquí no cuesta nada. Revalidar de
  // MENOS, en cambio, no avisa — deja el otro tablero con datos rancios.
  // ⚠️ Y ojo: el de CTC Home vive en OTRA CONSOLA. Añadir una fuente y olvidar
  // su `revalidatePath` es justo el fallo mudo de esta familia, así que
  // `qa-crm-interes-check.mjs` exige uno por cada fuente declarada.
  revalidatePath("/ocp/crm/roast");
  revalidatePath("/ocp/crm/x");
  revalidatePath("/ecp/ctc-home");
  return { ok: true };
}
