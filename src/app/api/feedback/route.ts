// src/app/api/feedback/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import crypto from "crypto";

/**
 * Helpers for the new open-feedback flow
 */
const VALID_CATEGORIES = new Set([
  "bug",
  "idea",
  "content",
  "data-accuracy",
  "other",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeContent(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function todayBucket(date = new Date()) {
  // YYYY-MM-DD (UTC)
  return date.toISOString().slice(0, 10);
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * POST /api/feedback
 * Supports TWO payload shapes:
 *
 *  A) AI chat thumbs feedback (existing behavior, DO NOT BREAK):
 *     { uuid: string, feedback: 'positive' | 'negative' }
 *
 *  B) Open feedback from header modal (new):
 *     {
 *       category: 'bug'|'idea'|'content'|'data-accuracy'|'other',
 *       message: string (>=20 chars),
 *       email?: string,
 *       contactOk?: boolean,
 *       pagePath?: string
 *     }
 */
export async function POST(req: Request) {
  try {
    const started = Date.now();
    const body = await req.json();

    // ----------------------------
    // Branch A: Existing AI chat feedback
    // ----------------------------
    if (
      typeof body?.uuid === "string" &&
      ["positive", "negative"].includes(body?.feedback)
    ) {
      const { uuid, feedback } = body as {
        uuid: string;
        feedback: "positive" | "negative";
      };

      // ✅ Validate types and values
      if (!uuid) {
        console.warn("⚠️ Invalid feedback payload (missing uuid):", body);
        return NextResponse.json(
          { success: false, error: "Invalid feedback data" },
          { status: 400 }
        );
      }

      // ✅ Update feedback in log_ai_chat table
      const { error } = await supabase
        .from("log_ai_chat")
        .update({
          feedback,
          feedbackTimestamp: new Date().toISOString(),
        })
        .eq("uuid", uuid);

      if (error) {
        console.error("[ai-feedback] Supabase update failed:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
      }

      console.log(
        "[ai-feedback] updated",
        { uuid, feedback, ms: Date.now() - started },
      );
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ----------------------------
    // Branch B: New open feedback submission
    // ----------------------------
    const {
      category,
      message,
      email,
      contactOk,
      pagePath,
    } = body || {};

    // Basic validation
    if (!VALID_CATEGORIES.has(category)) {
      console.warn("[open-feedback] invalid category:", category);
      return NextResponse.json(
        { ok: false, error: "Invalid category." },
        { status: 400 }
      );
    }
    if (
      typeof message !== "string" ||
      message.trim().length < 20 ||
      message.length > 2000
    ) {
      console.warn("[open-feedback] invalid/short message");
      return NextResponse.json(
        { ok: false, error: "Please provide at least 20 characters." },
        { status: 400 }
      );
    }
    if (email && !EMAIL_REGEX.test(email)) {
      console.warn("[open-feedback] invalid email:", email);
      return NextResponse.json(
        { ok: false, error: "Invalid email address." },
        { status: 400 }
      );
    }
    if (contactOk && (!email || !EMAIL_REGEX.test(email))) {
  console.warn("[open-feedback] consent without valid email");
  return NextResponse.json(
    { ok: false, error: "Email is required if you’d like us to contact you." },
    { status: 400 }
  );
}


    // Build hashes & context
    const normalized = normalizeContent(message);
    const bucket = todayBucket();
    const contentHash = sha256(`${normalized}::${bucket}::${email || ""}`);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const salt = process.env.FEEDBACK_IP_SALT || "rotate-me-in-prod";
    const ipHash = sha256(`${ip}::${salt}`);

    // Soft rate limit: max 3 feedbacks per IP/day
    const { data: recent, error: rlErr } = await supabase
      .from("feedback")
      .select("id, created_at")
      .eq("ip_hash", ipHash)
      .gte("created_at", `${bucket}T00:00:00.000Z`)
      .lte("created_at", `${bucket}T23:59:59.999Z`);

    if (rlErr) {
      // Non-fatal: proceed without blocking if query fails
      console.warn("[open-feedback] rate-limit query error:", rlErr);
    } else if ((recent?.length || 0) >= 3) {
      console.info("[open-feedback] rate-limited ipHash:", ipHash);
      return NextResponse.json(
        {
          ok: false,
          error: "You’ve reached today’s feedback limit. Thank you!",
        },
        { status: 429 }
      );
    }

    // Insert (unique index on content_hash dedupes same-day same-content)
    const { error: insertErr } = await supabase.from("feedback").insert([
      {
        category,
        message,
        email: email || null,
        contact_ok: !!contactOk,
        page_path: typeof pagePath === "string" ? pagePath : null,
        user_agent: userAgent,
        ip_hash: ipHash,
        content_hash: contentHash,
      },
    ]);

    if (insertErr) {
      const isDuplicate =
        insertErr.code === "23505" ||
        insertErr.message?.toLowerCase().includes("duplicate");
      if (isDuplicate) {
        console.info("[open-feedback] duplicate blocked (content_hash).");
        return NextResponse.json(
          { ok: true, duplicate: true, message: "We already received this today — thanks!" },
          { status: 200 }
        );
      }
      console.error("[open-feedback] insert error:", insertErr);
      return NextResponse.json(
        { ok: false, error: "Could not submit feedback. Please try again later." },
        { status: 500 }
      );
    }

    console.log("[open-feedback] accepted in", Date.now() - started, "ms");
    return NextResponse.json(
      { ok: true, message: "Thanks — we’ve received your feedback!" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[feedback route] unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler (CORS)
 * Keep as-is if you call from other domains or mobile apps.
 */
export const OPTIONS = async () => {
  return NextResponse.json(
    {},
    {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
};
