import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Cron entry-point: fires alert evaluation every 5 minutes.
//
// Scheduling options:
//   1. Vercel: vercel.json defines schedule "*/5 * * * *". Vercel automatically
//      passes Authorization: Bearer $CRON_SECRET using the env var set in the project.
//   2. External scheduler (Replit deployment, cron-job.org, Upstash QStash):
//      Call GET https://<your-domain>/api/cron/alerts
//      with header  Authorization: Bearer <CRON_SECRET>  every 5 minutes.
//
// CRON_SECRET must be set in environment variables / Replit secrets.

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { origin } = new URL(request.url);
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
