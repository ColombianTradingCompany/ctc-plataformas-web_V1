// Security regression suite: signs in as disposable QA users and attempts the
// writes the workflow guards must reject (self-grading, points fraud, bad
// reservations) plus the legitimate writes that must still succeed.
// Run with: node scripts/qa-guard-check.mjs [<producerEmail> <buyerEmail> <password>]
//
// V5.98 (owner, 2026-09-30): sin argumentos lee las DOS cuentas de auditoría de `.env.local` (`QA_PRODUCER_EMAIL`,
// `QA_BUYER_EMAIL`, `QA_PASSWORD`), que son del nodo final. Solo acepta cuentas del dominio de pruebas (`@ctc-qa-test.co`)
// y al terminar LIMPIA lo que escribió (el lote de prueba, el nombre y la razón social que cambió): la base queda como
// estaba. Escribe contra producción: por eso no va en ninguna batería automática.

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

const producerEmail = process.argv[2] || process.env.QA_PRODUCER_EMAIL;
const buyerEmail = process.argv[3] || process.env.QA_BUYER_EMAIL;
const password = process.argv[4] || process.env.QA_PASSWORD;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DOMINIO_PRUEBAS = "@ctc-qa-test.co";
if (!producerEmail || !buyerEmail || !password) { console.error("Faltan las cuentas: argumentos o QA_PRODUCER_EMAIL / QA_BUYER_EMAIL / QA_PASSWORD en .env.local"); process.exit(1); }
for (const e of [producerEmail, buyerEmail]) if (!e.toLowerCase().endsWith(DOMINIO_PRUEBAS)) { console.error(`Solo se corre con cuentas ${DOMINIO_PRUEBAS}: ${e}`); process.exit(1); }
// La limpieza va con service role: borra SOLO lo que este guardián escribió.
const limpieza = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const deshacer = [];

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
  const { data: antes } = await limpieza.from("profiles").select("full_name").eq("id", uid).maybeSingle();
  deshacer.push(async () => { await limpieza.from("profiles").update({ full_name: antes?.full_name ?? "QA Productor" }).eq("id", uid); });

  const { data: lot } = await prod.from("lots").insert({ producer_id: uid, name: "QA Guard Lot" }).select("id").single();
  check("producer can create own lot", !!lot);
  if (lot) deshacer.push(async () => { await limpieza.from("producer_comm_log").delete().eq("lot_id", lot.id); await limpieza.from("lots").delete().eq("id", lot.id); });

  const selfGrade = await prod.from("lots").update({ stage: "galardonado", grade: "gold" }).eq("id", lot.id).select();
  check("producer CANNOT self-grade (stage/grade)", !!selfGrade.error, selfGrade.error?.message ?? "(no error!)");

  // V5.48: `lots.public_code` is the lot's PUBLIC identifier -- it resolves
  // /ctcx-public-catalogue/<code> and it goes printed on the bag. `lots_update_own`
  // has no WITH CHECK, so without `public_code` in guard_lot_protected_columns a
  // producer could PATCH their own row and write anything onto a public URL, or
  // squat a code and break an already-shared link. Minted service-role only, in
  // publishLot().
  const selfCode = await prod.from("lots").update({ public_code: "CTCX-HACK-HACK" }).eq("id", lot.id).select();
  check("producer CANNOT set public_code", !!selfCode.error, selfCode.error?.message ?? "(no error!)");

  // V5.64: cerrar la Ficha exige DOS fotos (guard trigger `guard_lot_fotos_intake`, solo en la transición). Sin fotos se rechaza;
  // con dos entradas en `datasheet.b4_files_foto` el productor SÍ puede cerrarla (el resto de columnas protegidas siguen cerradas).
  const sinFotos = await prod.from("lots").update({ stage: "ficha_completa", name: "QA Guard Lot v2" }).eq("id", lot.id).select();
  check("producer CANNOT close the Ficha without 2 photos (guard_lot_fotos_intake)", !!sinFotos.error && /2 fotos/.test(sinFotos.error?.message ?? ""), sinFotos.error?.message ?? "(no error!)");
  const conFotos = await prod.from("lots").update({ stage: "ficha_completa", name: "QA Guard Lot v2", datasheet: { b4_files_foto: [{ assetId: "qa-guard-1", fileName: "a.jpg" }, { assetId: "qa-guard-2", fileName: "b.jpg" }] } }).eq("id", lot.id).select();
  check("producer CAN still save ficha (borrador->ficha_completa) with 2 photos", !conFotos.error && conFotos.data.length === 1, conFotos.error?.message);

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
  const { data: antesB } = await limpieza.from("buyer_profiles").select("company_name").eq("profile_id", uid).maybeSingle();
  deshacer.push(async () => { await limpieza.from("buyer_profiles").update({ company_name: antesB?.company_name ?? null }).eq("profile_id", uid); });

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

// --- Limpieza: la base queda como estaba ---
for (const paso of deshacer.reverse()) { try { await paso(); } catch (e) { console.log(`  WARN  limpieza: ${e?.message ?? e}`); } }
const { data: sobras } = await limpieza.from("lots").select("id").like("name", "QA Guard Lot%");
check("limpieza: no queda ningún lote de prueba", (sobras ?? []).length === 0, `${(sobras ?? []).length} sin borrar`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
