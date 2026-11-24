import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/utils/validations";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { registerWithPassword, REGISTRATION_MESSAGE } from "@/services/account-registration";

/**
 * Creates an unverified account and e-mails a verification link. The answer
 * is the same when the address already has an account (its owner is told by
 * e-mail instead), so it carries no session: the app asks the user to verify
 * the address and then sign in with POST /auth/login.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.REGISTER_IP, getClientIp(request.headers), {
    success: false,
    error: "Too many registrations from this network. Please try again later.",
  });
  if (limited) return limited;

  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid registration details." },
        { status: 400 }
      );
    }

    await registerWithPassword(parsed.data);

    return NextResponse.json({ success: true, verificationRequired: true, message: REGISTRATION_MESSAGE });
  } catch (error) {
    console.error("[api/v1/auth/register] Error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
