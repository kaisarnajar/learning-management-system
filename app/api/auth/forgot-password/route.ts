import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/services/email";
import { buildPasswordResetUrl, createPasswordResetToken } from "@/services/password-reset";
import { forgotPasswordSchema } from "@/utils/validations";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";

const GENERIC_SUCCESS =
  "If an account with that email exists and uses a password, we sent reset instructions. Please check your Inbox. If you don't see it, check your Spam/Junk folder as well.";

export async function POST(request: Request) {
  const limitedByIp = await enforceRateLimit(RATE_LIMITS.FORGOT_PASSWORD_IP, getClientIp(request.headers));
  if (limitedByIp) return limitedByIp;

  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const limitedByEmail = await enforceRateLimit(RATE_LIMITS.FORGOT_PASSWORD_EMAIL, email);
    if (limitedByEmail) return limitedByEmail;

    const isProduction = process.env.NODE_ENV === "production";
    const isEmailConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    // In production a reset link must only ever travel by email. Fail closed
    // before creating a token so nothing is leaked when SMTP is misconfigured.
    if (isProduction && !isEmailConfigured) {
      console.error("[forgot-password] SMTP is not configured; refusing to issue reset tokens.");
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable. Please contact support." },
        { status: 503 },
      );
    }

    const token = await createPasswordResetToken(email);
    let debugLink: string | undefined;

    if (token) {
      const resetUrl = buildPasswordResetUrl(token);

      // Development convenience only: the link is never included in a production response.
      if (!isProduction) {
        debugLink = resetUrl;
      }

      const emailResult = await sendPasswordResetEmail({ to: email, resetUrl });

      if (!emailResult.sent && !emailResult.skipped) {
        // Log, but respond identically to the unknown-email case so the
        // response does not reveal whether an account exists.
        console.error("[forgot-password] SMTP send failed:", emailResult.error);
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS, ...(debugLink ? { debugLink } : {}) });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("[forgot-password] Request failed:", error);
    return NextResponse.json(
      { error: "Could not process your request. Please try again later." },
      { status: 500 },
    );
  }
}
