import { NextRequest, NextResponse } from "next/server";
import { rotateApiSession } from "@/services/api-auth";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { apiError, apiServerError } from "@/utils/api-response";

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
      return apiError("refreshToken is required.", 400);
    }

    const tokens = await rotateApiSession(refreshToken);
    if (!tokens) {
      return apiError("Session has ended. Sign in again.", 401);
    }

    return NextResponse.json({ success: true, token: tokens.accessToken, ...tokens });
  } catch (error) {
    return apiServerError("api/v1/auth/refresh", error, "Could not refresh the session.");
  }
}
