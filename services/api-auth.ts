import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { decode, encode } from "next-auth/jwt";
import { prisma } from "@/utils/prisma";
import { resolveUserRole, type UserRole } from "@/services/teacher-auth";
import { getAuthSecret } from "@/services/auth-secret";
import { apiError } from "@/utils/api-response";

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
 *
 * Every row rotated from one sign-in shares a `familyId`. Presenting a token
 * that was already revoked is a replay: either the client or a thief holds a
 * copy, and the server cannot tell which, so the whole family is revoked and
 * whoever holds the newest token must sign in again.
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
  emailVerified: boolean;
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

/** Revoked rows are kept this long so a replayed refresh token is still recognised as used. */
const REVOKED_ROW_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A revoked token presented this soon after its revocation is a client that
 * refreshed twice at once (two requests sharing one stored token), not a
 * replay: the loser gets 401 but the winner's new pair is left alone.
 */
export const REFRESH_REUSE_GRACE_MS = 10 * 1000;

async function createSessionRow(
  userId: string,
  familyId: string,
): Promise<{ id: string; refreshToken: string; expiresAt: Date }> {
  const refreshToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  // Every refresh rotates the row, so an active app adds one row an hour.
  // Prune this user's expired rows and long-revoked ones as new ones are made.
  await prisma.apiRefreshToken.deleteMany({
    where: {
      userId,
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: new Date(Date.now() - REVOKED_ROW_RETENTION_MS) } }],
    },
  });
  const row = await prisma.apiRefreshToken.create({
    data: { userId, tokenHash: hashRefreshToken(refreshToken), expiresAt, familyId },
    select: { id: true },
  });
  return { id: row.id, refreshToken, expiresAt };
}

/** Starts a new API session (a new token family) for a user who has just authenticated. */
export async function issueApiSession(identity: ApiIdentity): Promise<ApiSessionTokens> {
  return issueInFamily(identity, randomUUID());
}

async function issueInFamily(identity: ApiIdentity, familyId: string): Promise<ApiSessionTokens> {
  const session = await createSessionRow(identity.id, familyId);
  return {
    accessToken: await signAccessToken(identity, session.id),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: session.refreshToken,
    refreshExpiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * Exchanges a refresh token for a new pair in the same family. The presented
 * token is revoked whether or not the exchange succeeds for any other reason,
 * so a stolen token can be used at most once, and presenting it again after
 * that revokes every token rotated from it (see `revokeReusedFamily`).
 */
export async function rotateApiSession(refreshToken: string): Promise<ApiSessionTokens | null> {
  const current = await prisma.apiRefreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: { user: { select: { id: true, email: true, name: true, deletedAt: true, emailVerified: true } } },
  });
  if (!current) return null;
  if (current.revokedAt) {
    await revokeReusedFamily(current);
    return null;
  }
  if (current.expiresAt <= new Date()) return null;

  // Rows issued before families existed join a family named after themselves,
  // stamped on the revoked row too so a later replay of it is precise.
  const familyId = current.familyId ?? current.id;
  const revoked = await prisma.apiRefreshToken.updateMany({
    where: { id: current.id, revokedAt: null },
    data: { revokedAt: new Date(), familyId },
  });
  // Lost the race against a concurrent use of the same token. Both requests
  // read the row while it was live, so this is the client refreshing twice at
  // once, not a replay: refuse this one and leave the winner's pair alone.
  if (revoked.count === 0) return null;

  if (current.user.deletedAt) return null;

  const role = await apiRoleFor(current.user);
  return issueInFamily({ id: current.user.id, email: current.user.email, name: current.user.name, role }, familyId);
}

/**
 * A revoked refresh token was presented again. Outside the short grace that
 * covers a client's own concurrent refreshes, this is a replay: revoke every
 * live token of the family. A row issued before families existed and never
 * rotated since has no family, so all of the user's sessions are revoked.
 * Revoked rows are pruned after REVOKED_ROW_RETENTION_MS; an older replay is
 * simply an unknown token.
 */
async function revokeReusedFamily(row: { userId: string; familyId: string | null; revokedAt: Date | null }): Promise<void> {
  if (row.revokedAt && Date.now() - row.revokedAt.getTime() < REFRESH_REUSE_GRACE_MS) return;
  const ended = await prisma.apiRefreshToken.updateMany({
    where: row.familyId ? { familyId: row.familyId, revokedAt: null } : { userId: row.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (ended.count > 0) {
    console.warn(
      `[api-auth] Refresh token reuse for user ${row.userId}: revoked ${ended.count} session(s) ${row.familyId ? "in its family" : "(legacy token, all sessions)"}.`,
    );
  }
}

/**
 * Revokes one session by its refresh token (logout). Unknown tokens are
 * ignored. Returns the id of the user the token was issued to (even when it
 * was already revoked or expired), or null for an unknown token.
 */
export async function revokeApiSessionByRefreshToken(refreshToken: string): Promise<string | null> {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.apiRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const row = await prisma.apiRefreshToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  return row?.userId ?? null;
}

/** Revokes one session by id (the `sid` of an access token). */
export async function revokeApiSessionById(sessionId: string, userId: string): Promise<void> {
  await prisma.apiRefreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revokes every API session of a user (password reset, e-mail verification,
 * take-over of an unverified row) and forgets every device registered for
 * push: a phone whose session just ended must not keep receiving the
 * account's notifications. A signed-in device registers its token again.
 */
export async function revokeAllApiSessions(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.apiRefreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.deviceToken.deleteMany({ where: { userId } }),
  ]);
}

type AuthenticatedRequest = { user: ApiUserPayload; sessionId: string };

/**
 * The role an API session acts with. Staff roles are derived from the e-mail
 * address (ADMIN_EMAIL, DEVELOPER_EMAIL, a Teacher row), so they are granted
 * only once the address is verified: otherwise anyone could register an
 * address an admin has set up for a teacher and act as that teacher.
 */
async function apiRoleFor(user: { email: string; emailVerified: Date | null }): Promise<UserRole> {
  if (!user.emailVerified) return "USER";
  return resolveUserRole(user.email);
}

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
      select: { id: true, email: true, name: true, registrationNumber: true, emailVerified: true },
    });
    if (!dbUser) {
      return { user: null, error: "User account not found" };
    }

    const role = await apiRoleFor(dbUser);
    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        registrationNumber: dbUser.registrationNumber,
        role,
        emailVerified: Boolean(dbUser.emailVerified),
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
      errorResponse: apiError(error || "Unauthorized access", 401),
    };
  }

  return { user, sessionId, errorResponse: null };
}

/**
 * Enrolling, paying and ordering need a verified e-mail address, as on the
 * website. Returns the 403 to send, or null when the address is verified.
 */
export function requireVerifiedEmail(user: ApiUserPayload, action: string): NextResponse | null {
  if (user.emailVerified) return null;
  return apiError(`Please verify your email to ${action}.`, 403, { extra: { code: "email_not_verified" } });
}
