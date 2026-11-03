import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { buildVerificationUrl, generateVerificationToken } from "@/services/tokens";
import { sendVerificationEmail } from "@/services/email";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (session.user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    const limited = await enforceRateLimit(RATE_LIMITS.RESEND_VERIFICATION, session.user.email);
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    const verificationToken = await generateVerificationToken(session.user.email);
    await sendVerificationEmail({
      to: session.user.email,
      verificationUrl: buildVerificationUrl(verificationToken.token),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }
}
