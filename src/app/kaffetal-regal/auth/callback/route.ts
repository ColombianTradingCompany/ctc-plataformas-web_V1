import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { promoteFreshBuyerToProducer } from "@/lib/auth/promoteFreshBuyerToProducer";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/kaffetal-regal`);
  }

  const sessionClient = await createSessionClient();
  const { data, error } = await sessionClient.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/kaffetal-regal`);
  }

  // A Kaffetal Regal Google sign-in is a producer sign-in: promote the
  // trigger-default fresh buyer to producer (shared helper; guards bcp_admin
  // and established buyers).
  await promoteFreshBuyerToProducer(createServiceRoleClient(), data.user.id);

  return NextResponse.redirect(`${origin}/kaffetal-regal`);
}
