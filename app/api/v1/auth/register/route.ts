import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/utils/validations";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";
import { issueApiSession } from "@/services/api-auth";
import { registerWithPassword } from "@/services/account-registration";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";

/**
 * Creates an unverified account, e-mails a verification link and signs the
 * app in straight away, as every installed app version expects.
 *
 * Unlike the website's registration, this answer does reveal a taken address
 * (400 "already exists"; the owner is also told by e-mail). That is accepted
 * for this endpoint (review L3) to keep installed apps working: it is
 * rate-limited per network, and the session it issues is USER-only until the
 * address is verified.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.REGISTER_IP, getClientIp(request.headers), {
    success: false,
    error: "Too many registrations from this network. Please try again later.",
  });
  if (limited) return limited;

  try {
    const body = await readJson(request);
    if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid registration details.", 400);
    }

    const result = await registerWithPassword(parsed.data);
    if (!result.created) {
      return apiError("An account with this email already exists.", 400);
    }
    const { user } = result;

    // Always a USER session: a staff role (from ADMIN_EMAIL, DEVELOPER_EMAIL or
    // a Teacher row with this address) is granted only after the address is
    // verified; see apiRoleFor in services/api-auth.ts.
    const tokens = await issueApiSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: "USER",
    });

    return NextResponse.json({
      success: true,
      verificationRequired: true,
      // `token` is the legacy name for the access token; kept for one release.
      token: tokens.accessToken,
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        registrationNumber: user.registrationNumber,
        emailVerified: null,
        role: "USER",
      },
    });
  } catch (error) {
    return apiServerError("api/v1/auth/register", error, "Registration failed. Please try again.");
  }
}
