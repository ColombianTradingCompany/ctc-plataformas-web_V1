"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendLeadWelcomeEmail, sendLeadReplyEmail, PILLAR_LABEL, type LeadEmailInput, type ThreadMessage } from "@/lib/email/leadEmails";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { CONSOLAS_DE_LEADS, consolaDelPilar, tableroDelPilar } from "@/lib/panel/leadsPilares";


// ── Compuerta fina por consola (auditoría 2026-08-13, ESTR-4) ────────────────
// Estas acciones las comparten CUATRO tableros de DOS consolas (regla V4 Fase 0: «el CRM vive
// en la consola dueña del dominio»): `general` y `cocreate` en la LCP, `tech` y `varietales` en
// el ECP. Por eso el archivo vive en `src/components/panel/` y no en el árbol de una consola
// (V5.59) — colgando del ECP, la mudanza de Leads a la LCP se lo habría llevado por delante.
//
// DOS COMPUERTAS, y las dos hacen falta:
//   1. la GRUESA, antes de leer nada: sesión activa y nivel «emite» en ALGUNA consola que
//      administre leads (`CONSOLAS_DE_LEADS`). Sin ella, cualquiera con sesión podría sondear ids.
//   2. la FINA, con el lead ya leído: nivel «emite» en LA consola dueña de SU pilar — dato del
//      servidor, no del cliente. Hasta la V5.58 esta segunda solo miraba el GRANT
//      (`grantedConsoles`), no el nivel: un colaborador «admin» del ECP y «viewer» de la consola
//      dueña podía responder un lead ajeno. Y lanzaba (`throw`) en vez de devolver el rechazo.
//
// ⚠️ La consola del pilar YA NO SE ESCRIBE AQUÍ: sale de `src/lib/panel/leadsPilares.ts`, que la
// deduce de la ruta del tablero. El mapa `PILLAR_CONSOLE` que había aquí era una compuerta de
// permisos sin barras, invisible a toda reescritura de rutas, y se quedó atrás en dos mudanzas.
async function permisoSobreElLead(lead: LeadRow) {
  return permisoDeEscritura(consolaDelPilar(lead.pillar), "emite");
}

// El tablero que hay que revalidar es el de la consola dueña — antes se
// revalidaba un solo tablero y los otros tres quedaban con caché vieja.
function leadBoardPath(lead: LeadRow): string {
  return tableroDelPilar(lead.pillar);
}

const STATUSES = ["nuevo", "en_conversacion", "convertido", "cerrado"] as const;

type LeadRow = LeadEmailInput & {
  id: string;
  status: string;
  temp_password: string | null;
  first_replied_at: string | null;
  profile_id: string | null;
  created_at: string;
};

async function getLead(service: ReturnType<typeof createServiceRoleClient>, leadId: string): Promise<LeadRow> {
  const { data } = await service
    .from("leads")
    .select("id, pillar, nombre, email, message, status, account_provisioning, temp_password, first_replied_at, profile_id, created_at")
    .eq("id", leadId)
    .single();
  if (!data) throw new Error("Lead no encontrado.");
  return data as LeadRow;
}

// Assembles the lead's full conversation (oldest-first) so every outbound
// email can quote it: the original request, every SENT BCP reply, and the
// producer's own in-app thread replies (producer-role leads). CTC notes
// mirrored into producer_comm_log are skipped here -- they'd duplicate the
// lead_replies rows.
async function fetchLeadThread(service: ReturnType<typeof createServiceRoleClient>, lead: LeadRow): Promise<ThreadMessage[]> {
  const msgs: ThreadMessage[] = [];
  if (lead.message) msgs.push({ who: "Productor", date: lead.created_at, text: lead.message });

  const { data: replies } = await service
    .from("lead_replies")
    .select("body, sent_at, created_at")
    .eq("lead_id", lead.id)
    .not("sent_at", "is", null)
    .order("created_at", { ascending: true });
  for (const r of (replies as { body: string; sent_at: string | null; created_at: string }[] | null) ?? []) {
    msgs.push({ who: "CTC", date: r.sent_at ?? r.created_at, text: r.body });
  }

  if (lead.profile_id) {
    const { data: mirror } = await service.from("producer_comm_log").select("id").eq("lead_id", lead.id);
    const mirrorIds = ((mirror as { id: string }[] | null) ?? []).map((m) => m.id);
    if (mirrorIds.length) {
      const { data: prod } = await service
        .from("producer_comm_log")
        .select("note, created_at")
        .eq("author_role", "producer")
        .in("parent_id", mirrorIds)
        .order("created_at", { ascending: true });
      for (const p of (prod as { note: string; created_at: string }[] | null) ?? []) {
        msgs.push({ who: "Productor", date: p.created_at, text: p.note });
      }
    }
  }

  return msgs.sort((a, b) => a.date.localeCompare(b.date));
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
    // La etiqueta es el TÍTULO del hilo en el panel del productor, y desde
    // V4.35 también lo que agrupa las conversaciones en «Mis solicitudes».
    // Decía «Solicitud CTC Home · …», que solo era cierto para el pilar
    // `general`: CTC Tech, Varietales y CaaS tienen su propia landing y el
    // productor nunca pasó por CTC Home. Ahora dice el servicio, a secas.
    context_label: PILLAR_LABEL[lead.pillar] ?? lead.pillar,
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
  const permiso = await permisoDeEscritura(CONSOLAS_DE_LEADS, "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const lead = await getLead(service, leadId);
  const fino = await permisoSobreElLead(lead);
  if (!fino.ok) return { ok: false as const, error: fino.error };

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

  const thread = await fetchLeadThread(service, lead);
  const result = await sendLeadReplyEmail(lead, { subject, body }, lead.temp_password, thread);
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
  revalidatePath(leadBoardPath(lead));
}

export async function setLeadStatus(leadId: string, formData: FormData) {
  const permiso = await permisoDeEscritura(CONSOLAS_DE_LEADS, "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const lead = await getLead(service, leadId);
  const fino = await permisoSobreElLead(lead);
  if (!fino.ok) return { ok: false as const, error: fino.error };

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
  revalidatePath(leadBoardPath(lead));
}

export async function retryWelcomeEmail(leadId: string) {
  const permiso = await permisoDeEscritura(CONSOLAS_DE_LEADS, "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();
  const lead = await getLead(service, leadId);
  const fino = await permisoSobreElLead(lead);
  if (!fino.ok) return { ok: false as const, error: fino.error };

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
  revalidatePath(leadBoardPath(lead));
}

export async function retryReplyEmail(replyId: string) {
  const permiso = await permisoDeEscritura(CONSOLAS_DE_LEADS, "emite");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const { data: reply } = await service
    .from("lead_replies")
    .select("id, lead_id, subject, body, includes_password")
    .eq("id", replyId)
    .single();
  if (!reply) throw new Error("Respuesta no encontrada.");
  const lead = await getLead(service, reply.lead_id);
  const fino = await permisoSobreElLead(lead);
  if (!fino.ok) return { ok: false as const, error: fino.error };

  // Re-append the password only if this reply was its designated carrier and
  // it hasn't been delivered (cleared) by a successful send yet.
  const tempPassword = reply.includes_password ? lead.temp_password : null;
  const thread = await fetchLeadThread(service, lead);
  const result = await sendLeadReplyEmail(lead, reply, tempPassword, thread);
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
  revalidatePath(leadBoardPath(lead));
}
