import { NextResponse } from "next/server";
import {
  getCronAuthDebug,
  getCronSecretForInternalCall,
  isCronAuthorized,
} from "@/lib/cron-auth";

export const runtime = "nodejs";

function toValidBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return null;
  }
}

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

    const requestOrigin = new URL(request.url).origin;
    const internalBaseUrlCandidates = [
      toValidBaseUrl(process.env.INTERNAL_API_BASE_URL),
      toValidBaseUrl(process.env.NEXT_PUBLIC_APP_URL),
      requestOrigin,
    ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index);

    const cronSecret = getCronSecretForInternalCall(request);
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON secret not configured" }, { status: 503 });
    }

    let res: Response | null = null;
    let lastFetchError: string | null = null;

    for (const baseUrl of internalBaseUrlCandidates) {
      try {
        const attempt = await fetch(`${baseUrl}/api/alerts/check`, {
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "x-cron-secret": cronSecret,
          },
        });

        res = attempt;
        break;
      } catch (error) {
        lastFetchError = error instanceof Error ? error.message : String(error);
      }
    }

    if (!res) {
      return NextResponse.json(
        {
          error: "Alert check fetch failed",
          details: lastFetchError,
          attemptedBaseUrls: internalBaseUrlCandidates,
        },
        { status: 500 }
      );
    }

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        {
          error: "Alert check failed",
          details: body,
          attemptedBaseUrls: internalBaseUrlCandidates,
        },
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
