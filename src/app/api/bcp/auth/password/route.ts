import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createEphemeralClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateOtpCode, hashOtpCode } from "@/lib/bcp/otp";
import { sendOtpEmail } from "@/lib/bcp/sendOtpEmail";

const GENERIC_ERROR = "Credenciales inválidas.";
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_CODES_PER_WINDOW = 3;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const ephemeral = createEphemeralClient();
  const { data: signInData, error: signInError } = await ephemeral.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session || !signInData.user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const { data: profile } = await ephemeral
    .from("profiles")
    .select("role")
    .eq("id", signInData.user.id)
    .single();

  if (profile?.role !== "bcp_admin") {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await service
    .from("admin_otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", signInData.user.id)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= MAX_CODES_PER_WINDOW) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
  }

  await service
    .from("admin_otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("profile_id", signInData.user.id)
    .is("consumed_at", null);

  const code = generateOtpCode();
  const { data: otpRow, error: otpError } = await service
    .from("admin_otp_codes")
    .insert({
      profile_id: signInData.user.id,
      code_hash: hashOtpCode(code),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    })
    .select("pending_login_token")
    .single();

  if (otpError || !otpRow) {
    return NextResponse.json({ error: "No se pudo iniciar el proceso. Intenta de nuevo." }, { status: 500 });
  }

  await sendOtpEmail(code);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    "bcp_pending",
    JSON.stringify({
      pendingLoginToken: otpRow.pending_login_token,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: OTP_TTL_MS / 1000,
    }
  );
  return response;
}
