// Positive-path checkout regression against the hardened place_order().
// Run with: node scripts/qa-checkout-check.mjs <buyerEmail> <password> <listingId> <kg>

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] ||= match[2].trim();
  }
}
loadEnvLocal();

const [, , email, password, listingId, kg] = process.argv;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
if (loginErr) { console.error("login failed:", loginErr.message); process.exit(1); }

const { error: resErr } = await supabase
  .from("lot_reservations")
  .upsert({ lot_listing_id: listingId, buyer_id: auth.user.id, kg: Number(kg) }, { onConflict: "lot_listing_id,buyer_id" });
if (resErr) { console.error("reservation failed:", resErr.message); process.exit(1); }
console.log(`reserved ${kg} kg OK`);

const { data: orderId, error: orderErr } = await supabase.rpc("place_order", { p_zone_code: "Z1" });
if (orderErr) { console.error("place_order failed:", orderErr.message); process.exit(1); }
console.log(`order placed OK: ${orderId}`);
await supabase.auth.signOut();
