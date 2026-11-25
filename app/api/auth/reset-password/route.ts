import { unstable_rethrow } from "next/navigation";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { revokeAllApiSessions } from "@/services/api-auth";
import { consumePasswordResetToken } from "@/services/password-reset";
import { prisma } from "@/utils/prisma";
import { resetPasswordSchema } from "@/utils/validations";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";
import { forgetRecentClaims } from "@/services/auth-jwt";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const consumed = await consumePasswordResetToken(parsed.data.token);
    if (!consumed.ok) {
      return apiError(consumed.error, 400);
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    const user = await prisma.user.update({
      where: { email: consumed.email },
      // Ends every web session issued before the reset (services/auth-jwt.ts).
      data: { password: hashedPassword, sessionVersion: { increment: 1 } },
      select: { id: true, emailVerified: true },
    });
    forgetRecentClaims(user.id);
    // The reset link was delivered to the mailbox, which proves ownership as
    // well as the verification link does; without this an unverified account
    // could reset its password and still not sign in.
    if (!user.emailVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    }
    // A reset follows a lost or compromised password: end every mobile session too.
    await revokeAllApiSessions(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    unstable_rethrow(error);
    return apiServerError("api/auth/reset-password", error, "Could not reset your password. Please try again.");
    }
}
