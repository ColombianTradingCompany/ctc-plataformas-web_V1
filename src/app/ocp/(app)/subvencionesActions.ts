"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { insertEntryCode } from "@/lib/arena/entryCodes";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import type { ActionResult } from "@/components/panel/ActionForm";
import { SUBVENCION_MAX_PCT, SUBVENCION_MIN_PCT } from "@/lib/arena/subvencion";

// ── Campañas de Subvención (V5.77, owner 2026-09-24) ─────────────────────────
// Eran las «campañas de descuento» del Kaffetal Club (la página del Club en el BCP, hoy un 308 hasta aquí). El Club como
// membresía se retiró (PLAN_CIRCUITO_DEL_LOTE §3) y las campañas viven ahora en «OCP · Manejo de
// Stock Físico» con el nombre que el owner pidió. Lo que NO cambió: una campaña fija un % y emite
// códigos (`arena_entry_codes`, prefijo KRX-) que descuentan la tarifa de evaluación de una
// solicitud; los aplica CTCx en nombre del productor o los canjea él al solicitar. Lo que SÍ:
// la tarifa plana es $200.000 (respuesta 2 del owner) y la subvención va del **30 al 70 %**.
// Las tablas conservan su nombre (`club_campaigns`) — cambiar un nombre de tabla es DDL que nadie
// necesita; el vocabulario nuevo vive en las pantallas.

const PATHS = ["/ocp/subvenciones", "/ocp/a-evaluar", "/ocp/kr"];
function revalidar(campaignId?: string) {
  for (const p of PATHS) revalidatePath(p);
  if (campaignId) revalidatePath(`/ocp/subvenciones/campanas/${campaignId}`);
}

// Devuelve un resultado en vez de `throw` (auditoría 2026-08-13, ESTR-1): crear una campaña con un
// nombre repetido (23505) es un rechazo ALCANZABLE con un clic; el motivo sale inline en <ActionForm>.
export async function createCampaign(formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "La campaña necesita un nombre (ej. Fundadores)." };
  const discountPct = Math.trunc(Number(formData.get("discount_pct") || 0));
  if (!Number.isFinite(discountPct) || discountPct < SUBVENCION_MIN_PCT || discountPct > SUBVENCION_MAX_PCT) {
    return { ok: false, error: `La subvención va del ${SUBVENCION_MIN_PCT} % al ${SUBVENCION_MAX_PCT} % de la tarifa (owner, 2026-09-24).` };
  }

  const { data, error } = await service.from("club_campaigns").insert({ name, discount_pct: discountPct, created_by: adminId }).select("id").single();
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Ya existe una campaña con ese nombre." : "No se pudo crear la campaña: " + error.message };
  }

  await service.from("audit_log").insert({
    entity_type: "club_campaign",
    entity_id: data.id,
    action: "created",
    performed_by: adminId,
    notes: `${name} · subvención ${discountPct}%`,
  });
  revalidar();
  return { ok: true };
}

// Emite códigos de subvención (KRX-) con el % de la campaña. Dos modos:
//   · producer_id presente → 1 código asignado a ese productor (y una nota en su feed)
//   · producer_id ausente  → `cantidad` códigos anónimos para entregar en mano
export async function emitCampaignCodes(campaignId: string, formData: FormData): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("club_campaigns").select("id, name, discount_pct").eq("id", campaignId).maybeSingle();
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };

  const producerId = String(formData.get("producer_id") ?? "").trim() || null;
  const requested = Math.trunc(Number(formData.get("cantidad") || 1));
  const cantidad = producerId ? 1 : Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), 50);

  for (let i = 0; i < cantidad; i++) {
    let codeRow;
    try {
      codeRow = await insertEntryCode(service, {
        kind: "campana",
        prefix: "KRX",
        discountPct: campaign.discount_pct,
        campaignId: campaign.id,
        assignedTo: producerId,
        createdBy: adminId,
      });
    } catch {
      return { ok: false, error: "No se pudo generar el código." };
    }
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
        note: `CTCx le otorgó un código de subvención «${campaign.name}» del ${campaign.discount_pct}% sobre la tarifa de evaluación: ${codeRow.code}. Indíquelo al solicitar la evaluación de un lote.`,
        created_by: adminId,
      });
    }
  }
  revalidar(campaignId);
  return { ok: true };
}

// Resultado en vez de throw (ESTR-1): revocar un código que otra pestaña ya usó o revocó es una carrera alcanzable.
export async function revokeCampaignCode(codeId: string): Promise<ActionResult> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: revoked } = await service
    .from("arena_entry_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId)
    .is("redeemed_at", null)
    .is("revoked_at", null)
    .select("id, code, campaign_id");
  if (!revoked?.length) return { ok: false, error: "Este código ya fue usado o revocado." };

  await service.from("audit_log").insert({
    entity_type: "arena_entry_code",
    entity_id: codeId,
    action: "revoked",
    performed_by: adminId,
    notes: revoked[0].code,
  });
  revalidar(revoked[0].campaign_id ?? undefined);
  return { ok: true };
}

// `revokeClubMembership` se retiró en la V5.77 con el Club: `producer_profiles.club_member_since` queda
// dormida (nadie la lee como gate) hasta que una migración la retire.
