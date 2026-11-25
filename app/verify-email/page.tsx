import { redirect } from "next/navigation";
import { prisma } from "@/utils/prisma";
import Link from "next/link";
import { confirmEmailVerification } from "@/app/verify-email/actions";
import { findVerificationToken } from "@/services/tokens";
import { SessionRefresh } from "@/components/auth/SessionRefresh";

type PageProps = {
  searchParams: Promise<{ token?: string; verified?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Invalid verification token.",
  expired: "Verification token has expired.",
  notfound: "Account not found.",
};

/** Errors after which the confirmation form is shown again. */
const FORM_ERRORS: Record<string, string> = {
  password: "That password is not correct.",
  limited: "Too many attempts. Please wait a few minutes and try again.",
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token, verified, error } = await searchParams;

  if (verified === "1") {
    return (
      <>
        {/* Refresh the signed-in session so the verification banner clears without a new login. */}
        <SessionRefresh />
        <VerificationResult success={true} message="Your email has been verified successfully." />
      </>
    );
  }

  const formError = token && error ? FORM_ERRORS[error] : undefined;
  if (error && !formError) {
    return <VerificationResult success={false} message={ERROR_MESSAGES[error] ?? ERROR_MESSAGES.invalid} />;
  }

  if (!token) {
    redirect("/login");
  }

  // Read-only: opening the link (or a mail scanner prefetching it) must not
  // verify the address; the button below posts to a server action instead.
  const existingToken = await findVerificationToken(token);

  if (!existingToken) {
    return <VerificationResult success={false} message={ERROR_MESSAGES.invalid} />;
  }

  if (new Date() > existingToken.expires) {
    return <VerificationResult success={false} message={ERROR_MESSAGES.expired} />;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: existingToken.identifier },
    select: { email: true, password: true },
  });
  const needsPassword = Boolean(existingUser?.password);

  if (!existingUser) {
    return <VerificationResult success={false} message={ERROR_MESSAGES.notfound} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Confirm your email</h1>
        <p className="mt-2 text-muted">
          Confirm that <span className="font-medium text-foreground">{existingUser.email}</span> is your email address.
        </p>
        <form action={confirmEmailVerification} className="mt-6 space-y-4 text-left">
          <input type="hidden" name="token" value={token} />
          {needsPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Your account password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          {formError && (
            <p role="alert" className="text-sm text-destructive-text">
              {formError}
            </p>
          )}
          <div className="text-center">
          <button
            type="submit"
            className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Confirm email
          </button>
          </div>
        </form>
        {needsPassword && (
          <p className="mt-6 text-sm text-muted">
            Didn&apos;t create this account, or forgot the password?{" "}
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Reset the password
            </Link>{" "}
            instead; that also confirms your email.
          </p>
        )}
      </div>
    </div>
  );
}

function VerificationResult({ success, message }: { success: boolean; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-sm text-center">
        {success ? (
          <svg className="mx-auto h-16 w-16 text-success-text" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        ) : (
          <svg className="mx-auto h-16 w-16 text-destructive-text" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
          </svg>
        )}
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {success ? "Email Verified" : "Verification Failed"}
        </h1>
        <p className="mt-2 text-muted">{message}</p>
        <div className="mt-6">
          <Link
            href={success ? "/profile" : "/login"}
            className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            {success ? "Go to Dashboard" : "Back to Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
