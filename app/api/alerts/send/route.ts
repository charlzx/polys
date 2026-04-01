import { NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { AlertEmail } from "@/emails/AlertEmail";
import { isCronAuthorized } from "@/lib/cron-auth";

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

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://polys.app";
  const marketUrl = payload.marketUrl ?? `${appUrl}/markets`;

  const html = await render(
    AlertEmail({
      alertName: payload.alertName,
      alertType: payload.alertType,
      marketName: payload.marketName,
      conditionText: payload.conditionText,
      currentValue: payload.currentValue,
      changeText: payload.changeText,
      marketUrl,
      appUrl,
      triggeredAt: new Date().toISOString(),
    })
  );

  const subject = `[Polys] ${payload.alertName} — ${payload.changeText}`;
  // ALERTS_FROM_EMAIL must be set to a Resend-verified domain email for delivery to all users.
  // Without it, Resend's onboarding sender restricts delivery to the account owner only.
  const from = process.env.ALERTS_FROM_EMAIL;
  if (!from) {
    console.warn(
      "[alerts/send] ALERTS_FROM_EMAIL is not set. " +
      "Falling back to onboarding@resend.dev — emails will only deliver to the Resend account owner. " +
      "Set ALERTS_FROM_EMAIL to a verified domain sender (e.g., alerts@yourdomain.com)."
    );
  }
  const sender = from ?? "Polys Alerts <onboarding@resend.dev>";

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: sender,
    to: [payload.to],
    subject,
    html,
  });

  if (error) {
    console.error("[alerts/send] Resend error:", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, emailId: data?.id });
}
