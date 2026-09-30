// Positive-path checkout regression against the hardened place_order().
// Run with: node scripts/qa-checkout-check.mjs <listingId> <kg> [<buyerEmail> <password>]
//
// V5.98 (owner, 2026-09-30): sin cuenta por argumento lee la cuenta de auditoría del comprador de `.env.local`
// (`QA_BUYER_EMAIL`, `QA_PASSWORD`). Solo acepta cuentas `@ctc-qa-test.co` y al terminar BORRA el pedido que hizo
// (`order_items` + `orders`) y la reserva, con service role: crea un pedido REAL en producción y lo deshace.

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

const [, , listingId, kg] = process.argv;
const email = process.argv[4] || process.env.QA_BUYER_EMAIL;
const password = process.argv[5] || process.env.QA_PASSWORD;
if (!listingId || !kg || !email || !password) { console.error("Uso: node scripts/qa-checkout-check.mjs <listingId> <kg> [<buyerEmail> <password>] (o QA_BUYER_EMAIL / QA_PASSWORD en .env.local)"); process.exit(1); }
if (!email.toLowerCase().endsWith("@ctc-qa-test.co")) { console.error(`Solo se corre con una cuenta @ctc-qa-test.co: ${email}`); process.exit(1); }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const limpieza = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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

// --- Limpieza: el pedido de prueba no se queda en producción ---
const { error: e1 } = await limpieza.from("order_items").delete().eq("order_id", orderId);
const { error: e2 } = await limpieza.from("orders").delete().eq("id", orderId);
const { error: e3 } = await limpieza.from("lot_reservations").delete().eq("lot_listing_id", listingId).eq("buyer_id", auth.user.id);
for (const [que, e] of [["order_items", e1], ["orders", e2], ["lot_reservations", e3]]) if (e) console.log(`  WARN  limpieza ${que}: ${e.message}`);
console.log(e1 || e2 || e3 ? "limpieza INCOMPLETA: revise a mano" : "limpieza OK: pedido y reserva borrados");
if (e1 || e2 || e3) process.exit(1);
