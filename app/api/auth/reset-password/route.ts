import { isRedirectError } from "next/dist/client/components/redirect-error";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { revokeAllApiSessions } from "@/services/api-auth";
import { consumePasswordResetToken } from "@/services/password-reset";
import { prisma } from "@/utils/prisma";
import { resetPasswordSchema } from "@/utils/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const consumed = await consumePasswordResetToken(parsed.data.token);
    if (!consumed.ok) {
      return NextResponse.json({ error: consumed.error }, { status: 400 });
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    const user = await prisma.user.update({
      where: { email: consumed.email },
      // Ends every web session issued before the reset (services/auth-jwt.ts).
      data: { password: hashedPassword, sessionVersion: { increment: 1 } },
      select: { id: true, emailVerified: true },
    });
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
    if (isRedirectError(error)) { throw error; }
    console.error("Caught error:", error);
    return NextResponse.json(
          { error: "Could not reset your password. Please try again." },
          { status: 500 },
        );
    }
}
