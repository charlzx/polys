import { NextResponse } from "next/server";

export const runtime = "nodejs";

export interface AlertEmailPayload {
  to: string;
  alertName: string;
  alertType: string;
  marketName: string;
  conditionText: string;
  currentValue: string;
  changeText: string;
  marketUrl?: string;
}

// Internal-only: requires the CRON_SECRET to be present in Authorization header.
// This prevents the route from being used as an open email relay by external callers.
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

function buildEmailHtml(p: AlertEmailPayload): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://polys.app";
  const marketUrl = p.marketUrl ?? `${appUrl}/markets`;
  const typeColor: Record<string, string> = {
    odds: "#6366f1",
    volume: "#f59e0b",
    new: "#10b981",
    arbitrage: "#ef4444",
  };
  const color = typeColor[p.alertType] ?? "#6366f1";
  const typeLabel: Record<string, string> = {
    odds: "Odds Movement",
    volume: "Volume Spike",
    new: "New Market",
    arbitrage: "Arbitrage",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alert: ${p.alertName}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr>
          <td style="padding-bottom:24px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Polys</span>
            <span style="font-size:14px;color:#6b7280;margin-left:8px;">Market Intelligence</span>
          </td>
        </tr>

        <tr>
          <td style="background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden;">
            <div style="height:4px;background:${color};"></div>
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 32px;">
              <tr>
                <td>
                  <div style="margin-bottom:20px;">
                    <span style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${color}22;color:${color};border:1px solid ${color}44;">
                      ${typeLabel[p.alertType] ?? p.alertType}
                    </span>
                    <h1 style="margin:12px 0 4px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${p.alertName}</h1>
                    <p style="margin:0;font-size:14px;color:#9ca3af;">${p.marketName}</p>
                  </div>

                  <div style="background:#0f0f13;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Condition Met</p>
                    <p style="margin:0;font-size:15px;color:#e5e7eb;">${p.conditionText}</p>
                  </div>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="width:50%;padding-right:8px;">
                        <div style="background:#0f0f13;border-radius:8px;padding:14px;text-align:center;">
                          <div style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Current Value</div>
                          <div style="font-size:20px;font-weight:700;color:#ffffff;">${p.currentValue}</div>
                        </div>
                      </td>
                      <td style="width:50%;padding-left:8px;">
                        <div style="background:#0f0f13;border-radius:8px;padding:14px;text-align:center;">
                          <div style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Change</div>
                          <div style="font-size:20px;font-weight:700;color:${color};">${p.changeText}</div>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <a href="${marketUrl}" style="display:block;text-align:center;background:${color};color:#ffffff;font-size:15px;font-weight:600;padding:14px 24px;border-radius:8px;text-decoration:none;">
                    View Market
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#4b5563;">
              You're receiving this because you set up an alert on <a href="${appUrl}" style="color:#6b7280;">Polys</a>.<br/>
              <a href="${appUrl}/alerts" style="color:#6b7280;">Manage alerts</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  // Require internal CRON_SECRET — prevents open relay abuse
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  let payload: AlertEmailPayload;
  try {
    payload = (await request.json()) as AlertEmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.to || !payload.alertName) {
    return NextResponse.json({ error: "Missing required fields: to, alertName" }, { status: 400 });
  }

  const html = buildEmailHtml(payload);
  const subject = `[Polys] ${payload.alertName} — ${payload.changeText}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Polys Alerts <onboarding@resend.dev>",
      to: [payload.to],
      subject,
      html,
    }),
  });

  const data = (await res.json()) as { id?: string; name?: string; message?: string };

  if (!res.ok) {
    console.error("[alerts/send] Resend error:", data);
    return NextResponse.json(
      { error: data.message ?? "Resend API error", details: data },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true, emailId: data.id });
}
