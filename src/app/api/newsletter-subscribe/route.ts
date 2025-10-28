// src/app/api/newsletter-subscribe/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Simple email pattern (server-side safety net)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { email, source } = await req.json();

    // --- Basic validation ---
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      console.warn("[newsletter-subscribe] Invalid email received:", email);
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Capture some context (nice-to-have for analytics/abuse)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // --- Supabase client (anon) ---
    // Using anon key is OK here because RLS allows only INSERT.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Try insert. Unique index prevents duplicates.
    const { error } = await supabase.from("email_subscribers").insert([
      {
        email,
        source: source || "homepage",
        ip,
        user_agent: userAgent,
      },
    ]);

    if (error) {
      // If duplicate, report friendly message
      const isDuplicate =
        error.message?.toLowerCase().includes("duplicate") ||
        error.details?.toLowerCase().includes("duplicate") ||
        error.code === "23505";
      if (isDuplicate) {
        console.info("[newsletter-subscribe] Duplicate email:", email);
        return NextResponse.json(
          { ok: true, duplicate: true, message: "You're already subscribed." },
          { status: 200 }
        );
      }

      console.error("[newsletter-subscribe] Insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Subscription failed. Please try again later." },
        { status: 500 }
      );
    }

    console.log("[newsletter-subscribe] Subscribed:", { email, ip });
    return NextResponse.json(
      { ok: true, message: "Thanks for subscribing!" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[newsletter-subscribe] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error. Please try again later." },
      { status: 500 }
    );
  }
}
