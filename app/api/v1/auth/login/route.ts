import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { issueApiSession } from "@/services/api-auth";
import { verifyPassword } from "@/services/password";
import { LOGIN_PASSWORD_MAX_LENGTH } from "@/utils/validations";
import { resolveUserRole } from "@/services/teacher-auth";
import { getClientIp, RATE_LIMIT_MESSAGE, recordFailedSignIn, signInAllowed } from "@/services/rate-limit";

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
    // No password was ever allowed this long, so it cannot match.
    if (password.length > LOGIN_PASSWORD_MAX_LENGTH) {
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    // Only failed attempts count against the address, and only from the
    // network they came from, so nobody can lock someone else out.
    const ip = getClientIp(request.headers);
    const allowed = await signInAllowed(email, ip);
    if (!allowed.ok) {
      return NextResponse.json(
        { success: false, error: RATE_LIMIT_MESSAGE },
        { status: 429, headers: { "Retry-After": String(allowed.retryAfterSeconds) } },
      );
    }

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

    // An unknown or password-less account costs the same bcrypt work as a
    // wrong password, so the timing does not reveal which addresses exist.
    const validPassword = await verifyPassword(password, user?.deletedAt ? null : user?.password);
    if (!user || !validPassword) {
      await recordFailedSignIn(email, ip);
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
