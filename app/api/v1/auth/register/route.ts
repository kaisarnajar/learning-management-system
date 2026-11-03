import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { generateApiToken } from "@/services/api-auth";
import { buildVerificationUrl, generateVerificationToken } from "@/services/tokens";
import { registerSchema } from "@/utils/validations";
import { sendVerificationEmail } from "@/services/email";
import { CURRENT_POLICIES_VERSION } from "@/config/constants";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.REGISTER_IP, getClientIp(request.headers), {
    success: false,
    error: "Too many registrations from this network. Please try again later.",
  });
  if (limited) return limited;

  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid registration details." },
        { status: 400 }
      );
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        policiesAcceptedAt: new Date(),
        policiesAcceptedVersion: CURRENT_POLICIES_VERSION,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        registrationNumber: true,
        emailVerified: true,
      },
    });

    // Verification Email
    try {
      const verificationToken = await generateVerificationToken(email);
      await sendVerificationEmail({ to: email, verificationUrl: buildVerificationUrl(verificationToken.token) });
    } catch (emailErr) {
      console.error("[api/v1/auth/register] Failed to send verification email:", emailErr);
    }

    const token = await generateApiToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "USER",
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        registrationNumber: user.registrationNumber,
        emailVerified: null,
        role: "USER",
      },
    });
  } catch (error) {
    console.error("[api/v1/auth/register] Error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
