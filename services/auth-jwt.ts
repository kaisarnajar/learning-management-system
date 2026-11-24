import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/utils/prisma";
import { getTeacherByEmail, resolveUserRole } from "@/services/teacher-auth";

type JwtCallback = NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>;

/** How long role, teacher link and verification state may be served from the token before being re-read. */
export const TOKEN_REFRESH_INTERVAL_MS = 60 * 1000;

/**
 * The Auth.js `jwt` callback (Node only; it reads the database).
 *
 * Role, teacher link, verification state and the session version are re-read
 * on sign-in, on an explicit update() and at most once a minute otherwise, so
 * removing an admin email or verifying an address takes effect on the next
 * request instead of at the next sign-in.
 *
 * The user is looked up by the token's id and must still have the token's
 * address.
 *
 * The session version (User.sessionVersion) is copied into the token at sign-in
 * and compared on every re-read: a password reset or change, or an account
 * take-over, increments it and every web session issued before then ends
 * within a minute. A token issued before the claim existed has none and is
 * read as version 0, the column's default, so a deploy does not sign anyone out.
 */
export const authJwtCallback: JwtCallback = async ({ token, user, account, trigger }) => {
  if (user?.id) {
    token.id = user.id;

    // Auto-verify email for OAuth providers (e.g. Google) on first sign-in.
    if (account && account.provider !== "credentials") {
      try {
        const dbUser = await prisma.user.findUnique({
          select: { emailVerified: true },
          where: { id: user.id },
        });
        if (dbUser && !dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      } catch (e) {
        console.error("[auth] Error auto-verifying OAuth user:", e);
      }
    }
  }

  const stale = !token.refreshedAt || Date.now() - token.refreshedAt > TOKEN_REFRESH_INTERVAL_MS;
  if (token.email && (user || trigger === "update" || !token.role || stale)) {
    try {
      // By id, not by address: a deleted account's address can be registered
      // again, and looking the token up by e-mail would hand the old cookie
      // (carrying the deleted user's id) to the new account. Every token gets
      // its id at sign-in; one without is not a session this app issued.
      if (!token.id) return null;
      const dbUser = await prisma.user.findUnique({
        select: { email: true, emailVerified: true, name: true, image: true, deletedAt: true, sessionVersion: true },
        where: { id: token.id },
      });
      if (!dbUser || dbUser.deletedAt || dbUser.email !== token.email) {
        // Account gone, or no longer the address this session was issued for:
        // hand back an empty token so the session ends.
        return null;
      }
      if (user) {
        token.sessionVersion = dbUser.sessionVersion;
      } else if ((token.sessionVersion ?? 0) !== dbUser.sessionVersion) {
        // The password was reset or changed, or the account taken back, after this session began.
        return null;
      }
      token.emailVerified = dbUser.emailVerified ? dbUser.emailVerified.toISOString() : null;
      token.refreshedAt = Date.now();
      if (dbUser.name) token.name = dbUser.name;

      // Never store large base64 data URLs in JWT session cookie header to prevent Vercel 494 (REQUEST_HEADER_TOO_LARGE)
      if (dbUser.image && !dbUser.image.startsWith("data:") && dbUser.image.length < 500) {
        token.picture = dbUser.image;
      } else {
        token.picture = null;
      }

      const role = await resolveUserRole(token.email as string);
      token.role = role;
      if (role === "TEACHER") {
        const teacher = await getTeacherByEmail(token.email as string);
        token.teacherId = teacher?.id;
      } else {
        token.teacherId = undefined;
      }
    } catch (error) {
      console.error("[auth] Failed to resolve user role:", error);
      token.role = token.role ?? "USER";
    }
  }
  return token;
};
