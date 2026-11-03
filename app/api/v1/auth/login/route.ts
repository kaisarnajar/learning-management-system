import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { issueApiSession } from "@/services/api-auth";
import { resolveUserRole } from "@/services/teacher-auth";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const limited =
      (await enforceRateLimit(RATE_LIMITS.LOGIN, email, { success: false, error: "Too many attempts. Please wait a few minutes and try again." })) ??
      (await enforceRateLimit(RATE_LIMITS.LOGIN_IP, getClientIp(request.headers), { success: false, error: "Too many attempts. Please wait a few minutes and try again." }));
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        image: true,
        registrationNumber: true,
        emailVerified: true,
        deletedAt: true,
      },
    });

    if (!user || !user.password || user.deletedAt) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          code: "email_not_verified",
          error: "Please verify your email address before signing in. Check your inbox for the verification link.",
        },
        { status: 403 }
      );
    }

    const role = await resolveUserRole(user.email);
    const tokens = await issueApiSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    return NextResponse.json({
      success: true,
      // `token` is the legacy name for the access token; kept for one release.
      token: tokens.accessToken,
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        registrationNumber: user.registrationNumber,
        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
        role,
      },
    });
  } catch (error) {
    console.error("[api/v1/auth/login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
