import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { hashOtpCode } from "@/lib/bcp/otp";

// ── Master login · step 2 (OTP) ─────────────────────────────────────────────
// Consumes the 6-digit code, and only then promotes the parked tokens into a
// real session cookie. On success the client routes to /panel (the console hub).

const GENERIC_ERROR = "Código inválido o expirado.";
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const pendingCookie = request.cookies.get("panel_pending")?.value;
  if (!pendingCookie) {
    return NextResponse.json({ error: "Tu sesión de inicio expiró. Vuelve a intentarlo." }, { status: 401 });
  }

  const { code } = await request.json();
  const { pendingLoginToken, access_token, refresh_token } = JSON.parse(pendingCookie);

  const service = createServiceRoleClient();
  const { data: otpRow } = await service
    .from("admin_otp_codes")
    .select("id, profile_id, code_hash, expires_at, consumed_at, attempt_count")
    .eq("pending_login_token", pendingLoginToken)
    .is("consumed_at", null)
    .single();

  if (!otpRow || new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }
  if (otpRow.attempt_count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Demasiados intentos. Solicita un nuevo código." }, { status: 429 });
  }

  if (hashOtpCode(code ?? "") !== otpRow.code_hash) {
    await service
      .from("admin_otp_codes")
      .update({ attempt_count: otpRow.attempt_count + 1 })
      .eq("id", otpRow.id);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await service.from("admin_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

  const sessionClient = await createSessionClient();
  const { error: setSessionError } = await sessionClient.auth.setSession({ access_token, refresh_token });
  if (setSessionError) {
    return NextResponse.json({ error: "No se pudo completar el inicio de sesión." }, { status: 500 });
  }

  // Stamp the login on panel_users, and flip an invited collaborator to active on
  // their first successful sign-in. No-op for a grandfathered admin (no row).
  if (otpRow.profile_id) {
    const now = new Date().toISOString();
    const { data: pu } = await service
      .from("panel_users")
      .select("status")
      .eq("profile_id", otpRow.profile_id)
      .maybeSingle();
    if (pu) {
      await service
        .from("panel_users")
        .update(
          pu.status === "invited"
            ? { last_login_at: now, status: "active", activated_at: now }
            : { last_login_at: now }
        )
        .eq("profile_id", otpRow.profile_id);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("panel_pending");
  return response;
}
