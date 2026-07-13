"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { promoteFreshBuyerToProducer } from "@/lib/auth/promoteFreshBuyerToProducer";
import { sendLeadWelcomeEmail } from "@/lib/email/leadEmails";

// Public lead intake for CTC Home's "Escríbenos" + the "Más allá de la
// exportación" service CTAs. Every lead becomes a platform account:
// Co-Create (demand side) -> Cherry Picked buyer; everything else ->
// Kaffetal Regal producer. Both tables are service-role-only (RLS, no
// policies), so all writes happen here.

const PILLARS = ["general", "tech", "cocreate", "varietales"] as const;
type Pillar = (typeof PILLARS)[number];

// Whitelist of pillar-specific fields (anything else is dropped).
const FIELD_KEYS: Record<Pillar, string[]> = {
  general: ["org", "tema"],
  tech: ["finca", "ubicacion", "interes"],
  cocreate: ["marca", "mercado", "canal", "formato", "vol"],
  varietales: ["finca", "ubicacion", "varietal", "cantidad"],
};

export type LeadPayload = {
  pillar: string;
  nombre: string;
  email?: string;
  message: string;
  fields: Record<string, unknown>;
  website?: string; // honeypot -- rendered hidden; bots fill it
};

export type LeadSubmitResult =
  | { ok: true; outcome: "created" | "existing"; pillar: Pillar }
  | { ok: false; message: string };

function sanitize(payload: LeadPayload): { pillar: Pillar; nombre: string; message: string; fields: Record<string, unknown> } | null {
  const pillar = payload.pillar as Pillar;
  if (!PILLARS.includes(pillar)) return null;
  const nombre = String(payload.nombre ?? "").trim().slice(0, 200);
  const message = String(payload.message ?? "").trim().slice(0, 4000);
  if (!nombre) return null;
  const fields: Record<string, unknown> = {};
  for (const key of FIELD_KEYS[pillar]) {
    const v = payload.fields?.[key];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) fields[key] = v.map((x) => String(x).slice(0, 200)).slice(0, 20);
    else fields[key] = String(v).slice(0, 500);
  }
  return { pillar, nombre, message, fields };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 12-char URL-safe password for accounts created on the lead's behalf. It is
// stored on the lead row (explicit product decision) until the first BCP
// reply delivers it, then cleared.
function generatePassword(): string {
  return randomBytes(9).toString("base64url");
}

async function insertLeadAndWelcome(
  service: ReturnType<typeof createServiceRoleClient>,
  row: {
    pillar: Pillar;
    nombre: string;
    email: string;
    message: string;
    fields: Record<string, unknown>;
    profile_id: string | null;
    account_provisioning: "created_password" | "created_google" | "existing";
    temp_password: string | null;
    submitted_ip: string | null;
  }
): Promise<LeadSubmitResult> {
  const { data: lead, error } = await service.from("leads").insert(row).select("id").single();
  if (error || !lead) return { ok: false, message: "No pudimos registrar tu solicitud. Intenta de nuevo." };

  // Welcome email: the lead exists even if the send fails -- BCP can retry.
  const result = await sendLeadWelcomeEmail({
    pillar: row.pillar,
    nombre: row.nombre,
    email: row.email,
    account_provisioning: row.account_provisioning,
  });
  await service
    .from("leads")
    .update(result.ok ? { welcome_sent_at: new Date().toISOString(), welcome_error: null } : { welcome_error: result.error })
    .eq("id", lead.id);

  return { ok: true, outcome: row.account_provisioning === "existing" ? "existing" : "created", pillar: row.pillar };
}

// --- Path (b): visitor gives an email; we create the account on their behalf.
export async function submitLeadPublic(payload: LeadPayload): Promise<LeadSubmitResult> {
  // Honeypot: pretend success, write nothing.
  if (payload.website && String(payload.website).trim() !== "") {
    return { ok: true, outcome: "created", pillar: "general" };
  }
  const clean = sanitize(payload);
  const email = String(payload.email ?? "").trim().toLowerCase();
  if (!clean || !EMAIL_RE.test(email)) {
    return { ok: false, message: "Revisa tu nombre y correo electrónico e intenta de nuevo." };
  }

  const service = createServiceRoleClient();

  // Pragmatic DB-backed rate limits (public, unauthenticated action).
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString();
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const [{ count: byEmail }, { count: byIp }] = await Promise.all([
    service.from("leads").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", dayAgo),
    ip
      ? service.from("leads").select("id", { count: "exact", head: true }).eq("submitted_ip", ip).gte("created_at", hourAgo)
      : Promise.resolve({ count: 0 } as { count: number | null }),
  ]);
  if ((byEmail ?? 0) >= 3 || (byIp ?? 0) >= 5) {
    return { ok: false, message: "Ya recibimos tu solicitud — te responderemos pronto a tu correo." };
  }

  // Account resolution: link an existing account, or create one on their
  // behalf (handle_new_user honors user_metadata.role, so one call provisions
  // the right profile + sub-profile).
  const { data: existing } = await service.from("profiles").select("id").eq("email", email).maybeSingle();
  let profileId: string | null = existing?.id ?? null;
  let provisioning: "created_password" | "existing" = existing ? "existing" : "created_password";
  let tempPassword: string | null = null;

  if (!existing) {
    tempPassword = generatePassword();
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: clean.pillar === "cocreate" ? "buyer" : "producer", full_name: clean.nombre },
    });
    if (createError || !created.user) {
      // Race (double submit): fall back to linking the account that just won.
      const { data: raced } = await service.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!raced) return { ok: false, message: "No pudimos crear tu cuenta. Intenta de nuevo en unos minutos." };
      profileId = raced.id;
      provisioning = "existing";
      tempPassword = null;
    } else {
      profileId = created.user.id;
    }
  }

  return insertLeadAndWelcome(service, {
    pillar: clean.pillar,
    nombre: clean.nombre,
    email,
    message: clean.message,
    fields: clean.fields,
    profile_id: profileId,
    account_provisioning: provisioning,
    temp_password: tempPassword,
    submitted_ip: ip,
  });
}

// --- Path (a): visitor continued with Google; the ContactModal resumes the
// stashed form once the session exists. Email comes from the session, and the
// pillar (known only here, server-side) decides any role promotion.
export async function submitLeadAuthed(payload: LeadPayload): Promise<LeadSubmitResult> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user?.email) return { ok: false, message: "Tu sesión expiró. Envía el formulario de nuevo." };

  const clean = sanitize(payload);
  if (!clean) return { ok: false, message: "Revisa el formulario e intenta de nuevo." };

  const service = createServiceRoleClient();

  // Producer pillars promote a pristine trigger-default buyer to producer;
  // cocreate leaves the buyer default (or an existing role) alone.
  if (clean.pillar !== "cocreate") {
    await promoteFreshBuyerToProducer(service, user.id);
  }

  const isFresh = Date.now() - new Date(user.created_at).getTime() < 10 * 60e3;

  return insertLeadAndWelcome(service, {
    pillar: clean.pillar,
    nombre: clean.nombre,
    email: user.email.toLowerCase(),
    message: clean.message,
    fields: clean.fields,
    profile_id: user.id,
    account_provisioning: isFresh ? "created_google" : "existing",
    temp_password: null,
    submitted_ip: null,
  });
}
