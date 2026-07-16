"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { moveRemoteMessage, sendBuzonMail } from "@/lib/buzon/mailClient";

export type BuzonActionResult = { ok: true } | { ok: false; error: string };

// Identity for Buzón permissions: owners act on ANY mail; a collaborator only on
// mail addressed to their own @ctcexport.com label (same rule as the list view).
async function buzonIdentity() {
  const userId = await requireActiveAdmin();
  const service = createServiceRoleClient();
  const [{ data: pu }, { data: prof }] = await Promise.all([
    service.from("panel_users").select("is_owner, status, display_name").eq("profile_id", userId).maybeSingle(),
    service.from("profiles").select("email, full_name").eq("id", userId).maybeSingle(),
  ]);
  const isOwner = pu ? pu.is_owner && pu.status === "active" : true;
  return {
    userId,
    isOwner,
    email: (prof?.email ?? "").toLowerCase(),
    displayName: pu?.display_name || prof?.full_name || "CTC",
    service,
  };
}

type MailRow = { id: string; message_id: string | null; from_email: string | null; to_email: string | null; subject: string | null; text_body: string | null; received_at: string; attachments: { filename: string | null; storage_path?: string }[] | null };

async function loadIfAllowed(id: string) {
  const identity = await buzonIdentity();
  const { data } = await identity.service
    .from("inbound_emails")
    .select("id, message_id, from_email, to_email, subject, text_body, received_at, attachments")
    .eq("id", id)
    .single();
  const row = data as MailRow | null;
  if (!row) throw new Error("Correo no encontrado.");
  if (!identity.isOwner && !(row.to_email ?? "").toLowerCase().includes(identity.email)) {
    throw new Error("No autorizado para este correo.");
  }
  return { identity, row };
}

function quoteOriginal(row: MailRow): string {
  const date = new Date(row.received_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  const quoted = (row.text_body ?? "").split("\n").map((l) => `> ${l}`).join("\n");
  return `El ${date}, ${row.from_email ?? "(remitente desconocido)"} escribió:\n${quoted}`;
}

export async function sendBuzonReply(
  inboundId: string,
  input: { mode: "reply" | "forward"; to: string; subject: string; body: string }
): Promise<BuzonActionResult> {
  const { identity, row } = await loadIfAllowed(inboundId);

  const to = input.to.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!to || !to.includes("@")) return { ok: false, error: "Destinatario inválido." };
  if (!subject) return { ok: false, error: "El asunto es obligatorio." };
  if (!body) return { ok: false, error: "Escribe el mensaje." };

  // Send AS the collaborator's own label when it lives on the domain; else info@.
  const fromEmail = identity.email.endsWith("@ctcexport.com") ? identity.email : "info@ctcexport.com";
  const text = `${body}\n\n———\n${quoteOriginal(row)}`;

  const res = await sendBuzonMail({
    fromName: identity.displayName,
    fromEmail,
    to,
    subject,
    text,
    inReplyTo: input.mode === "reply" ? row.message_id : null,
  });

  await identity.service.from("buzon_outbound").insert({
    in_reply_to: row.id,
    mode: input.mode,
    from_email: fromEmail,
    to_email: to,
    subject,
    text_body: text,
    sent_by: identity.userId,
    send_ok: res.ok,
    send_error: res.ok ? null : res.error,
  });
  if (!res.ok) return { ok: false, error: res.error };

  if (input.mode === "reply") {
    await identity.service.from("inbound_emails").update({ replied_at: new Date().toISOString() }).eq("id", row.id);
  }
  revalidatePath("/bcp/buzon");
  return { ok: true };
}

export async function setBuzonStatus(id: string, status: "archived" | "deleted"): Promise<BuzonActionResult> {
  const { identity, row } = await loadIfAllowed(id);
  // Reflect to Hostinger first (best-effort — a retention-cleaned message just isn't there).
  if (row.message_id) await moveRemoteMessage(row.message_id, status === "deleted" ? "trash" : "archive");
  await identity.service.from("inbound_emails").update({ status }).eq("id", id);
  revalidatePath("/bcp/buzon");
  return { ok: true };
}

export async function setBuzonTags(id: string, tags: string[]): Promise<BuzonActionResult> {
  const { identity } = await loadIfAllowed(id);
  const clean = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 8).map((t) => t.slice(0, 24));
  await identity.service.from("inbound_emails").update({ tags: clean }).eq("id", id);
  revalidatePath("/bcp/buzon");
  return { ok: true };
}

export async function getBuzonAttachmentUrls(id: string): Promise<{ filename: string; url: string }[]> {
  const { identity, row } = await loadIfAllowed(id);
  const out: { filename: string; url: string }[] = [];
  for (const a of row.attachments ?? []) {
    if (!a.storage_path) continue;
    const { data } = await identity.service.storage.from("kaffetal-media").createSignedUrl(a.storage_path, 3600);
    if (data?.signedUrl) out.push({ filename: a.filename ?? "adjunto", url: data.signedUrl });
  }
  return out;
}

export async function syncBuzonNow() {
  await requireActiveAdmin();
  const { syncBuzon } = await import("@/lib/buzon/syncBuzon");
  const result = await syncBuzon();
  revalidatePath("/bcp/buzon");
  return result;
}

export async function markInboundEmailRead(id: string, read: boolean): Promise<BuzonActionResult> {
  const { identity } = await loadIfAllowed(id);
  await identity.service
    .from("inbound_emails")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/bcp/buzon");
  return { ok: true };
}
