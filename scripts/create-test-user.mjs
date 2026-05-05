// Script to create a test user in Supabase Auth
// Usage:
//   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env file
//      Get it from: Supabase Dashboard > Project Settings > API > service_role key
//   2. Run: node scripts/create-test-user.mjs

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
if (!key) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env"); console.error("Get it: Supabase Dashboard > Project Settings > API"); process.exit(1); }

const supabase = createClient(url, key);

const { data, error } = await supabase.auth.admin.createUser({
  email: "test@test.com",
  password: "test123456",
  email_confirm: true,
  user_metadata: { full_name: "Test User" },
});

if (error) {
  if (error.message.includes("already been registered")) {
    console.log("User test@test.com already exists — use existing credentials.");
  } else {
    console.error("Error:", error.message);
    process.exit(1);
  }
} else {
  console.log("User ready:", data.user?.email);
}
