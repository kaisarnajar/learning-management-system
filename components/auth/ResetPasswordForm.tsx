import { SubmitButton } from "@/components/shared/SubmitButton";
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { trackButtonClick } from "@/lib/analytics-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="font-serif text-2xl font-bold text-primary sm:text-3xl">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">
          This password reset link is missing or invalid. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block font-medium text-primary hover:underline"
        >
          Request reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not reset your password.");
        return;
      }

      router.push("/login?reset=1");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-center font-serif text-2xl font-bold text-primary sm:text-3xl">
        Choose new password
      </h1>
      <p className="mt-2 text-center text-sm text-muted">Enter a new password for your account.</p>

      {error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-center text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          trackButtonClick("Reset Password", "/reset-password");
          handleSubmit(e);
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <SubmitButton isSubmitting={loading}
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
        >
          {loading ? "Saving…" : "Reset password"}
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
