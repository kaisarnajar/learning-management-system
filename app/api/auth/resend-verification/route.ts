import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { buildVerificationUrl, generateVerificationToken } from "@/services/tokens";
import { sendVerificationEmail } from "@/services/email";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { apiError, apiServerError } from "@/utils/api-response";

/**
 * Resends the verification email. Signed-in users resend for their own
 * address; a signed-out caller (an unverified account can no longer sign in
 * with a password) may pass { email } and always gets the same generic
 * answer, so the endpoint reveals nothing about which addresses exist.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    let email = session?.user?.email?.toLowerCase().trim() ?? "";
    const anonymous = !email;

    if (anonymous) {
      const body = await request.json().catch(() => null);
      email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
      if (!email) {
        return apiError("Email is required.", 400);
      }
      const limitedByIp = await enforceRateLimit(RATE_LIMITS.RESEND_VERIFICATION_IP, getClientIp(request.headers));
      if (limitedByIp) return limitedByIp;
    } else if (session?.user?.emailVerified) {
      return apiError("Email is already verified", 400);
    }

    const limited = await enforceRateLimit(RATE_LIMITS.RESEND_VERIFICATION, email);
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true, deletedAt: true, password: true },
    });

    if (!user || user.deletedAt || user.emailVerified || !user.password) {
      // Signed-out callers get the generic answer; signed-in ones the real one.
      if (anonymous) return NextResponse.json({ success: true });
      return apiError("Email is already verified", 400);
    }

    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail({
      to: email,
      verificationUrl: buildVerificationUrl(verificationToken.token),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiServerError("api/auth/resend-verification", error, "Failed to send email. Please try again.");
  }
}
