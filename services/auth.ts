import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/services/auth.config";
import { prisma } from "@/utils/prisma";
import { resolveUserRole } from "@/services/teacher-auth";
import { withDbErrorHandling } from "@/utils/db-error";
import { createAuthAdapter } from "@/services/auth-adapter";
import { getClientIp, rateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { getApiActorSession } from "@/services/api-actor";
import { googleSignInCallback } from "@/services/google-link";
import { authJwtCallback } from "@/services/auth-jwt";
import { verifyPassword } from "@/services/password";
import { LOGIN_PASSWORD_MAX_LENGTH } from "@/utils/validations";

/** Surfaced to the login form as result.code so it can offer to resend the verification email. */
class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

const nextAuth = NextAuth({
  ...authConfig,
  adapter: createAuthAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;
        if (String(credentials.password).length > LOGIN_PASSWORD_MAX_LENGTH) return null;

        const email = String(credentials.email).toLowerCase().trim();

        // Brute-force protection: per e-mail and per client IP.
        const ip = getClientIp(request.headers);
        const [byEmail, byIp] = await Promise.all([
          rateLimit(RATE_LIMITS.LOGIN, email),
          rateLimit(RATE_LIMITS.LOGIN_IP, ip),
        ]);
        if (!byEmail.ok || !byIp.ok) {
          console.warn(`[auth] Login rate limit hit for ${email} from ${ip}`);
          return null;
        }
        const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { email } }), "Database operation failed");

        // An unknown or password-less account costs the same bcrypt work as a
        // wrong password, so the timing does not reveal which addresses exist.
        const valid = await verifyPassword(String(credentials.password), user?.deletedAt ? null : user?.password);
        if (!user || !valid) return null;

        // An unverified address cannot sign in with a password: until the
        // owner confirms the mailbox, nobody can prove the account is theirs.
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image && !user.image.startsWith("data:") && user.image.length < 500 ? user.image : null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn: googleSignInCallback,
    jwt: authJwtCallback,
    async session({ session, token }) {
      if (session.user) {
        if (token.name) session.user.name = token.name as string;
        if (token.picture) session.user.image = token.picture as string;
        if (token.id) {
          session.user.id = token.id as string;
        }
        session.user.role =
          (token.role as "USER" | "ADMIN" | "TEACHER" | "DEVELOPER") ??
          (await resolveUserRole(session.user.email));
        if (token.teacherId) {
          session.user.teacherId = token.teacherId as string;
        }
        if (token.emailVerified) {
          session.user.emailVerified = new Date(token.emailVerified as string);
        } else {
          session.user.emailVerified = null;
        }
      }
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * The current session. Inside an /api/v1 route that runs a server action for
 * the app (see services/api-actor.ts) this is the app user's session;
 * everywhere else it is Auth.js's own `auth`.
 */
export const auth = ((...args: unknown[]) => {
  if (args.length === 0) {
    const apiSession = getApiActorSession();
    if (apiSession) return Promise.resolve(apiSession);
  }
  return (nextAuth.auth as (...a: unknown[]) => unknown)(...args);
}) as typeof nextAuth.auth;
