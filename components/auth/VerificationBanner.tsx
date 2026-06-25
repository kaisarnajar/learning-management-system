"use client";

import { useState } from "react";

export function VerificationBanner() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleResend = async () => {
    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Verification email sent! Please check your Inbox. If you don't see it, check your Spam/Junk folder as well.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to resend verification email.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">Email Verification Required</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Please verify your email address to access all features like enrolling in courses and making purchases.
            </p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || status === "success"}
                className="rounded-md bg-yellow-100 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50 disabled:opacity-50"
              >
                {loading ? "Sending..." : status === "success" ? "Sent" : "Resend Verification Email"}
              </button>
            </div>
            {message && (
              <p className={`mt-2 text-xs font-medium ${status === "success" ? "text-green-700" : "text-red-700"}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
