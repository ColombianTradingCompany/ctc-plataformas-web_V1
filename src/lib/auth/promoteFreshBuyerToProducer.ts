import type { SupabaseClient } from "@supabase/supabase-js";

// Google sign-in carries no `role` metadata, so the shared handle_new_user
// trigger defaults brand-new accounts to 'buyer'. This promotes them to
// 'producer' -- but ONLY a fresh, still-default buyer. Never touches a
// bcp_admin (that would downgrade a CTC staff account) or an established
// buyer with real data. Shared by the Kaffetal Regal OAuth callback and the
// CTC Home lead flow (producer pillars). `service` must be the service-role
// client (profiles.role is guard-trigger-protected from user JWTs).
export async function promoteFreshBuyerToProducer(service: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await service.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "buyer") return false;

  const { data: buyerProfile } = await service
    .from("buyer_profiles")
    .select("lifetime_points, company_name, vat_number")
    .eq("profile_id", userId)
    .maybeSingle();

  const looksUnused =
    buyerProfile && buyerProfile.lifetime_points === 0 && !buyerProfile.company_name && !buyerProfile.vat_number;
  if (!looksUnused) return false;

  await service.from("profiles").update({ role: "producer" }).eq("id", userId);
  await service.from("producer_profiles").insert({ profile_id: userId });
  await service.from("buyer_profiles").delete().eq("profile_id", userId);
  return true;
}
