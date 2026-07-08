// One-time (or occasional) helper to create a CTC Business Control Panel
// admin account. Run with: node scripts/seed-bcp-admin.mjs <email> <password>
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
// in .env.local (this script loads that file itself).

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

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node scripts/seed-bcp-admin.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({ role: "bcp_admin", full_name: "CTC Admin" })
  .eq("id", data.user.id);

if (profileError) {
  console.error("User created, but failed to set role to bcp_admin:", profileError.message);
  process.exit(1);
}

console.log(`Created BCP admin: ${email} (${data.user.id})`);
