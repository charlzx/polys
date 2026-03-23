import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Cron entry-point for alert evaluation.
// Schedule this endpoint to be called every 5 minutes by your scheduler.
//
// Example: curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/alerts
//
// On Replit with deployment, use an external service (e.g., cron-job.org, Upstash QStash)
// to call this URL every 5 minutes with the Authorization header.
//
// CRON_SECRET must match the value set in your environment variables.

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { origin } = new URL(request.url);

  // Forward to the alert check engine with the cron secret
  const cronSecret = process.env.CRON_SECRET ?? "";
  const res = await fetch(`${origin}/api/alerts/check`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: "Alert check failed", details: body },
      { status: res.status }
    );
  }

  const result = await res.json();
  return NextResponse.json({ ok: true, ...result });
}
