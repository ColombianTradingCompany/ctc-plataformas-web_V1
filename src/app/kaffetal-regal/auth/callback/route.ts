import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";

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

  // Google sign-in carries no `role` metadata, so the shared handle_new_user
  // trigger defaults brand-new accounts to 'buyer'. Promote them to 'producer'
  // here -- but ONLY a fresh, still-default buyer. Never touch a bcp_admin (that
  // would downgrade a CTC staff account) or an established buyer with real data.
  const service = createServiceRoleClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role === "buyer") {
    const { data: buyerProfile } = await service
      .from("buyer_profiles")
      .select("lifetime_points, company_name, vat_number")
      .eq("profile_id", data.user.id)
      .maybeSingle();

    const looksUnused =
      buyerProfile && buyerProfile.lifetime_points === 0 && !buyerProfile.company_name && !buyerProfile.vat_number;

    if (looksUnused) {
      await service.from("profiles").update({ role: "producer" }).eq("id", data.user.id);
      await service.from("producer_profiles").insert({ profile_id: data.user.id });
      await service.from("buyer_profiles").delete().eq("profile_id", data.user.id);
    }
  }

  return NextResponse.redirect(`${origin}/kaffetal-regal`);
}
