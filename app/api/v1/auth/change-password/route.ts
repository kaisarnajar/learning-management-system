import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { requireStudentApiAuth } from "@/services/api-auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { prisma } from "@/utils/prisma";
import { changePasswordSchema } from "@/utils/validations";
import { apiError, apiServerError, readJson } from "@/utils/api-response";
import { forgetRecentClaims } from "@/services/auth-jwt";

/**
 * Changes the caller's password: `{ currentPassword, newPassword }`. Every
 * other app session and every website session of the account is signed out;
 * this one stays signed in. The account's push registrations are removed
 * except `deviceToken`, the calling device's own, when it is sent.
 * Accounts that only use Google have no password to change.
 */
export async function POST(request: NextRequest) {
  const { user, sessionId, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  // Its own bucket, keyed on the account: guessing the current password here
  // must not use up the owner's sign-in attempts, nor theirs this.
  const limited = await enforceRateLimit(RATE_LIMITS.CHANGE_PASSWORD, user.id, {
    success: false,
    error: "Too many attempts. Please wait a few minutes and try again.",
  });
  if (limited) return limited;

  try {
    const parsed = changePasswordSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid request.", 400);

    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
    if (!account?.password) {
      return apiError("This account signs in with Google and has no password. Use \"Forgot password\" to create one.", 400);
    }
    if (!(await compare(parsed.data.currentPassword, account.password))) {
      return apiError("The current password is not correct.", 403);
    }

    const now = new Date();
    await prisma.$transaction([
      // sessionVersion ends every web session (services/auth-jwt.ts).
      prisma.user.update({
        where: { id: user.id },
        data: { password: await hash(parsed.data.newPassword, 12), sessionVersion: { increment: 1 } },
      }),
      prisma.apiRefreshToken.updateMany({
        where: { userId: user.id, revokedAt: null, id: { not: sessionId } },
        data: { revokedAt: now },
      }),
      prisma.passwordResetToken.deleteMany({ where: { email: user.email } }),
      prisma.deviceToken.deleteMany({
        where: { userId: user.id, ...(parsed.data.deviceToken ? { token: { not: parsed.data.deviceToken } } : {}) },
      }),
    ]);
    forgetRecentClaims(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiServerError("api/v1/auth/change-password", error, "Failed to change the password.");
  }
}
