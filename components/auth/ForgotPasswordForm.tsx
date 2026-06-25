"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { trackButtonClick } from "@/lib/analytics-client";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setMessage(
        data.message ||
          "If an account with that email exists and uses a password, we sent reset instructions. Please check your Inbox. If you don't see it, check your Spam/Junk folder as well.",
      );
      setEmail("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-center font-serif text-2xl font-bold text-primary sm:text-3xl">
        Reset password
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        Enter your account email. We will send a link to set a new password. Google sign-in accounts
        should continue using Google.
      </p>

      {message && (
        <p className="mt-4 rounded-md bg-success-bg px-4 py-3 text-center text-sm text-success-text">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-center text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          trackButtonClick("Send Reset Link", "/forgot-password");
          handleSubmit(e);
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <SubmitButton isSubmitting={loading}
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
