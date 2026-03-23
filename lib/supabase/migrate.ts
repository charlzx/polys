import { createClient } from "@supabase/supabase-js";

let migrationRan = false;

export async function runStartupMigration() {
  if (migrationRan) return;
  migrationRan = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return;

  const supabase = createClient(supabaseUrl, serviceKey);

  // Check if the alerts table exists
  const { error } = await supabase.from("alerts").select("id").limit(1);

  if (!error) {
    // Table exists — nothing to do
    return;
  }

  if (error.code !== "PGRST205") {
    // Unexpected error — don't try to migrate
    console.warn("[migrate] Unexpected error checking alerts table:", error.message);
    return;
  }

  // Table doesn't exist — log instructions
  console.warn(
    "[migrate] The 'alerts' table is missing from Supabase.\n" +
    "Please run the migration SQL in your Supabase Dashboard:\n" +
    "https://supabase.com/dashboard/project/wqeuoflqhacbmsktucac/sql/new\n" +
    "File: supabase/migrations/002_alerts.sql"
  );
}
