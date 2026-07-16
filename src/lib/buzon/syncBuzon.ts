import { randomUUID } from "crypto";
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── Buzón IMAP sync ──────────────────────────────────────────────────────────
// The virtual-inbox pipeline, option A+pull (2026-07-16): Hostinger's catch-all
// delivers every @ctcexport.com address into the real info@ mailbox; this module
// pulls that mailbox over IMAP into `inbound_emails` (the same table the Resend
// webhook feeds), uploading attachments to Storage so nothing depends on the
// 1 GB mailbox. Policies, in order of importance:
//   1. NEVER lose mail — a message is only ever deleted from Hostinger after its
//      archived row is confirmed in Postgres (and only past the retention window).
//   2. Non-destructive reads — fetches don't mark messages as read; human use of
//      info@ via webmail keeps working untouched.
//   3. Idempotent — dedupe by RFC message-id (unique index inbound_emails_message_id_uidx);
//      re-running a sync can't duplicate rows.
//   4. Bounded — looks back SYNC_WINDOW_DAYS (or since the newest archived row),
//      caps MAX_PER_RUN per run, so a run always fits a serverless invocation.
//      The pre-existing mailbox history stays in Hostinger (25% of 1 GB, static);
//      only newly-archived mail is subject to retention cleanup.

const SYNC_WINDOW_DAYS = 7; // first-run lookback; later runs start at newest archived row minus 1 day
const RETENTION_DAYS = 30; // archived mail older than this is removed from Hostinger
const MAX_PER_RUN = 50;
const STORAGE_BUCKET = "kaffetal-media";

export type BuzonSyncResult = {
  ok: boolean;
  stored: number;
  skipped: number;
  cleaned: number;
  error?: string;
};

function addressToText(a: AddressObject | AddressObject[] | undefined): string | null {
  if (!a) return null;
  const list = Array.isArray(a) ? a : [a];
  const text = list.map((x) => x.text).filter(Boolean).join(", ");
  return text || null;
}

function safeFilename(name: string | undefined, i: number): string {
  const base = (name ?? `adjunto-${i + 1}`).replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  return base || `adjunto-${i + 1}`;
}

export async function syncBuzon(): Promise<BuzonSyncResult> {
  const host = process.env.BUZON_IMAP_HOST;
  const user = process.env.BUZON_IMAP_USER;
  const pass = process.env.BUZON_IMAP_PASSWORD;
  if (!host || !user || !pass) {
    return { ok: false, stored: 0, skipped: 0, cleaned: 0, error: "Faltan las variables BUZON_IMAP_* en el entorno." };
  }

  const service = createServiceRoleClient();

  // Sync window: newest archived IMAP row minus 1 day, else SYNC_WINDOW_DAYS back.
  const { data: newest } = await service
    .from("inbound_emails")
    .select("received_at")
    .eq("raw->>source", "imap")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const since = newest?.received_at
    ? new Date(new Date(newest.received_at).getTime() - 24 * 3600 * 1000)
    : new Date(Date.now() - SYNC_WINDOW_DAYS * 24 * 3600 * 1000);

  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });

  let stored = 0,
    skipped = 0,
    cleaned = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      // ── 1. Pull new mail ────────────────────────────────────────────────
      const uids = ((await client.search({ since }, { uid: true })) || []).slice(-MAX_PER_RUN);
      for (const uid of uids) {
        const msg = await client.fetchOne(String(uid), { source: true, internalDate: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const messageId = parsed.messageId ?? `imap-uid-${uid}-${user}`;

        const { data: existing } = await service
          .from("inbound_emails")
          .select("id")
          .eq("message_id", messageId)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }

        // Attachments → Storage (they must survive mailbox cleanup).
        const attachmentsMeta: { filename: string; content_type: string | null; size: number | null; storage_path: string }[] = [];
        const folder = `buzon/${randomUUID()}`;
        for (let i = 0; i < (parsed.attachments?.length ?? 0); i++) {
          const att = parsed.attachments[i];
          const path = `${folder}/${safeFilename(att.filename, i)}`;
          const { error: upErr } = await service.storage
            .from(STORAGE_BUCKET)
            .upload(path, att.content, { contentType: att.contentType || "application/octet-stream" });
          if (!upErr) {
            attachmentsMeta.push({ filename: safeFilename(att.filename, i), content_type: att.contentType ?? null, size: att.size ?? null, storage_path: path });
          }
        }

        const { error: insErr } = await service.from("inbound_emails").insert({
          message_id: messageId,
          from_email: addressToText(parsed.from),
          to_email: addressToText(parsed.to),
          subject: parsed.subject ?? null,
          text_body: parsed.text ?? null,
          html_body: typeof parsed.html === "string" ? parsed.html : null,
          attachments: attachmentsMeta.length ? attachmentsMeta : null,
          raw: { source: "imap", uid, mailbox: "INBOX", user },
          received_at: new Date(parsed.date ?? msg.internalDate ?? Date.now()).toISOString(),
        });
        if (insErr) {
          // 23505 = unique violation (raced/duplicate) — count as skipped, never fatal.
          if (insErr.code === "23505") skipped++;
          else throw new Error(`Insert falló: ${insErr.message}`);
        } else {
          stored++;
        }
      }

      // ── 2. Retention cleanup: delete from Hostinger ONLY what is archived
      //       and older than RETENTION_DAYS. Unarchived history is never touched.
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
      const oldUids = ((await client.search({ before: cutoff }, { uid: true })) || []).slice(-200);
      if (oldUids.length) {
        const candidates: { uid: number; messageId: string }[] = [];
        for await (const m of client.fetch(oldUids.join(","), { envelope: true }, { uid: true })) {
          if (m.envelope?.messageId) candidates.push({ uid: m.uid, messageId: m.envelope.messageId });
        }
        if (candidates.length) {
          const { data: archivedRows } = await service
            .from("inbound_emails")
            .select("message_id")
            .in("message_id", candidates.map((c) => c.messageId));
          const archived = new Set((archivedRows ?? []).map((r) => r.message_id));
          const deletable = candidates.filter((c) => archived.has(c.messageId)).map((c) => c.uid);
          if (deletable.length) {
            await client.messageDelete(deletable.join(","), { uid: true });
            cleaned = deletable.length;
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, stored, skipped, cleaned };
  } catch (err) {
    try {
      await client.logout();
    } catch {}
    return { ok: false, stored, skipped, cleaned, error: err instanceof Error ? err.message : "Fallo desconocido en la sincronización." };
  }
}
