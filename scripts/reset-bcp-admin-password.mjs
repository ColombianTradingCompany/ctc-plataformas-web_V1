// Reset a BCP admin's password. Run with:
//   node scripts/reset-bcp-admin-password.mjs <email> <newPassword>
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.

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

const [, , email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-bcp-admin-password.mjs <email> <newPassword>");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: list, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error("Failed to list users:", listError.message);
  process.exit(1);
}

const user = list.users.find((u) => u.email === email);
if (!user) {
  console.error(`No user found with email ${email}`);
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
if (error) {
  console.error("Failed to reset password:", error.message);
  process.exit(1);
}

console.log(`Password reset for ${email}.`);
