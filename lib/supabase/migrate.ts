import { createClient } from "@supabase/supabase-js";

let migrationRan = false;

export async function runStartupMigration() {
  if (migrationRan) return;
  migrationRan = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return;

  const supabase = createClient(supabaseUrl, serviceKey);

  // Check alerts table
  const { error: alertsError } = await supabase.from("alerts").select("id").limit(1);
  if (alertsError?.code === "PGRST205") {
    console.warn(
      "[migrate] The 'alerts' table is missing from Supabase.\n" +
      "Please run the migration SQL in your Supabase Dashboard:\n" +
      "https://supabase.com/dashboard/project/wqeuoflqhacbmsktucac/sql/new\n" +
      "File: supabase/migrations/002_alerts.sql"
    );
  }

  // Check watchlist table
  const { error: watchlistError } = await supabase.from("watchlist").select("market_id").limit(1);
  if (watchlistError?.code === "PGRST205") {
    console.warn(
      "[migrate] The 'watchlist' table is missing from Supabase.\n" +
      "Please run the migration SQL in your Supabase Dashboard:\n" +
      "https://supabase.com/dashboard/project/wqeuoflqhacbmsktucac/sql/new\n" +
      "File: supabase/migrations/003_watchlist.sql"
    );
  }

  // Check notifications table
  const { error: notificationsError } = await supabase.from("notifications").select("id").limit(1);
  if (notificationsError?.code === "PGRST205") {
    console.warn(
      "[migrate] The 'notifications' table is missing from Supabase.\n" +
      "Please run the migration SQL in your Supabase Dashboard:\n" +
      "https://supabase.com/dashboard/project/wqeuoflqhacbmsktucac/sql/new\n" +
      "File: supabase/migrations/004_notifications.sql"
    );
  }
}
