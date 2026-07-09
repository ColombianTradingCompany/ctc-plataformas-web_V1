// Disposable QA helper: deletes a test auth user (and cascades profiles/producer_profiles/etc via FK).
// Run with: node scripts/delete-qa-user.mjs <userId>

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

const [, , userId] = process.argv;
if (!userId) {
  console.error("Usage: node scripts/delete-qa-user.mjs <userId>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { error } = await supabase.auth.admin.deleteUser(userId);
if (error) {
  console.error("Failed to delete user:", error.message);
  process.exit(1);
}
console.log(`Deleted user ${userId}`);
