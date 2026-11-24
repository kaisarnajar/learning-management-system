import { NextRequest, NextResponse } from "next/server";
import { issueApiSession } from "@/services/api-auth";
import { authenticateCredentials } from "@/services/credentials";
import { resolveUserRole } from "@/services/teacher-auth";
import { getClientIp, RATE_LIMIT_MESSAGE } from "@/services/rate-limit";
import { apiError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }
    const result = await authenticateCredentials(email, password, getClientIp(request.headers));
    if (!result.ok) {
      switch (result.reason) {
        case "RATE_LIMITED":
          return NextResponse.json(
            { success: false, error: RATE_LIMIT_MESSAGE },
            { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
          );
        case "EMAIL_NOT_VERIFIED":
          return NextResponse.json(
            {
              success: false,
              code: "email_not_verified",
              error: "Please verify your email address before signing in. Check your inbox for the verification link.",
            },
            { status: 403 }
          );
        case "INVALID":
          return NextResponse.json(
            { success: false, error: "Invalid email or password." },
            { status: 401 }
          );
      }
    }
    const { user } = result;

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
        emailVerified: user.emailVerified.toISOString(),
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
