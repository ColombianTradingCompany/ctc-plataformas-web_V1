import { randomUUID } from "crypto";
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject } from "mailparser";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── Buzón IMAP sync ──────────────────────────────────────────────────────────
// The virtual-inbox pipeline, option A+pull (2026-07-16): Hostinger's catch-all
// delivers every @ctcexport.com address into the real info@ mailbox; this module
// pulled that mailbox over IMAP into `inbound_emails` (the same table the Resend
// webhook feeds), uploading attachments to Storage.
//
// FROZEN since 2026-07-16 (D-013 5.4, unificación P18): the Buzón is read-only
// history and Gmail is the only place where mail is handled. This file is kept,
// not deleted, because P19 «fallback 1» may need ONE owner-approved import-only
// run (its own micro-release turns off the `BUZON_CONGELADO` guard in
// buzonActions.ts, restores a trigger and the password, runs once, undoes all
// three). Its only caller, `syncBuzonNow`, returns before reaching it while the
// guard is on. Policies, in order of importance:
//   1. NEVER touch mail at Hostinger — the mailbox is opened READ-ONLY (EXAMINE),
//      so the server itself refuses writes; the retention step that deleted
//      archived mail was removed in P18 and no delete/move/flag call exists.
//   2. Non-destructive reads — fetches don't mark messages as read; human use of
//      info@ via webmail keeps working untouched.
//   3. Idempotent — dedupe by RFC message-id (unique index inbound_emails_message_id_uidx);
//      re-running a sync can't duplicate rows.
//   4. Bounded — each run scans ALL envelopes (cheap) but imports at most
//      MAX_PER_RUN full messages, returning `remaining` so a caller can loop
//      until the whole mailbox is archived.

const MAX_PER_RUN = 25; // bounded so each run fits a serverless invocation; the client loops until remaining=0
const STORAGE_BUCKET = "kaffetal-media";

export type BuzonSyncResult = {
  ok: boolean;
  stored: number;
  skipped: number;
  /** Messages still in the mailbox and not yet archived — the client re-runs while > 0. */
  remaining: number;
  error?: string;
};

function addressToText(a: AddressObject | AddressObject[] | undefined): string | null {
  if (!a) return null;
  const list = Array.isArray(a) ? a : [a];
  const text = list.map((x) => x.text).filter(Boolean).join(", ");
  return text || null;
}

// Auto-classification for incoming mail — the same 14-tag taxonomy and priority
// order applied to the initial archive (2026-07-16). First rule that matches
// wins; manual re-tagging in the Buzón always overrides later.
const TAG_RULES: [tag: string, from: RegExp | null, subject: RegExp | null][] = [
  ["facturas", /facture\.co|colfact\.co|contapyme\.com/, /^\d{8,};/],
  ["eudr", /particip\.com/, /eudr|deforest/],
  ["café", /cafedecolombia|sca\.coffee|bellwethercoffee|agroscada/, /café|coffee|koffesenser/],
  ["exportación", /procolombia|eventic|zambranodigital/, /export|macrorrueda|fda|aduana/],
  ["logística", /fedex|cedicolombian|mitlogroup|dhl/, /guía|contenedor|embarque|shipment/],
  ["gobierno", /\.gov\.co/, null],
  ["bancos", /bancolombia/, null],
  ["cámara-comercio", /camaradirecta|confecamaras|gs1co/, null],
  ["comercial", /anherma|jiacuiworld|tincsolutions/, /cotizaci|quotation|proveedor|consulta comercial/],
  ["interno", /ctcexport\.com|ctc\.redes/, null],
  ["servicios", /tigo|enelx|smartsheet|google\.com|resend|vercel|supabase|hostinger/, null],
  ["eventos", null, /invitaci|capacitaci|summit|encuentro|webinar|conservatorio|meeting|foro/],
  ["promociones", /icontactmail|seranking|kajabimail|gurusoluciones|solucioneslegales|directcapitalrush|qualtrics/, null],
];

function autoTag(from: string | null, subject: string | null): string[] {
  const f = (from ?? "").toLowerCase();
  const s = (subject ?? "").toLowerCase();
  for (const [tag, fromRx, subjRx] of TAG_RULES) {
    if ((fromRx && fromRx.test(f)) || (subjRx && subjRx.test(s))) return [tag];
  }
  return ["otros"];
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
    return { ok: false, stored: 0, skipped: 0, remaining: 0, error: "Faltan las variables BUZON_IMAP_* en el entorno." };
  }

  const service = createServiceRoleClient();
  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user, pass }, logger: false });

  let stored = 0,
    skipped = 0,
    remaining = 0;

  try {
    await client.connect();
    // READ-ONLY (P18): the lock opens INBOX with EXAMINE, so the server refuses any write in this session.
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      // ── 1. Full-mailbox scan: envelopes only (cheap), find what's missing ─
      // This covers both backfill (pre-existing history) and new mail in one
      // pass: anything whose message-id isn't archived yet is a candidate.
      const metas: { uid: number; messageId: string }[] = [];
      if ((client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0) > 0) {
        for await (const m of client.fetch("1:*", { envelope: true }, { uid: true })) {
          metas.push({ uid: m.uid, messageId: m.envelope?.messageId ?? `imap-uid-${m.uid}-${user}` });
        }
      }
      const archived = new Set<string>();
      for (let i = 0; i < metas.length; i += 200) {
        const chunk = metas.slice(i, i + 200).map((m) => m.messageId);
        const { data } = await service.from("inbound_emails").select("message_id").in("message_id", chunk);
        for (const r of data ?? []) if (r.message_id) archived.add(r.message_id);
      }
      const missing = metas.filter((m) => !archived.has(m.messageId)).sort((a, b) => a.uid - b.uid);
      const batch = missing.slice(0, MAX_PER_RUN);
      remaining = missing.length - batch.length;

      // ── 2. Import the batch (oldest first) ────────────────────────────────
      for (const { uid } of batch) {
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

        // Attachments → Storage (the archive must not depend on the mailbox).
        // Regla del módulo: NUNCA perder correo. Antes (auditoría 2026-08-13,
        // EST-2) un upload fallido se ignoraba en silencio y el correo se
        // insertaba igual; como el dedupe es por message_id NUNCA se reintentaba,
        // y la retención de 30 días (retirada en P18) borraba el original de
        // Hostinger. Si algún adjunto falla al subir, NO se inserta el mensaje:
        // sin fila, el próximo run (idempotente) lo reintenta entero.
        const attachmentsMeta: { filename: string; content_type: string | null; size: number | null; storage_path: string }[] = [];
        const folder = `buzon/${randomUUID()}`;
        let attachmentFailed = false;
        for (let i = 0; i < (parsed.attachments?.length ?? 0); i++) {
          const att = parsed.attachments[i];
          const path = `${folder}/${safeFilename(att.filename, i)}`;
          const { error: upErr } = await service.storage
            .from(STORAGE_BUCKET)
            .upload(path, att.content, { contentType: att.contentType || "application/octet-stream" });
          if (upErr) {
            // Los adjuntos ya subidos de ESTE mensaje quedan huérfanos bajo `folder`
            // (el próximo run usa un UUID nuevo); es un leak menor y raro, aceptable
            // frente a perder el correo. Se deja constancia y se salta el mensaje.
            console.error(`[buzon] adjunto no subió (uid ${uid}): ${upErr.message} — mensaje pospuesto al próximo run`);
            attachmentFailed = true;
            break;
          }
          attachmentsMeta.push({ filename: safeFilename(att.filename, i), content_type: att.contentType ?? null, size: att.size ?? null, storage_path: path });
        }
        if (attachmentFailed) continue;

        const fromText = addressToText(parsed.from);
        const { error: insErr } = await service.from("inbound_emails").insert({
          message_id: messageId,
          from_email: fromText,
          to_email: addressToText(parsed.to),
          subject: parsed.subject ?? null,
          tags: autoTag(fromText, parsed.subject ?? null),
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
      // (P18: the former step 3, «retention cleanup», deleted archived mail at
      // Hostinger. It was removed; this module never deletes, moves or flags.)
    } finally {
      lock.release();
    }
    await client.logout();
    return { ok: true, stored, skipped, remaining };
  } catch (err) {
    try {
      await client.logout();
    } catch {}
    return { ok: false, stored, skipped, remaining, error: err instanceof Error ? err.message : "Fallo desconocido en la sincronización." };
  }
}
