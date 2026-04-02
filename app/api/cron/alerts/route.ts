import { NextResponse } from "next/server";
import {
  getCronAuthDebug,
  getCronSecretForInternalCall,
  isCronAuthorized,
} from "@/lib/cron-auth";

export const runtime = "nodejs";

// Cron entry-point: fires alert evaluation every 5 minutes.
//
// Scheduling options:
//   1. Vercel: vercel.json defines schedule "*/5 * * * *". Vercel automatically
//      passes Authorization: Bearer $CRON_SECRET using the env var set in the project.
//   2. External scheduler (cron-job.org, Upstash QStash, or any hosted cron):
//      Call GET https://<your-domain>/api/cron/alerts
//      with header  Authorization: Bearer <CRON_SECRET>  every 5 minutes.
//
// CRON_SECRET must be set in environment variables.

export async function GET(request: Request) {
  try {
    if (!isCronAuthorized(request)) {
      const debug = getCronAuthDebug(request);
      return NextResponse.json(
        {
          error: "Unauthorized",
          reason: debug.failureReason,
          configuredSecretCount: debug.configuredSecretCount,
          hasAuthorizationHeader: debug.hasAuthorizationHeader,
          hasCronHeader: debug.hasCronHeader,
          providedTokenFingerprints: debug.providedTokenFingerprints,
          configuredTokenFingerprints: debug.configuredTokenFingerprints,
        },
        { status: 401 }
      );
    }

    const internalBaseUrl =
      process.env.INTERNAL_API_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      new URL(request.url).origin;

    const cronSecret = getCronSecretForInternalCall(request);
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON secret not configured" }, { status: 503 });
    }

    const res = await fetch(`${internalBaseUrl.replace(/\/$/, "")}/api/alerts/check`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "x-cron-secret": cronSecret,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: "Alert check failed", details: body, internalBaseUrl },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cron execution failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
