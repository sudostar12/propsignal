"use client";

import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea"; // create if you don't have one
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog"; // shadcn dialog

const categories = [
  { value: "bug", label: "Bug / Issue" },
  { value: "idea", label: "Feature Idea" },
  { value: "content", label: "Content/Text" },
  { value: "data-accuracy", label: "Data Accuracy" },
  { value: "other", label: "Other" },
];

export function FeedbackDialog({ triggerClassName = "" }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [contactOk, setContactOk] = useState(false);
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [msg, setMsg] = useState("");
  const [emailError, setEmailError] = useState<string>("");

  const minChars = 20;

  const submit = async () => {
  // 1) Message length first
  if (message.trim().length < minChars) {
    setStatus("error");
    setMsg(`Please add at least ${minChars} characters so we can act on it.`);
    return;
  }

  // 2) If consent is checked, email is required + valid
  if (contactOk && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    setStatus("error");
    setEmailError("Please enter a valid email to allow us to contact you.");
    setMsg(""); // clear generic msg
    return;
  }
  setEmailError("");

  try {
    setStatus("loading");
    setMsg("");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        message,
        email: email || undefined,
        contactOk,
        pagePath: window.location.pathname,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      setStatus("error");
      setMsg(data?.error || "Failed to submit. Please try again.");
      return;
    }
    setStatus("success");
    setMsg(data?.message || "Thanks — we’ve received your feedback!");
    setMessage("");
    setEmail("");
    setContactOk(false);
    setTimeout(() => {
      setOpen(false);
      setEmailError("");
      setMsg("");
      setStatus("idle");
    }, 3000);
  } catch (e) {
    console.error("[feedback-ui] submit error:", e);
    setStatus("error");
    setMsg("Unexpected error. Please try again.");
  }
};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`px-3 py-2 rounded-[8px] border border-[#1E9464] text-[#1E9464] text-sm font-medium bg-white hover:bg-teal-50 transition-colors ${triggerClassName}`}
        >
          Submit your feedback
        </Button>
      </DialogTrigger>
      <DialogContent
  className="sm:max-w-md bg-white shadow-[0_20px_60px_-15px_rgba(16,185,129,0.25)]
  border border-gray-200 rounded-xl backdrop-blur-sm p-6">


        <DialogHeader className="space-y-2">
  <div className="h-1 w-16 bg-gradient-to-r from-[#28C381] to-[#27A4C8] rounded-full" />
  <DialogTitle className="text-xl text-gray-900 flex items-center gap-2">
    We’re listening... <span className="text-base"></span>
  </DialogTitle>
</DialogHeader>


        {/* Category */}
        <label className="text-sm text-gray-600 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm
           border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100
           transition-shadow"

        >
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {/* Message */}
        <label className="text-sm text-gray-600 mt-3 mb-1">
          What’s the feedback? <span className="text-gray-400">(min {minChars} chars)</span>
        </label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please include what you tried, what you expected, and what would make it better."
          className="w-full border rounded-md px-3 py-2 text-sm
           border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100
           transition-shadow placeholder:text-gray-400 placeholder:font-normal"
          maxLength={500}
        />
<div className="text-xs text-gray-400 mt-1">
  {message.trim().length}/500 characters
</div>


        {/* Email (optional) */}
        <label className="text-sm text-gray-600 mt-3 mb-1 flex items-center gap-2">
  Email {contactOk && <span className="text-teal-600 font-medium">(required)</span>}
</label>
<Input
  type="email"
  required={contactOk}
  aria-invalid={!!emailError}
  aria-describedby="feedback-email-error"
  placeholder="If you’d like a reply"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(""); // clear inline error while typing
  }}
  className={`w-full border rounded-md px-3 py-2 text-sm
              focus:ring-2 focus:ring-teal-100 focus:border-teal-500 transition-shadow placeholder:text-gray-400 placeholder:font-normal
              ${emailError ? "border-red-500 focus:border-red-500 ring-1 ring-red-200" : "border-gray-300"}`}
/>

{emailError && (
  <p id="feedback-email-error" className="text-xs text-red-600 mt-1">
    {emailError}
  </p>
)}


        {/* Consent */}
        <label className="flex items-center gap-2 mt-2 text-sm">
          <input
            type="checkbox"
            checked={contactOk}
            onChange={(e) => setContactOk(e.target.checked)}
          />
          It’s okay to contact me about this feedback.
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-800">
  Cancel
</Button>

          <Button
  onClick={submit}
  disabled={status === "loading"}
  className={`bg-gradient-to-r from-[#28C381] to-[#27A4C8] text-white px-5
              ${status === "loading" ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"}
              rounded-md`}
>
  {status === "loading" ? "Submitting..." : "Submit"}
</Button>

        </div>

        {/* Status message */}
        {status !== "idle" && (
          <p className={`text-sm mt-2 ${status === "success" ? "text-teal-600" : "text-red-600"}`}>
            {msg}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
