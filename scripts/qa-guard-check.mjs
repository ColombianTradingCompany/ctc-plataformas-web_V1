// Security regression suite: signs in as disposable QA users and attempts the
// writes the workflow guards must reject (self-grading, points fraud, bad
// reservations) plus the legitimate writes that must still succeed.
// Run with: node scripts/qa-guard-check.mjs <producerEmail> <buyerEmail> <password>

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

const [, , producerEmail, buyerEmail, password] = process.argv;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

// --- Producer attacks ---
const prod = createClient(url, anon, { auth: { persistSession: false } });
{
  const { data, error } = await prod.auth.signInWithPassword({ email: producerEmail, password });
  if (error) { console.error("producer login failed:", error.message); process.exit(1); }
  const uid = data.user.id;

  const { data: lot } = await prod.from("lots").insert({ producer_id: uid, name: "QA Guard Lot" }).select("id").single();
  check("producer can create own lot", !!lot);

  const selfGrade = await prod.from("lots").update({ stage: "galardonado", grade: "gold" }).eq("id", lot.id).select();
  check("producer CANNOT self-grade (stage/grade)", !!selfGrade.error, selfGrade.error?.message ?? "(no error!)");

  const fichaBump = await prod.from("lots").update({ stage: "ficha_completa", name: "QA Guard Lot v2" }).eq("id", lot.id).select();
  check("producer CAN still save ficha (borrador->ficha_completa)", !fichaBump.error && fichaBump.data.length === 1, fichaBump.error?.message);

  const nameSave = await prod.from("profiles").update({ full_name: "QA Guard Renamed" }).eq("id", uid).select();
  check("producer CAN update own full_name (F1 fixed)", !nameSave.error && nameSave.data.length === 1, nameSave.error?.message);

  const rolePromo = await prod.from("profiles").update({ role: "bcp_admin" }).eq("id", uid).select();
  check("producer CANNOT self-promote role", !!rolePromo.error, rolePromo.error?.message ?? "(no error!)");

  await prod.auth.signOut();
}

// --- Buyer attacks ---
const buyer = createClient(url, anon, { auth: { persistSession: false } });
{
  const { data, error } = await buyer.auth.signInWithPassword({ email: buyerEmail, password });
  if (error) { console.error("buyer login failed:", error.message); process.exit(1); }
  const uid = data.user.id;

  const pointsFraud = await buyer.from("buyer_profiles").update({ lifetime_points: 999999 }).eq("profile_id", uid).select();
  check("buyer CANNOT self-award points", !!pointsFraud.error, pointsFraud.error?.message ?? "(no error!)");

  const tierFraud = await buyer.from("buyer_profiles").update({ membership_tier: "maduro" }).eq("profile_id", uid).select();
  check("buyer CANNOT self-set tier", !!tierFraud.error, tierFraud.error?.message ?? "(no error!)");

  const billing = await buyer.from("buyer_profiles").update({ company_name: "QA Roastery" }).eq("profile_id", uid).select();
  check("buyer CAN update billing fields", !billing.error && billing.data.length === 1, billing.error?.message);

  const ghostReservation = await buyer
    .from("lot_reservations")
    .insert({ lot_listing_id: "00000000-0000-0000-0000-000000000000", buyer_id: uid, kg: -50 })
    .select();
  check("buyer CANNOT reserve invalid/unpublished listing", !!ghostReservation.error, ghostReservation.error?.message ?? "(no error!)");

  await buyer.auth.signOut();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
