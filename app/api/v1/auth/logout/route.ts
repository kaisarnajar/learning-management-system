import { NextRequest, NextResponse } from "next/server";
import {
  authenticateApiRequest,
  revokeApiSessionById,
  revokeApiSessionByRefreshToken,
} from "@/services/api-auth";

/**
 * POST with a Bearer access token and/or { refreshToken } in the body: ends
 * that API session. Both the access token (through its session id) and the
 * refresh token stop working at once. Always answers 200 so a client can
 * clear its stored tokens regardless of their state.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";
    if (refreshToken) {
      await revokeApiSessionByRefreshToken(refreshToken);
    }

    const { user, sessionId } = await authenticateApiRequest(request);
    if (user && sessionId) {
      await revokeApiSessionById(sessionId, user.id);
    }

    return NextResponse.json({ success: true, message: "Signed out." });
  } catch (error) {
    console.error("[api/v1/auth/logout] Error:", error);
    return NextResponse.json({ success: false, error: "Could not sign out." }, { status: 500 });
  }
}
