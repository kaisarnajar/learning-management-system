import { isRedirectError } from "next/dist/client/components/redirect-error";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";

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

    await prisma.user.update({
      where: { email: consumed.email },
      data: { password: hashedPassword },
    });

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
