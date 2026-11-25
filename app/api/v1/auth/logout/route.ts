import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import {
  authenticateApiRequest,
  revokeApiSessionById,
  revokeApiSessionByRefreshToken,
} from "@/services/api-auth";
import { apiServerError } from "@/utils/api-response";

/**
 * POST with a Bearer access token and/or { refreshToken } in the body: ends
 * that API session. Both the access token (through its session id) and the
 * refresh token stop working at once. With { deviceToken }, that device's
 * push registration is removed too, so a shared phone stops receiving this
 * account's notifications. Always answers 200 so a client can clear its
 * stored tokens regardless of their state.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";
    const deviceToken = typeof body?.deviceToken === "string" ? body.deviceToken.trim() : "";
    const owners = new Set<string>();

    if (refreshToken) {
      const owner = await revokeApiSessionByRefreshToken(refreshToken);
      if (owner) owners.add(owner);
    }

    const { user, sessionId } = await authenticateApiRequest(request);
    if (user && sessionId) {
      await revokeApiSessionById(sessionId, user.id);
      owners.add(user.id);
    }

    // Only the signing-out account's own registration of the device is removed.
    if (deviceToken && owners.size > 0) {
      await prisma.deviceToken.deleteMany({ where: { token: deviceToken, userId: { in: [...owners] } } });
    }

    return NextResponse.json({ success: true, message: "Signed out." });
  } catch (error) {
    return apiServerError("api/v1/auth/logout", error, "Could not sign out.");
  }
}
