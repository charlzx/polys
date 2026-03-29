import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, topic, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
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
      replyTo: email,
      subject: `[Contact] ${topic} — from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}`,
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
