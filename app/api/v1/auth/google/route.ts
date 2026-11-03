import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/utils/prisma";
import { issueApiSession } from "@/services/api-auth";
import { resolveUserRole } from "@/services/teacher-auth";
import { CURRENT_POLICIES_VERSION } from "@/config/constants";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/services/rate-limit";

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

const userSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  registrationNumber: true,
  emailVerified: true,
  password: true,
  deletedAt: true,
} as const;

/**
 * Verifies a Google ID token issued to THIS application.
 * Returns null when the token is invalid, issued for another OAuth client,
 * from a non-Google issuer, or carries an unverified email address.
 */
async function verifyGoogleIdToken(idToken: string) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) return { configured: false as const };

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload) return { configured: true as const, payload: null };
    if (!payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) return { configured: true as const, payload: null };
    if (payload.aud !== clientId) return { configured: true as const, payload: null };
    if (payload.email_verified !== true || !payload.email) return { configured: true as const, payload: null };
    return { configured: true as const, payload };
  } catch {
    return { configured: true as const, payload: null };
  }
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(RATE_LIMITS.GOOGLE_IP, getClientIp(request.headers), {
    success: false,
    error: "Too many attempts. Please wait a few minutes and try again.",
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : (typeof body.token === "string" ? body.token : "");

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Google ID token is required." },
        { status: 400 }
      );
    }

    const verification = await verifyGoogleIdToken(idToken);
    if (!verification.configured) {
      return NextResponse.json(
        { success: false, error: "Google sign-in is not configured." },
        { status: 503 }
      );
    }
    if (!verification.payload) {
      return NextResponse.json(
        { success: false, error: "Invalid Google ID token." },
        { status: 401 }
      );
    }

    const payload = verification.payload;
    const email = payload.email!.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      select: userSelect,
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: payload.name || email.split("@")[0],
          image: payload.picture || null,
          emailVerified: new Date(),
          policiesAcceptedAt: new Date(),
          policiesAcceptedVersion: CURRENT_POLICIES_VERSION,
        },
        select: userSelect,
      });
    } else if (user.deletedAt) {
      return NextResponse.json(
        { success: false, error: "This account is no longer available." },
        { status: 403 }
      );
    } else if (!user.emailVerified) {
      // Google has verified ownership of this address. A password set on the
      // unverified row (possibly by someone else) must not survive, same as
      // the web sign-in flow.
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date(), password: null },
        select: userSelect,
      });
    }

    const role = await resolveUserRole(user.email);
    const tokens = await issueApiSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    return NextResponse.json({
      success: true,
      // `token` is the legacy name for the access token; kept for one release.
      token: tokens.accessToken,
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        registrationNumber: user.registrationNumber,
        emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
        role,
      },
    });
  } catch (error) {
    console.error("[api/v1/auth/google] Error:", error);
    return NextResponse.json(
      { success: false, error: "Google authentication failed." },
      { status: 500 }
    );
  }
}
