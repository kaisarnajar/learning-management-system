"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Eye, EyeOff } from "lucide-react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

import { authContinueUrl, getPostLoginPath } from "@/lib/auth-redirect";
import { useZodForm } from "@/lib/use-zod-form";
import { z } from "zod";
import { zodResultToFormValidation } from "@/lib/form-validation";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { labelClassName } from "@/lib/form";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registered = searchParams.get("registered") === "1";
  const passwordReset = searchParams.get("reset") === "1";
  const teacherProfileError = searchParams.get("error") === "teacher-profile";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = useCallback((v: LoginFormValues) => zodResultToFormValidation(loginSchema.safeParse(v)), []);

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: { email: "", password: "" },
    fields: ["email", "password"],
    validate,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
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
            <label htmlFor="email" className={labelClassName}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={showError("email") || undefined}
              className={formFieldInputClass(showError("email"))}
            />
            {showError("email") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className={labelClassName}>
                Password
              </label>
              <Link
                href={`/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={values.password}
                onChange={(e) => updateField("password", e.target.value)}
                onBlur={() => markTouched("password")}
                aria-invalid={showError("password") || undefined}
                className={`${formFieldInputClass(showError("password"))} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {showError("password") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <SubmitButton isSubmitting={loading}
            type="submit"
            disabled={loading || !isValid}
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
