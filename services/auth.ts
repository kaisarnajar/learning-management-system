import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/services/auth.config";
import { prisma } from "@/utils/prisma";
import { resolveUserRole } from "@/services/teacher-auth";
import { createAuthAdapter } from "@/services/auth-adapter";
import { getClientIp } from "@/services/rate-limit";
import { authenticateCredentials, normalizeSignInEmail } from "@/services/credentials";
import { getApiActorSession } from "@/services/api-actor";
import { googleSignInCallback } from "@/services/google-link";
import { authJwtCallback } from "@/services/auth-jwt";

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

        const ip = getClientIp(request.headers);
        const result = await authenticateCredentials(String(credentials.email), String(credentials.password), ip);
        if (!result.ok) {
          if (result.reason === "RATE_LIMITED") {
            console.warn(`[auth] Login rate limit hit for ${normalizeSignInEmail(String(credentials.email))} from ${ip}`);
          }
          if (result.reason === "EMAIL_NOT_VERIFIED") throw new EmailNotVerifiedError();
          return null;
        }

        const { user } = result;
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
