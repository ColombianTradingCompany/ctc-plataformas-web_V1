"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { sendPassportEmail } from "@/lib/email/clubEmails";

async function requireAdmin() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") throw new Error("No autorizado.");

  return user.id;
}

// No I/O/0/1 so a passport number survives being read over the phone or
// handwritten. 32 chars exactly -> byte % 32 has no modulo bias.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// KC- = standard passport (earned in the Arena). KCX- = campaign passport
// ("Fundadores", ...) -- the prefix is the internal tell that this kind
// bypasses the Arena gate; its meaning is never surfaced to producers.
function generateCode(prefix: "KC" | "KCX"): string {
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % 32];
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`;
}

type Service = ReturnType<typeof createServiceRoleClient>;

async function insertCode(
  service: Service,
  adminId: string,
  fields: { prefix: "KC" | "KCX"; kind: "estandar" | "campana"; campaign: string | null; note: string | null; assignedTo: string | null }
): Promise<{ id: string; code: string }> {
  // Retry on the (astronomically unlikely) unique collision instead of failing.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode(fields.prefix);
    const { data, error } = await service
      .from("club_member_codes")
      .insert({
        code,
        kind: fields.kind,
        campaign: fields.campaign,
        note: fields.note,
        created_by: adminId,
        assigned_to: fields.assignedTo,
        assigned_at: fields.assignedTo ? new Date().toISOString() : null,
      })
      .select("id, code")
      .single();
    if (!error) return data;
    if (error.code !== "23505") throw new Error("No se pudo emitir el Pasaporte: " + error.message);
  }
  throw new Error("No se pudo emitir el Pasaporte. Intente de nuevo.");
}

// Email + Retroalimentación note for an assigned passport. Email failures are
// persisted on the code row (leads pattern) so /bcp/club can show + retry them;
// the in-app note always lands.
async function deliverPassport(service: Service, codeRow: { id: string; code: string }, campaign: string | null, producerId: string) {
  const { data: producer } = await service.from("profiles").select("full_name, email").eq("id", producerId).maybeSingle();

  await service.from("producer_comm_log").insert({
    producer_id: producerId,
    context_label: null,
    note: `Su Pasaporte${campaign ? ` «${campaign}»` : ""} del Kaffetal Club fue emitido. Número de Pasaporte: ${codeRow.code}. Actívelo en "Mis contratos" para firmar contratos de compra con CTC y llevar sus lotes galardonados al catálogo activo y al mercado de Cherry Picked (Europa).`,
  });

  const result = producer?.email
    ? await sendPassportEmail({ nombre: producer.full_name || "productor", email: producer.email, code: codeRow.code, campaign })
    : ({ ok: false, error: "El productor no tiene correo registrado." } as const);

  await service
    .from("club_member_codes")
    .update(result.ok ? { email_sent_at: new Date().toISOString(), email_error: null } : { email_error: result.error })
    .eq("id", codeRow.id);
}

// Blocks emission when the producer is already in the pipeline or in the club.
async function assertAssignable(service: Service, producerId: string) {
  const { data: pp } = await service.from("producer_profiles").select("club_member_since").eq("profile_id", producerId).maybeSingle();
  if (pp?.club_member_since) throw new Error("Este productor ya es miembro del Kaffetal Club.");

  const { data: pending } = await service
    .from("club_member_codes")
    .select("id")
    .eq("assigned_to", producerId)
    .is("redeemed_by", null)
    .is("revoked_at", null)
    .limit(1);
  if (pending?.length) throw new Error("Este productor ya tiene un Pasaporte pendiente de confirmación.");
}

// Standard passport, from the kanban: only for producers with a galardón.
export async function emitPassportForProducer(producerId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  await assertAssignable(service, producerId);

  const { data: galardones } = await service.from("lots").select("id").eq("producer_id", producerId).eq("stage", "galardonado").limit(1);
  if (!galardones?.length) {
    throw new Error("Este productor aún no tiene un lote galardonado — el Pasaporte estándar se emite con el galardón.");
  }

  const codeRow = await insertCode(service, adminId, { prefix: "KC", kind: "estandar", campaign: null, note: null, assignedTo: producerId });
  await deliverPassport(service, codeRow, null, producerId);

  await service.from("audit_log").insert({
    entity_type: "club_member_code",
    entity_id: codeRow.id,
    action: "emitted_assigned",
    performed_by: adminId,
    notes: `${codeRow.code} → productor ${producerId}`,
  });

  revalidatePath("/bcp/club");
  revalidatePath("/bcp/productores");
}

// Campaign passport ("Fundadores", "Héroes de Temporada 202X", ...): bypasses
// the Arena gate. Optionally assigned to any producer (email + note go out);
// left unassigned it's a code to hand out at events -- first to redeem, wins.
export async function createCampaignPassport(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const campaign = String(formData.get("campaign") ?? "").trim();
  if (!campaign) throw new Error("La campaña necesita un nombre (ej. Fundadores).");
  const producerId = String(formData.get("producer_id") ?? "").trim() || null;

  if (producerId) await assertAssignable(service, producerId);

  const codeRow = await insertCode(service, adminId, { prefix: "KCX", kind: "campana", campaign, note: null, assignedTo: producerId });
  if (producerId) await deliverPassport(service, codeRow, campaign, producerId);

  await service.from("audit_log").insert({
    entity_type: "club_member_code",
    entity_id: codeRow.id,
    action: "campaign_created",
    performed_by: adminId,
    notes: `${codeRow.code} · ${campaign}${producerId ? ` → productor ${producerId}` : ""}`,
  });

  revalidatePath("/bcp/club");
  revalidatePath("/bcp/productores");
}

export async function resendPassportEmail(codeId: string) {
  await requireAdmin();
  const service = createServiceRoleClient();

  const { data: code } = await service
    .from("club_member_codes")
    .select("id, code, campaign, assigned_to, redeemed_by, revoked_at")
    .eq("id", codeId)
    .maybeSingle();
  if (!code?.assigned_to || code.redeemed_by || code.revoked_at) {
    throw new Error("Este Pasaporte no está pendiente de confirmación.");
  }

  const { data: producer } = await service.from("profiles").select("full_name, email").eq("id", code.assigned_to).maybeSingle();
  if (!producer?.email) throw new Error("El productor no tiene correo registrado.");

  const result = await sendPassportEmail({ nombre: producer.full_name || "productor", email: producer.email, code: code.code, campaign: code.campaign });
  await service
    .from("club_member_codes")
    .update(result.ok ? { email_sent_at: new Date().toISOString(), email_error: null } : { email_error: result.error })
    .eq("id", code.id);
  if (!result.ok) throw new Error("El reenvío falló: " + result.error);

  revalidatePath("/bcp/club");
}

export async function revokeClubCode(codeId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  // Only unredeemed codes can be revoked -- an active one is already history;
  // to remove the member, use revokeClubMembership instead.
  const { data: revoked } = await service
    .from("club_member_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId)
    .is("redeemed_by", null)
    .is("revoked_at", null)
    .select("id, code");
  if (!revoked?.length) throw new Error("Este Pasaporte ya fue activado o revocado.");

  await service.from("audit_log").insert({
    entity_type: "club_member_code",
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

  const { error } = await service
    .from("producer_profiles")
    .update({ club_member_since: null })
    .eq("profile_id", producerId);
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
