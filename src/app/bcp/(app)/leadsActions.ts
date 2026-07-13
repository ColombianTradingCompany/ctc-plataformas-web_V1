"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { sendLeadWelcomeEmail, sendLeadReplyEmail, PILLAR_LABEL, type LeadEmailInput } from "@/lib/email/leadEmails";

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

const STATUSES = ["nuevo", "en_conversacion", "convertido", "cerrado"] as const;

type LeadRow = LeadEmailInput & {
  id: string;
  status: string;
  temp_password: string | null;
  first_replied_at: string | null;
  profile_id: string | null;
};

async function getLead(service: ReturnType<typeof createServiceRoleClient>, leadId: string): Promise<LeadRow> {
  const { data } = await service
    .from("leads")
    .select("id, pillar, nombre, email, status, account_provisioning, temp_password, first_replied_at, profile_id")
    .eq("id", leadId)
    .single();
  if (!data) throw new Error("Lead no encontrado.");
  return data as LeadRow;
}

// A successful reply also lands in the producer's in-app "Retroalimentación y
// ayuda" feed (producer-role leads only) so the conversation lives on both
// channels, not just email. The password block is never mirrored.
async function mirrorReplyToProducerFeed(
  service: ReturnType<typeof createServiceRoleClient>,
  lead: LeadRow,
  body: string,
  adminId: string
) {
  if (!lead.profile_id) return;
  const { data: profile } = await service.from("profiles").select("role").eq("id", lead.profile_id).maybeSingle();
  if (profile?.role !== "producer") return;
  await service.from("producer_comm_log").insert({
    producer_id: lead.profile_id,
    lead_id: lead.id,
    context_label: `Solicitud CTC Home · ${PILLAR_LABEL[lead.pillar] ?? lead.pillar}`,
    note: body,
    created_by: adminId,
  });
}

// Post-send bookkeeping shared by replyToLead and retryReplyEmail: stamp the
// reply, clear the temp password ONLY when this send actually carried it,
// advance the pipeline, and mirror in-app.
async function applySuccessfulReply(
  service: ReturnType<typeof createServiceRoleClient>,
  lead: LeadRow,
  replyId: string,
  body: string,
  carriedPassword: boolean,
  adminId: string
) {
  await service.from("lead_replies").update({ sent_at: new Date().toISOString(), send_error: null }).eq("id", replyId);
  const leadPatch: Record<string, unknown> = {};
  if (carriedPassword) leadPatch.temp_password = null;
  if (!lead.first_replied_at) leadPatch.first_replied_at = new Date().toISOString();
  if (lead.status === "nuevo") leadPatch.status = "en_conversacion";
  if (Object.keys(leadPatch).length) await service.from("leads").update(leadPatch).eq("id", lead.id);
  await mirrorReplyToProducerFeed(service, lead, body, adminId);
}

// BCP replies by email. The FIRST successful reply to an account created on
// the lead's behalf carries the temporary password (appended at send time,
// never stored in the reply body); on success the password is cleared from
// the lead and the status auto-advances nuevo -> en_conversacion.
export async function replyToLead(leadId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const lead = await getLead(service, leadId);

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) throw new Error("Escriba el asunto y el mensaje de la respuesta.");

  const includesPassword = !!lead.temp_password;
  const { data: reply, error } = await service
    .from("lead_replies")
    .insert({ lead_id: leadId, subject, body, includes_password: includesPassword, created_by: adminId })
    .select("id")
    .single();
  if (error || !reply) throw new Error("No se pudo registrar la respuesta.");

  const result = await sendLeadReplyEmail(lead, { subject, body }, lead.temp_password);
  if (result.ok) {
    await applySuccessfulReply(service, lead, reply.id, body, includesPassword, adminId);
  } else {
    // Send failed: keep temp_password so the retry still carries it.
    await service.from("lead_replies").update({ send_error: result.error }).eq("id", reply.id);
  }

  await service.from("audit_log").insert({
    entity_type: "lead",
    entity_id: leadId,
    action: "replied",
    performed_by: adminId,
    notes: subject,
  });
  revalidatePath("/bcp/leads");
}

export async function setLeadStatus(leadId: string, formData: FormData) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const lead = await getLead(service, leadId);

  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw new Error("Estado inválido.");
  if (status === lead.status) return;

  await service.from("leads").update({ status }).eq("id", leadId);
  await service.from("audit_log").insert({
    entity_type: "lead",
    entity_id: leadId,
    action: "status_changed",
    previous_status: lead.status,
    new_status: status,
    performed_by: adminId,
  });
  revalidatePath("/bcp/leads");
}

export async function retryWelcomeEmail(leadId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();
  const lead = await getLead(service, leadId);

  const result = await sendLeadWelcomeEmail(lead);
  await service
    .from("leads")
    .update(result.ok ? { welcome_sent_at: new Date().toISOString(), welcome_error: null } : { welcome_error: result.error })
    .eq("id", leadId);
  await service.from("audit_log").insert({
    entity_type: "lead",
    entity_id: leadId,
    action: "welcome_retried",
    performed_by: adminId,
    notes: result.ok ? "Enviado" : result.error,
  });
  revalidatePath("/bcp/leads");
}

export async function retryReplyEmail(replyId: string) {
  const adminId = await requireAdmin();
  const service = createServiceRoleClient();

  const { data: reply } = await service
    .from("lead_replies")
    .select("id, lead_id, subject, body, includes_password")
    .eq("id", replyId)
    .single();
  if (!reply) throw new Error("Respuesta no encontrada.");
  const lead = await getLead(service, reply.lead_id);

  // Re-append the password only if this reply was its designated carrier and
  // it hasn't been delivered (cleared) by a successful send yet.
  const tempPassword = reply.includes_password ? lead.temp_password : null;
  const result = await sendLeadReplyEmail(lead, reply, tempPassword);
  if (result.ok) {
    // Clear the password only if THIS send actually carried it -- a retried
    // non-carrier reply must not discard an undelivered password.
    await applySuccessfulReply(service, lead, reply.id, reply.body, tempPassword !== null, adminId);
  } else {
    await service.from("lead_replies").update({ send_error: result.error }).eq("id", reply.id);
  }
  await service.from("audit_log").insert({
    entity_type: "lead",
    entity_id: lead.id,
    action: "reply_retried",
    performed_by: adminId,
    notes: result.ok ? "Enviado" : result.error,
  });
  revalidatePath("/bcp/leads");
}
