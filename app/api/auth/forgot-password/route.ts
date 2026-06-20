import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { buildPasswordResetUrl, createPasswordResetToken } from "@/lib/password-reset";
import { forgotPasswordSchema } from "@/lib/validations";

const GENERIC_SUCCESS =
  "If an account with that email exists and uses a password, we sent reset instructions.";

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

    if (token) {
      const resetUrl = buildPasswordResetUrl(token);
      try {
        await sendPasswordResetEmail({ to: email, resetUrl });
      } catch (emailError) {
        if (emailError && typeof emailError === "object" && "digest" in emailError && typeof emailError.digest === "string" && emailError.digest.startsWith("NEXT_REDIRECT")) { throw emailError; }
        console.error("[forgot-password] SMTP send failed:", emailError);
        console.info("[forgot-password] Reset link (use if email did not arrive):", resetUrl);
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("[forgot-password] Request failed:", error);
    return NextResponse.json(
      { error: "Could not process your request. Please try again later." },
      { status: 500 },
    );
  }
}
