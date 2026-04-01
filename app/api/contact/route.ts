import { NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const CONTACT_RATE_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_RATE_MAX = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(
      `contact:${ip}`,
      CONTACT_RATE_MAX,
      CONTACT_RATE_WINDOW_MS
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    const body = await req.json();
    const { name, email, topic, message, website } = body;

    // Honeypot field: bots often populate hidden fields.
    if (typeof website === "string" && website.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const safeName = String(name).trim();
    const safeEmail = String(email).trim().toLowerCase();
    const safeTopic = String(topic ?? "General").trim();
    const safeMessage = String(message).trim();

    if (safeName.length < 2 || safeName.length > 120) {
      return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(safeEmail) || safeEmail.length > 254) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (safeTopic.length > 160) {
      return NextResponse.json({ error: "Topic is too long." }, { status: 400 });
    }
    if (safeMessage.length < 10 || safeMessage.length > 5000) {
      return NextResponse.json({ error: "Message must be 10-5000 characters." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[contact] Missing RESEND_API_KEY");
      return NextResponse.json({ error: "Email service is not configured." }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "Polys Contact <onboarding@resend.dev>",
      to: ["contact@polys.app"],
      replyTo: safeEmail,
      subject: `[Contact] ${safeTopic} - from ${safeName}`,
      text: `Name: ${safeName}\nEmail: ${safeEmail}\nTopic: ${safeTopic}\n\nMessage:\n${safeMessage}`,
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
