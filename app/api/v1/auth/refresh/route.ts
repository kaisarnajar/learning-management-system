import { NextRequest, NextResponse } from "next/server";
import { rotateApiSession } from "@/services/api-auth";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";

/**
 * POST { refreshToken } -> a new access token and a new refresh token. The
 * presented refresh token is revoked by the exchange.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.LOGIN_IP, getClientIp(request.headers), {
    success: false,
    error: "Too many attempts. Please wait a few minutes and try again.",
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: "refreshToken is required." }, { status: 400 });
    }

    const tokens = await rotateApiSession(refreshToken);
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: "Session has ended. Sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, token: tokens.accessToken, ...tokens });
  } catch (error) {
    console.error("[api/v1/auth/refresh] Error:", error);
    return NextResponse.json({ success: false, error: "Could not refresh the session." }, { status: 500 });
  }
}
