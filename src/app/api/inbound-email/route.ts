import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ── Inbound email webhook ────────────────────────────────────────────────────
// Receives "email received" webhook events (Resend Inbound, Svix-signed) and
// stores them in `inbound_emails` (service-role-only), surfaced in BCP → Buzón.
// Delivery path: Hostinger forwarder → inbound subdomain MX → Resend Inbound →
// this endpoint. Full setup steps: docs/INBOUND_EMAIL_SETUP.md.
//
// Defensive by design: provider payload shapes vary, so we extract fields
// best-effort and ALWAYS store the raw payload — nothing is lost to a parsing gap.

const SIGNATURE_TOLERANCE_S = 5 * 60;

// Svix signature scheme (used by Resend webhooks): the secret is "whsec_" +
// base64(key); the signed content is `${svix-id}.${svix-timestamp}.${rawBody}`;
// the svix-signature header holds space-separated "v1,<base64 hmac>" entries.
function verifySvixSignature(secret: string, id: string, timestamp: string, signatureHeader: string, rawBody: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > SIGNATURE_TOLERANCE_S) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signatureHeader.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    const candidate = Buffer.from(sig, "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord {
  return typeof v === "object" && v !== null ? (v as UnknownRecord) : {};
}

// Addresses arrive as "a@b", {email, name}, or arrays of either.
function extractAddress(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => extractAddress(x)).filter(Boolean).join(", ") || null;
  const rec = asRecord(v);
  if (typeof rec.email === "string") return rec.email;
  if (typeof rec.address === "string") return rec.address;
  return null;
}

function extractString(rec: UnknownRecord, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.length) return v;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (secret) {
    const id = request.headers.get("svix-id") ?? "";
    const timestamp = request.headers.get("svix-timestamp") ?? "";
    const signature = request.headers.get("svix-signature") ?? "";
    if (!id || !timestamp || !signature || !verifySvixSignature(secret, id, timestamp, signature, rawBody)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Never accept unsigned inbound mail in production — configure the secret first.
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  } else {
    console.warn("[inbound-email] RESEND_INBOUND_WEBHOOK_SECRET not set — accepting unsigned payload (dev only).");
  }

  let payload: UnknownRecord;
  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Event envelope is usually { type, data }; tolerate a bare email object too.
  const data = asRecord(payload.data ?? payload);
  const attachments = Array.isArray(data.attachments)
    ? data.attachments.map((a) => {
        const rec = asRecord(a);
        // Metadata only — never store file bytes in the table.
        return { filename: rec.filename ?? rec.name ?? null, content_type: rec.content_type ?? rec.contentType ?? null, size: rec.size ?? null };
      })
    : null;

  const service = createServiceRoleClient();
  const { error } = await service.from("inbound_emails").insert({
    message_id: extractString(data, "message_id", "email_id", "id"),
    from_email: extractAddress(data.from),
    to_email: extractAddress(data.to),
    subject: extractString(data, "subject"),
    text_body: extractString(data, "text", "text_body", "plain"),
    html_body: extractString(data, "html", "html_body"),
    attachments,
    raw: payload,
  });

  if (error) {
    console.error("[inbound-email] insert failed:", error.message);
    return NextResponse.json({ error: "Storage failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
