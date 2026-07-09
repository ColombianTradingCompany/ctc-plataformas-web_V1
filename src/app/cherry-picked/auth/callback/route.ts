import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (code) {
    const sessionClient = await createSessionClient();
    // Google sign-in carries no role metadata, but the shared handle_new_user
    // trigger already defaults a role-less new user to 'buyer' -- exactly
    // what a Cherry Picked signup needs, so no correction step is required here.
    await sessionClient.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/cherry-picked`);
}
