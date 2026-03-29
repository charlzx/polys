export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupMigration } = await import("./lib/supabase/migrate");
    await runStartupMigration();
  }
}
