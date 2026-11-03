import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { decode, encode } from "next-auth/jwt";
import { prisma } from "@/utils/prisma";
import { resolveUserRole } from "@/services/teacher-auth";
import { getAuthSecret } from "@/services/auth-secret";

/**
 * Token issuer for the mobile API (/api/v1).
 *
 * An API session is a row in ApiRefreshToken. The client holds:
 *  - an access token: a short-lived JWT (ACCESS_TOKEN_TTL_SECONDS) signed with
 *    its own salt, so a browser session cookie can never be replayed as a
 *    Bearer token and vice versa. It carries `sid`, the session row id, and
 *    every request checks that row is still live, so logout takes effect
 *    immediately rather than at expiry;
 *  - a refresh token: a random secret whose SHA-256 hash is stored. Each use
 *    rotates it (old row revoked, new row issued); a revoked or expired
 *    refresh token is refused.
 */

const AUTH_SECRET = getAuthSecret();
const ACCESS_TOKEN_SALT = "api-access";
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface ApiUserPayload {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  registrationNumber?: string | null;
}

export type ApiSessionTokens = {
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: string;
};

type ApiIdentity = { id: string; email: string; name?: string | null; role: string };

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function signAccessToken(identity: ApiIdentity, sessionId: string): Promise<string> {
  return encode({
    token: { id: identity.id, email: identity.email, name: identity.name, role: identity.role, sid: sessionId },
    secret: AUTH_SECRET,
    salt: ACCESS_TOKEN_SALT,
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
}

async function createSessionRow(userId: string): Promise<{ id: string; refreshToken: string; expiresAt: Date }> {
  const refreshToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const row = await prisma.apiRefreshToken.create({
    data: { userId, tokenHash: hashRefreshToken(refreshToken), expiresAt },
    select: { id: true },
  });
  return { id: row.id, refreshToken, expiresAt };
}

/** Starts a new API session for a user who has just authenticated. */
export async function issueApiSession(identity: ApiIdentity): Promise<ApiSessionTokens> {
  const session = await createSessionRow(identity.id);
  return {
    accessToken: await signAccessToken(identity, session.id),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * Exchanges a refresh token for a new pair. The presented token is revoked
 * whether or not the exchange succeeds for any other reason, so a stolen
 * token can be used at most once.
 */
export async function rotateApiSession(refreshToken: string): Promise<ApiSessionTokens | null> {
  const current = await prisma.apiRefreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: { user: { select: { id: true, email: true, name: true, deletedAt: true } } },
  });
  if (!current || current.revokedAt || current.expiresAt <= new Date()) return null;

  const revoked = await prisma.apiRefreshToken.updateMany({
    where: { id: current.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  // Lost the race against a concurrent use of the same token: treat as reuse.
  if (revoked.count === 0) return null;

  if (current.user.deletedAt) return null;

  const role = await resolveUserRole(current.user.email);
  return issueApiSession({ id: current.user.id, email: current.user.email, name: current.user.name, role });
}

/** Revokes one session by its refresh token (logout). Unknown tokens are ignored. */
export async function revokeApiSessionByRefreshToken(refreshToken: string): Promise<void> {
  await prisma.apiRefreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes one session by id (the `sid` of an access token). */
export async function revokeApiSessionById(sessionId: string, userId: string): Promise<void> {
  await prisma.apiRefreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes every API session of a user (password change, account deletion). */
export async function revokeAllApiSessions(userId: string): Promise<void> {
  await prisma.apiRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

type AuthenticatedRequest = { user: ApiUserPayload; sessionId: string };

/**
 * Verifies the Bearer access token and that its session is still live.
 * Deliberately no cookie fallback: the mobile API is Bearer-only so a
 * browser session cookie can never be used for cross-site requests here.
 */
export async function authenticateApiRequest(
  req: NextRequest,
): Promise<{ user: ApiUserPayload | null; sessionId?: string; error?: string }> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { user: null, error: "Unauthorized: Invalid or missing token" };
    }
    const tokenString = authHeader.substring(7).trim();
    if (!tokenString) return { user: null, error: "Unauthorized: Invalid or missing token" };

    type AccessClaims = { id?: unknown; sid?: unknown };
    const decoded: AccessClaims | null = await decode({ token: tokenString, secret: AUTH_SECRET, salt: ACCESS_TOKEN_SALT })
      .then((claims) => (claims as AccessClaims | null))
      .catch(() => null);
    if (!decoded || typeof decoded.id !== "string" || typeof decoded.sid !== "string") {
      return { user: null, error: "Unauthorized: Invalid or missing token" };
    }
    const payload = { id: decoded.id, sid: decoded.sid };

    const session = await prisma.apiRefreshToken.findUnique({
      where: { id: payload.sid },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (!session || session.userId !== payload.id || session.revokedAt || session.expiresAt <= new Date()) {
      return { user: null, error: "Unauthorized: Session has ended. Sign in again." };
    }

    const dbUser = await prisma.user.findFirst({
      where: { id: payload.id, deletedAt: null },
      select: { id: true, email: true, name: true, registrationNumber: true },
    });
    if (!dbUser) {
      return { user: null, error: "User account not found" };
    }

    const role = await resolveUserRole(dbUser.email);
    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        registrationNumber: dbUser.registrationNumber,
        role,
      },
      sessionId: payload.sid,
    };
  } catch (err) {
    console.error("[api-auth] Authentication error:", err);
    return { user: null, error: "Internal authentication error" };
  }
}

/**
 * Helper to require student authentication for API endpoints.
 */
export async function requireStudentApiAuth(req: NextRequest): Promise<
  | ({ errorResponse: null } & AuthenticatedRequest)
  | { user: null; sessionId?: undefined; errorResponse: NextResponse }
> {
  const { user, sessionId, error } = await authenticateApiRequest(req);

  if (!user || !sessionId) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: error || "Unauthorized access" },
        { status: 401 }
      ),
    };
  }

  return { user, sessionId, errorResponse: null };
}
