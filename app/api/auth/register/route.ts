import { isRedirectError } from "next/dist/client/components/redirect-error";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { buildVerificationUrl, generateVerificationToken } from "@/services/tokens";
import { registerSchema } from "@/utils/validations";
import { sendVerificationEmail } from "@/services/email";
import { CURRENT_POLICIES_VERSION } from "@/config/constants";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(RATE_LIMITS.REGISTER_IP, getClientIp(request.headers));
  if (limited) return limited;

  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration details." },
        { status: 400 },
      );
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        policiesAcceptedAt: new Date(),
        policiesAcceptedVersion: CURRENT_POLICIES_VERSION,
      },
    });

    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail({ to: email, verificationUrl: buildVerificationUrl(verificationToken.token) });

    return NextResponse.json({ success: true, role: "USER" });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Caught error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }
}
