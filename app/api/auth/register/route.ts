import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { registerSchema } from "@/utils/validations";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { registerWithPassword, REGISTRATION_MESSAGE } from "@/services/account-registration";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";

/**
 * Answers the same for a new address and one that already has an account
 * (whose owner is told by e-mail), so the form cannot be used to find out who
 * has an account. The form then tries to sign in with the details entered.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(RATE_LIMITS.REGISTER_IP, getClientIp(request.headers));
  if (limited) return limited;

  try {
    const body = await readJson(request);
    if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid registration details.", 400);
    }

    await registerWithPassword(parsed.data);

    return NextResponse.json({ success: true, role: "USER", message: REGISTRATION_MESSAGE });
  } catch (error) {
    unstable_rethrow(error);
    return apiServerError("api/auth/register", error, "Registration failed. Please try again.");
    }
}
