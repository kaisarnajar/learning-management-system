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

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = useCallback((v: RegisterFormValues) => zodResultToFormValidation(registerSchema.safeParse(v)), []);

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: { name: "", email: "", password: "" },
    fields: ["name", "email", "password"],
    validate,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;
    setError("");
    setLoading(true);



    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, email: values.email, password: values.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl,
      });

      if (signInResult?.error) {
        router.push(`/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
      const sessionData = await sessionRes.json();
      router.push(getPostLoginPath(sessionData?.user?.role, callbackUrl));
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-center font-serif text-2xl font-bold text-primary sm:text-3xl">Create Account</h1>
      <p className="mt-2 text-center text-sm text-muted">
        Register to enroll in courses. If the academy adds you as a teacher later, sign in with this same email
        to access the teacher portal.
      </p>

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
            <label htmlFor="name" className={labelClassName}>
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={showError("name") || undefined}
              className={formFieldInputClass(showError("name"))}
            />
            {showError("name") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.name}
              </p>
            )}
          </div>

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
            <label htmlFor="password" className={labelClassName}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
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
            {showError("password") ? (
              <p className={formErrorTextClassName} role="alert">
                {errors.password}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">At least 8 characters</p>
            )}
          </div>

          <SubmitButton isSubmitting={loading}
            type="submit"
            disabled={loading || !isValid}
            className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Register with Email"}
          </SubmitButton>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
