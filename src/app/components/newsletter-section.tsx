// src/app/components/newsletter-section.tsx (or wherever you keep it)
"use client";

import { useState } from "react";
import { Input } from "@/app/components/ui/input";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error"|"duplicate">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Front-end validation for UX
    if (!EMAIL_REGEX.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");

      // Log for debugging during dev
      console.log("[Newsletter] Submitting email:", email);

      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        console.error("[Newsletter] Subscribe failed:", data);
        setStatus("error");
        setMessage(data?.error || "Subscription failed. Please try again.");
        return;
      }

      if (data?.duplicate) {
        setStatus("duplicate");
        setMessage("You're already subscribed.");
      } else {
        setStatus("success");
        setMessage("Thanks for subscribing!");
      }
      setEmail("");
    } catch (err) {
      console.error("[Newsletter] Unexpected error:", err);
      setStatus("error");
      setMessage("Unexpected error. Please try again.");
    }
  };

  return (
    <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        {/* ✅ Text Section */}
        <div className="max-w-xl flex flex-col gap-2 text-center md:text-left">
          <h2 className="text-[24px] font-medium font-dm-sans leading-[33.6px] text-black">
            Be the first to access NSW & QLD suburb insights.
          </h2>
          <p className="text-[16px] font-normal font-dm-sans leading-[22.4px] text-[#7D8C83]">
            Free early access. No spam. Just insights.
          </p>
        </div>

        {/* ✅ Form Section */}
        <form onSubmit={handleSubmit} className="w-full sm:w-auto flex flex-col items-center sm:items-start">
          {/* Input + Button horizontal row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:w-[284px] px-3 py-2 bg-white rounded-[10px] border border-[#DCE0DE] text-[#7D8C83] text-sm font-normal font-dm-sans placeholder:text-[#7D8C83] focus:border-teal-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className={`px-6 py-2 rounded-[10px] bg-gradient-to-r from-[#28C381] to-[#27A4C8] text-white text-m font-medium font-dm-sans leading-[19.6px] transition ${
                status === "loading" ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
              }`}
            >
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </button>
          </div>

          {/* Privacy message */}
          <p className="text-xs text-gray-400 mt-2 text-center sm:text-left w-full">
            We’ll never share your email. Unsubscribe anytime.
          </p>

          {/* Status message */}
          {status !== "idle" && message && (
            <p
              className={`text-sm mt-2 ${
                status === "success" || status === "duplicate"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
