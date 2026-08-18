"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { esEtapaValida } from "@/lib/crm/etapaComprador";

// ── CRM CP Green · el único dato que este tablero escribe ───────────────────
// Y es a propósito que sea uno solo: la etapa se DEDUCE de los pedidos (D3.2),
// así que lo único que un humano puede aportar es la EXCEPCIÓN — y eso es lo
// que se guarda. `null` devuelve al comprador a la regla.

export async function setEtapaComprador(
  profileId: string,
  etapa: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireActiveAdmin();
  if (etapa !== null && !esEtapaValida(etapa)) return { ok: false, error: "Etapa inválida." };

  const service = createServiceRoleClient();
  const { data: comprador } = await service
    .from("buyer_profiles")
    .select("profile_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!comprador) return { ok: false, error: "Comprador no encontrado." };

  const { error } = await service
    .from("buyer_profiles")
    .update({ crm_stage: etapa })
    .eq("profile_id", profileId);
  if (error) return { ok: false, error: "No se pudo guardar la etapa." };

  await service.from("audit_log").insert({
    entity_type: "buyer_profile",
    entity_id: profileId,
    action: etapa ? "crm_stage_overridden" : "crm_stage_reset",
    new_status: etapa,
    performed_by: adminId,
    notes: etapa ? null : "vuelve a la etapa que dictan los pedidos",
  });

  revalidatePath("/ocp/crm/green");
  return { ok: true };
}
