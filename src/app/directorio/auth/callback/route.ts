import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// Google sign-in for the Directorio del Café. Unlike Kaffetal Regal's callback,
// this does NOT promote the account to any role: the Directorio is orthogonal to
// the producer/buyer model. A brand-new Google account lands here as the
// trigger-default (inert) buyer and simply gets a directorio_profiles row once
// it completes the inscription form. An existing Kaffetal Regal / Cherry Picked
// account signs in with the SAME identity and keeps its role untouched.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/directorio`);
  }

  const sessionClient = await createSessionClient();
  await sessionClient.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(`${origin}/directorio`);
}
