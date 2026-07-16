import { randomUUID } from "crypto";
import { ImapFlow } from "imapflow";
import { Resend } from "resend";

// ── Buzón mail-client plumbing ───────────────────────────────────────────────
// Outbound: Resend sends AS any @ctcexport.com address (domain is verified), and
// a plain-text RFC822 copy is APPENDed to Hostinger's INBOX.Sent over IMAP so
// webmail stays consistent. Remote reflection: archive/delete in the platform
// MOVES the message in Hostinger too (INBOX.Archive — created on first use — or
// INBOX.Trash \Trash). All best-effort against the mailbox: if a message was
// already retention-cleaned remotely, the platform state still wins.

function imapClient(): ImapFlow | null {
  const host = process.env.BUZON_IMAP_HOST;
  const user = process.env.BUZON_IMAP_USER;
  const pass = process.env.BUZON_IMAP_PASSWORD;
  if (!host || !user || !pass) return null;
  return new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });
}

async function findSpecialUse(client: ImapFlow, use: string, fallback: string): Promise<string> {
  const boxes = await client.list();
  const hit = boxes.find((b) => b.specialUse === use);
  if (hit) return hit.path;
  if (!boxes.some((b) => b.path === fallback)) {
    try {
      await client.mailboxCreate(fallback);
    } catch {}
  }
  return fallback;
}

/** Move a message (found by RFC message-id) from INBOX to Archive or Trash. Best-effort. */
export async function moveRemoteMessage(messageId: string, dest: "archive" | "trash"): Promise<boolean> {
  const client = imapClient();
  if (!client) return false;
  try {
    await client.connect();
    const target =
      dest === "trash" ? await findSpecialUse(client, "\\Trash", "INBOX.Trash") : await findSpecialUse(client, "\\Archive", "INBOX.Archive");
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = (await client.search({ header: { "message-id": messageId } }, { uid: true })) || [];
      if (uids.length) await client.messageMove(uids.join(","), target, { uid: true });
    } finally {
      lock.release();
    }
    await client.logout();
    return true;
  } catch {
    try {
      await client.logout();
    } catch {}
    return false;
  }
}

/** Append a sent message copy to Hostinger's Sent folder. Best-effort. */
async function appendToSent(raw: string): Promise<void> {
  const client = imapClient();
  if (!client) return;
  try {
    await client.connect();
    const sent = await findSpecialUse(client, "\\Sent", "INBOX.Sent");
    await client.append(sent, raw, ["\\Seen"]);
    await client.logout();
  } catch {
    try {
      await client.logout();
    } catch {}
  }
}

export type SendMailInput = {
  fromName: string;
  fromEmail: string; // must be @ctcexport.com (Resend verified domain)
  to: string;
  subject: string;
  text: string;
  /** RFC message-id of the mail being replied to — threads correctly in the recipient's client. */
  inReplyTo?: string | null;
};

export type SendMailResult = { ok: true; messageId: string } | { ok: false; error: string };

export async function sendBuzonMail(input: SendMailInput): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const messageId = `<${randomUUID()}@ctcexport.com>`;
  const from = `${input.fromName} <${input.fromEmail}>`;

  if (!apiKey) {
    console.log(`[buzón mail - dev fallback, no RESEND_API_KEY] from=${from} to=${input.to} subject="${input.subject}"\n${input.text}`);
    return { ok: true, messageId };
  }

  try {
    const resend = new Resend(apiKey);
    const headers: Record<string, string> = { "Message-ID": messageId };
    if (input.inReplyTo) {
      headers["In-Reply-To"] = input.inReplyTo;
      headers["References"] = input.inReplyTo;
    }
    const { error } = await resend.emails.send({ from, to: input.to, subject: input.subject, text: input.text, headers });
    if (error) return { ok: false, error: error.message };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Fallo desconocido al enviar." };
  }

  // Mirror to Hostinger's Sent so webmail reflects what the platform sent.
  const raw = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`, `References: ${input.inReplyTo}`] : []),
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    input.text,
  ].join("\r\n");
  await appendToSent(raw);

  return { ok: true, messageId };
}
