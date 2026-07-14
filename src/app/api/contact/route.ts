import { Resend } from "resend";
import { NextResponse } from "next/server";

const INTEREST_LABELS: Record<string, string> = {
  pilot: "Hospital pilot",
  partnership: "Partnership",
  investment: "Investment",
  other: "Other",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const organization = String(body.organization ?? "").trim();
    const interest = String(body.interest ?? "other").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Please fill in name, email, and message." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const leadsTo = process.env.LEADS_EMAIL;
    const apiKey = process.env.RESEND_API_KEY;

    if (!leadsTo || !apiKey) {
      console.error("Missing LEADS_EMAIL or RESEND_API_KEY");
      return NextResponse.json(
        { error: "Lead delivery is not configured yet. Please try again later." },
        { status: 503 },
      );
    }

    const interestLabel = INTEREST_LABELS[interest] ?? interest;
    const resend = new Resend(apiKey);
    const from =
      process.env.LEADS_FROM_EMAIL ?? "DOQTO Website <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from,
      to: [leadsTo],
      replyTo: email,
      subject: `New DOQTO lead: ${interestLabel}, ${name}`,
      text: [
        "New lead from doqto.vercel.app",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Organization: ${organization || "n/a"}`,
        `Interest: ${interestLabel}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; color: #1a0a0a;">
          <h2 style="color: #cc0000; margin: 0 0 8px;">New DOQTO lead</h2>
          <p style="color: #5c3d3d; margin: 0 0 24px;">Submitted from the website contact form.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr><td style="padding: 8px 0; color: #5c3d3d;">Name</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; color: #5c3d3d;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #5c3d3d;">Organization</td><td style="padding: 8px 0;">${escapeHtml(organization || "n/a")}</td></tr>
            <tr><td style="padding: 8px 0; color: #5c3d3d;">Interest</td><td style="padding: 8px 0;">${escapeHtml(interestLabel)}</td></tr>
          </table>
          <div style="margin-top: 24px; padding: 16px; background: #fff5f0; border-radius: 12px;">
            <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #cc0000;">Message</p>
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Could not send your message. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
