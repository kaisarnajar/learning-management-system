import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/services/email";
import { buildPasswordResetUrl, createPasswordResetToken } from "@/services/password-reset";
import { forgotPasswordSchema } from "@/utils/validations";

const GENERIC_SUCCESS =
  "If an account with that email exists and uses a password, we sent reset instructions. Please check your Inbox. If you don't see it, check your Spam/Junk folder as well.";

export async function POST(request: Request) {
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
    const token = await createPasswordResetToken(email);
    let debugLink: string | undefined;

    if (token) {
      const resetUrl = buildPasswordResetUrl(token);
      
      const isEmailConfigured = Boolean(
        process.env.SMTP_HOST && 
        process.env.SMTP_USER && 
        process.env.SMTP_PASS
      );

      if (process.env.NODE_ENV === "development" || !isEmailConfigured) {
        debugLink = resetUrl;
      }

      const emailResult = await sendPasswordResetEmail({ to: email, resetUrl });
      
      if (!emailResult.sent && !emailResult.skipped) {
        console.error("[forgot-password] SMTP send failed:", emailResult.error);
        console.info("[forgot-password] Reset link (use if email did not arrive):", resetUrl);
        if (process.env.NODE_ENV === "development") {
          debugLink = resetUrl;
        }
        return NextResponse.json(
          { error: "Failed to send reset email. Please try again later or contact support." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS, debugLink });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("[forgot-password] Request failed:", error);
    return NextResponse.json(
      { error: "Could not process your request. Please try again later." },
      { status: 500 },
    );
  }
}
