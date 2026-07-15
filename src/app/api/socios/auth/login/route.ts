import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createEphemeralClient, createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { isPartnerSlug } from "@/lib/partners/partners";

// ── Partner login (single factor, like Kaffetal/Cherry Picked) ──────────────
// Validates email+password against an ephemeral client, then requires the
// partner tier: profiles.role='partner' + a non-suspended partner_accounts row
// for EXACTLY the node being entered. Every rejection returns the same generic
// error (no tier/role leaks). First successful login flips invited → active.

const GENERIC_ERROR = "Credenciales inválidas.";

export async function POST(request: NextRequest) {
  const { email, password, node } = await request.json();
  if (!email || !password || typeof node !== "string" || !isPartnerSlug(node)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const ephemeral = createEphemeralClient();
  const { data: signInData, error: signInError } = await ephemeral.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.session || !signInData.user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const { data: profile } = await ephemeral.from("profiles").select("role").eq("id", signInData.user.id).single();
  if (profile?.role !== "partner") {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const { data: account } = await service
    .from("partner_accounts")
    .select("node_type, status")
    .eq("profile_id", signInData.user.id)
    .maybeSingle();
  if (!account || account.node_type !== node || account.status === "suspended") {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const sessionClient = await createSessionClient();
  const { error: setErr } = await sessionClient.auth.setSession({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
  if (setErr) {
    return NextResponse.json({ error: "No se pudo iniciar la sesión." }, { status: 500 });
  }

  const now = new Date().toISOString();
  await service
    .from("partner_accounts")
    .update(account.status === "invited" ? { status: "active", activated_at: now, last_login_at: now } : { last_login_at: now })
    .eq("profile_id", signInData.user.id);

  return NextResponse.json({ ok: true });
}
