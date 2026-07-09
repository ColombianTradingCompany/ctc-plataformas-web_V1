// Disposable QA helper: creates a pre-confirmed producer test account, bypassing
// GoTrue's public /signup endpoint (which requires a confirmation email and hits
// Supabase's default-SMTP rate limit in this project). For manual verification only
// -- delete the account afterward with scripts/delete-qa-producer.mjs.
// Run with: node scripts/create-qa-producer.mjs <email> <password> <fullName>

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

const [, , email, password, fullName] = process.argv;
if (!email || !password) {
  console.error("Usage: node scripts/create-qa-producer.mjs <email> <password> [fullName]");
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
  user_metadata: { role: "producer", full_name: fullName || "QA Producer" },
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

console.log(`Created QA producer: ${email} (${data.user.id})`);
