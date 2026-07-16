"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPassportEmail } from "@/lib/email/clubEmails";
import { ARENA_FEE_COP, formatCop, producerHasSettledInscription } from "@/lib/arena/inscriptions";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";

async function requireAdmin() {
  // Delegates to the shared write-path gate (bcp_admin + panel_users.status),
  // so suspending a collaborator revokes Server Actions instantly.
  return requireActiveAdmin();
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

// PostgREST returns the campaign join as an object for a many-to-one FK, but
// the client's inferred TS type says array -- accept either shape.
function joinedCampaignName(c: unknown): string | null {
  const row = Array.isArray(c) ? c[0] : c;
  return (row as { name?: string } | null | undefined)?.name ?? null;
}

async function insertCode(
  service: Service,
  adminId: string,
  fields: { prefix: "KC" | "KCX"; kind: "estandar" | "campana"; campaignId: string | null; note: string | null; assignedTo: string | null }
): Promise<{ id: string; code: string }> {
  // Retry on the (astronomically unlikely) unique collision instead of failing.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode(fields.prefix);
    const { data, error } = await service
      .from("club_member_codes")
      .insert({
        code,
        kind: fields.kind,
        campaign_id: fields.campaignId,
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

// Standard passport, from the kanban: for producers whose Arena inscription is
// settled (paid, discounted or exempted) — the passport is the paid entry ticket.
export async function emitPassportForProducer(producerId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  await assertAssignable(service, producerId);

  // Desde 2026-07-16 el Pasaporte es la ENTRADA PAGADA, no el premio: se emite
  // cuando el productor tiene al menos una inscripción de Arena saldada (pagada,
  // descontada o eximida), no cuando gana un galardón. Los Pasaportes de campaña
  // (KCX-) siguen siendo la vía gratuita/marketing y no pasan por aquí.
  if (!(await producerHasSettledInscription(service, producerId))) {
    throw new Error(
      "Este productor aún no tiene una inscripción de Arena saldada — confirma el pago, aplica un descuento o exímelo antes de emitir el Pasaporte."
    );
  }

  const codeRow = await insertCode(service, adminId, { prefix: "KC", kind: "estandar", campaignId: null, note: null, assignedTo: producerId });
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

// A campaign ("Fundadores", "Héroes de Temporada 202X", ...) roots the
// passports emitted under it -- created here, managed in /bcp/club/campanas/[id].
export async function createCampaign(formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("La campaña necesita un nombre (ej. Fundadores).");

  const { data, error } = await service.from("club_campaigns").insert({ name, created_by: adminId }).select("id").single();
  if (error) {
    throw new Error(error.code === "23505" ? "Ya existe una campaña con ese nombre." : "No se pudo crear la campaña: " + error.message);
  }

  await service.from("audit_log").insert({
    entity_type: "club_campaign",
    entity_id: data.id,
    action: "created",
    performed_by: adminId,
    notes: name,
  });

  revalidatePath("/bcp/club");
}

// Campaign passports bypass the Arena gate. Two distinct modes, one per form
// in /bcp/club/campanas/[id]:
//   · producer_id present -> exactly ONE passport to that producer (email + note)
//   · producer_id absent   -> `cantidad` anonymous hand-out codes (no email)
// `cantidad` is deliberately ignored in the assigned mode: a personal passport
// is by definition one.
export async function emitCampaignPassports(campaignId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: campaign } = await service.from("club_campaigns").select("id, name").eq("id", campaignId).maybeSingle();
  if (!campaign) throw new Error("Campaña no encontrada.");

  const producerId = String(formData.get("producer_id") ?? "").trim() || null;
  const requested = Math.trunc(Number(formData.get("cantidad") || 1));
  if (!producerId && (!Number.isFinite(requested) || requested < 1)) {
    throw new Error("Indique cuántos códigos generar (mínimo 1).");
  }
  const cantidad = producerId ? 1 : Math.min(Math.max(requested, 1), 50);

  if (producerId) await assertAssignable(service, producerId);

  for (let i = 0; i < cantidad; i++) {
    const codeRow = await insertCode(service, adminId, {
      prefix: "KCX",
      kind: "campana",
      campaignId: campaign.id,
      note: null,
      assignedTo: producerId,
    });
    if (producerId) await deliverPassport(service, codeRow, campaign.name, producerId);

    await service.from("audit_log").insert({
      entity_type: "club_member_code",
      entity_id: codeRow.id,
      action: "campaign_emitted",
      performed_by: adminId,
      notes: `${codeRow.code} · ${campaign.name}${producerId ? ` → productor ${producerId}` : ""}`,
    });
  }

  revalidatePath("/bcp/club");
  revalidatePath(`/bcp/club/campanas/${campaignId}`);
  revalidatePath("/bcp/productores");
}

export async function resendPassportEmail(codeId: string) {
  await requireAdmin();
  const service = createServiceRoleClient();

  const { data: code } = await service
    .from("club_member_codes")
    .select("id, code, assigned_to, redeemed_by, revoked_at, campaign:club_campaigns(name)")
    .eq("id", codeId)
    .maybeSingle();
  if (!code?.assigned_to || code.redeemed_by || code.revoked_at) {
    throw new Error("Este Pasaporte no está pendiente de confirmación.");
  }
  const campaignName = joinedCampaignName(code.campaign);

  const { data: producer } = await service.from("profiles").select("full_name, email").eq("id", code.assigned_to).maybeSingle();
  if (!producer?.email) throw new Error("El productor no tiene correo registrado.");

  const result = await sendPassportEmail({ nombre: producer.full_name || "productor", email: producer.email, code: code.code, campaign: campaignName });
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

/* ── Inscripciones de Arena ───────────────────────────────────────────────────
   COP 80.000 por lote. El palo y la zanahoria: CTC puede descontar o eximir.
   El pago ocurre FUERA de la plataforma (transferencia); aquí solo se confirma.
   Saldada (pagado|exento) = el lote entra a la Arena y el productor califica
   para el Pasaporte estándar (que desde 2026-07-16 es la entrada pagada). */

type SettleInput = {
  lotId: string;
  /** Descuento en COP sobre los 80.000 de lista. Igual al monto = exención. */
  discountCop?: number;
  paymentRef?: string;
  notes?: string;
};

/** Crea (si falta) y salda la inscripción de un lote: pago confirmado o exención. */
export async function settleArenaInscription(input: SettleInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("id, name, producer_id, stage").eq("id", input.lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };

  const discount = Math.max(0, Math.min(Math.round(input.discountCop ?? 0), ARENA_FEE_COP));
  const due = ARENA_FEE_COP - discount;
  const status = due === 0 ? "exento" : "pagado";

  const { error } = await service.from("arena_inscriptions").upsert(
    {
      lot_id: lot.id,
      producer_id: lot.producer_id,
      amount_cop: ARENA_FEE_COP,
      discount_cop: discount,
      status,
      payment_ref: input.paymentRef?.trim() || null,
      notes: input.notes?.trim() || null,
      confirmed_by: adminId,
      confirmed_at: new Date().toISOString(),
    },
    { onConflict: "lot_id" }
  );
  if (error) return { ok: false, error: error.message };

  // El productor se entera por su feed, no por un correo aparte.
  await service.from("producer_comm_log").insert({
    producer_id: lot.producer_id,
    context_label: `Inscripción de Arena · ${lot.name ?? "lote"}`,
    lot_id: lot.id,
    note:
      status === "exento"
        ? `CTC eximió la inscripción de Arena de este lote (valor de lista ${formatCop(ARENA_FEE_COP)}). Su lote queda habilitado para la Arena sin costo.`
        : `Inscripción de Arena confirmada por ${formatCop(due)}${discount > 0 ? ` (descuento de ${formatCop(discount)} sobre ${formatCop(ARENA_FEE_COP)})` : ""}. Su lote queda habilitado para la Arena.`,
  });

  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lot.id,
    action: status === "exento" ? "exempted" : "payment_confirmed",
    new_status: status,
    performed_by: adminId,
    notes: `${formatCop(due)} a pagar${discount > 0 ? ` · descuento ${formatCop(discount)}` : ""}${input.paymentRef ? ` · ref ${input.paymentRef}` : ""}`,
  });

  revalidatePath("/bcp/club");
  revalidatePath("/bcp/lotes");
  return { ok: true };
}

/** Revierte una inscripción a pendiente (corrección de un error de registro). */
export async function unsettleArenaInscription(lotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: lot } = await service.from("lots").select("stage").eq("id", lotId).single();
  if (!lot) return { ok: false, error: "Lote no encontrado." };
  if (lot.stage !== "ficha_completa" && lot.stage !== "borrador") {
    return { ok: false, error: "Este lote ya avanzó en el proceso — no se puede revertir su inscripción." };
  }

  const { error } = await service
    .from("arena_inscriptions")
    .update({ status: "pendiente", discount_cop: 0, payment_ref: null, confirmed_by: null, confirmed_at: null })
    .eq("lot_id", lotId);
  if (error) return { ok: false, error: error.message };

  await service.from("audit_log").insert({
    entity_type: "arena_inscription",
    entity_id: lotId,
    action: "reverted_to_pending",
    new_status: "pendiente",
    performed_by: adminId,
  });

  revalidatePath("/bcp/club");
  return { ok: true };
}
