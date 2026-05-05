// Script to delete ALL users from Supabase Auth
// Usage:
//   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env file
//      Get it from: Supabase Dashboard > Project Settings > API > service_role key
//   2. Run: node scripts/delete-all-users.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf-8");

const url = envContent.match(/VITE_SUPABASE_URL="?([^"\n\r]+)"?/)?.[1];
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\n\r]+)"?/)?.[1];

if (!url) { console.error("Missing VITE_SUPABASE_URL in .env"); process.exit(1); }
if (!key) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }

const supabase = createClient(url, key);

let deleted = 0;
let page = 1;
const perPage = 100;

while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) { console.error("List error:", error.message); process.exit(1); }
  if (!data.users.length) break;

  for (const user of data.users) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("Delete error for", user.email, ":", delErr.message);
    } else {
      deleted++;
      console.log("Deleted:", user.email);
    }
  }

  if (data.users.length < perPage) break;
  page++;
}

console.log(`\nDone — ${deleted} user(s) deleted.`);
