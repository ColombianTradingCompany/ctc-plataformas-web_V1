"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

// Newsletter capture for the Cherry Picked Roast / X "Coming Soon" landings.
// No account is created and no email is sent -- this only records the address
// so CTC can write when the 2027 programmes open. newsletter_subscribers is
// service-role-only (RLS, zero policies); this action is its only writer.

const SOURCES = ["roast", "x"] as const;
type Source = (typeof SOURCES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type NewsletterPayload = {
  email: string;
  source: string;
  lang?: string;
  website?: string; // honeypot -- rendered hidden; bots fill it
};

export type NewsletterResult = { ok: true } | { ok: false; error: "invalid" | "failed" };

export async function subscribeNewsletter(payload: NewsletterPayload): Promise<NewsletterResult> {
  // Honeypot: pretend success so bots learn nothing.
  if (payload.website) return { ok: true };

  const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 320);
  const source = payload.source as Source;
  if (!EMAIL_RE.test(email) || !SOURCES.includes(source)) return { ok: false, error: "invalid" };
  const lang = ["en", "es", "de"].includes(payload.lang ?? "") ? payload.lang : null;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("newsletter_subscribers")
    .upsert({ email, source, lang }, { onConflict: "email,source", ignoreDuplicates: true });

  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}
