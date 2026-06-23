"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { trackButtonClick } from "@/lib/analytics-client";
import { authContinueUrl, getPostLoginPath } from "@/lib/auth-redirect";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registered = searchParams.get("registered") === "1";
  const passwordReset = searchParams.get("reset") === "1";
  const teacherProfileError = searchParams.get("error") === "teacher-profile";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    trackButtonClick("Sign In", "/login");
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
      if (!sessionRes.ok) {
        setError("Signed in, but could not load your session. Please refresh the page.");
        return;
      }

      const sessionData = await sessionRes.json();
      router.push(getPostLoginPath(sessionData?.user?.role, callbackUrl));
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-center font-serif text-2xl font-bold text-primary sm:text-3xl">Sign In</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Students and instructors use the same sign-in. After the academy links your registered email as a
        teacher, you will open the teacher portal when you sign in.
      </p>

      {registered && (
        <p className="mt-4 rounded-xl bg-info-bg px-4 py-3 text-center text-sm text-info-text">
          Account created. Please sign in.
        </p>
      )}

      {passwordReset && (
        <p className="mt-4 rounded-xl bg-success-bg px-4 py-3 text-center text-sm text-success-text">
          Your password was reset. Please sign in with your new password.
        </p>
      )}

      {teacherProfileError && (
        <p className="mt-4 rounded-xl bg-warning-bg px-4 py-3 text-center text-sm text-warning-text">
          Your account is not linked as a teacher yet. Register first if needed, then ask the academy admin to
          add your registered email to the teacher list.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-center text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {googleEnabled && <GoogleSignInButton callbackUrl={authContinueUrl(callbackUrl)} />}

        {googleEnabled && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Link
                href={`/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <SubmitButton isSubmitting={loading}
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in with Email"}
          </SubmitButton>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-primary hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
