"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { insertEntryCode } from "@/lib/arena/entryCodes";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

// Kaffetal Club, modelo 2026-07-17: la membresía se otorga AUTOMÁTICAMENTE
// cuando un lote del productor compite en una jornada de Arena (ver
// finalizeJornada). Ya no hay Pasaportes emitidos a mano ni códigos de
// membresía. Lo que sobrevive aquí:
//   · Campañas de descuento: cada una carga un % y emite CÓDIGOS DE ENTRADA a
//     la Arena (KRX-), que el productor aplica al postular para descontar la
//     inscripción (ver entryCodes.ts / producerActions.ts).
//   · El ledger de miembros (retirar la membresía).

async function requireAdmin() {
  return requireActiveAdmin();
}

// Una campaña ("Fundadores", ...) agrupa los códigos de descuento emitidos bajo
// ella y fija su porcentaje. Se crea aquí, se gestiona en /bcp/club/campanas/[id].
export async function createCampaign(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("La campaña necesita un nombre (ej. Fundadores).");
  const discountPct = Math.min(Math.max(Math.trunc(Number(formData.get("discount_pct") || 0)), 0), 100);

  const { data, error } = await service.from("club_campaigns").insert({ name, discount_pct: discountPct, created_by: adminId }).select("id").single();
  if (error) {
    throw new Error(error.code === "23505" ? "Ya existe una campaña con ese nombre." : "No se pudo crear la campaña: " + error.message);
  }

  await service.from("audit_log").insert({
    entity_type: "club_campaign",
    entity_id: data.id,
    action: "created",
    performed_by: adminId,
    notes: `${name} · ${discountPct}%`,
  });

  revalidatePath("/bcp/club");
}

// Emite códigos de entrada (KRX-) con el descuento de la campaña. Dos modos:
//   · producer_id presente → 1 código asignado a ese productor
//   · producer_id ausente  → `cantidad` códigos anónimos para entregar en mano
export async function emitCampaignCodes(campaignId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("club_campaigns").select("id, name, discount_pct").eq("id", campaignId).maybeSingle();
  if (!campaign) throw new Error("Campaña no encontrada.");

  const producerId = String(formData.get("producer_id") ?? "").trim() || null;
  const requested = Math.trunc(Number(formData.get("cantidad") || 1));
  const cantidad = producerId ? 1 : Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), 50);

  for (let i = 0; i < cantidad; i++) {
    const codeRow = await insertEntryCode(service, {
      kind: "campana",
      prefix: "KRX",
      discountPct: campaign.discount_pct,
      campaignId: campaign.id,
      assignedTo: producerId,
      createdBy: adminId,
    });
    await service.from("audit_log").insert({
      entity_type: "arena_entry_code",
      entity_id: codeRow.id,
      action: "campaign_emitted",
      performed_by: adminId,
      notes: `${codeRow.code} · ${campaign.name} (${campaign.discount_pct}%)${producerId ? ` → productor ${producerId}` : ""}`,
    });
    if (producerId) {
      await service.from("producer_comm_log").insert({
        producer_id: producerId,
        context_label: null,
        note: `CTC le otorgó un código de campaña «${campaign.name}» con ${campaign.discount_pct}% de descuento en la inscripción de Arena: ${codeRow.code}. Aplíquelo al postular un lote.`,
        created_by: adminId,
      });
    }
  }

  revalidatePath("/bcp/club");
  revalidatePath(`/bcp/club/campanas/${campaignId}`);
}

export async function revokeCampaignCode(codeId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: revoked } = await service
    .from("arena_entry_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId)
    .is("redeemed_at", null)
    .is("revoked_at", null)
    .select("id, code");
  if (!revoked?.length) throw new Error("Este código ya fue usado o revocado.");

  await service.from("audit_log").insert({
    entity_type: "arena_entry_code",
    entity_id: codeId,
    action: "revoked",
    performed_by: adminId,
    notes: revoked[0].code,
  });

  revalidatePath("/bcp/club");
}

export async function revokeClubMembership(producerId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { error } = await service.from("producer_profiles").update({ club_member_since: null }).eq("profile_id", producerId);
  if (error) throw new Error("No se pudo retirar la membresía.");

  await service.from("audit_log").insert({
    entity_type: "club_membership",
    entity_id: producerId,
    action: "membership_revoked",
    performed_by: adminId,
  });

  revalidatePath("/bcp/club");
  revalidatePath("/bcp/productores");
}
