import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { getAuthSecret } from "@/services/auth-secret";

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

/**
 * Edge-safe Auth.js config (no Prisma/bcrypt). Used by proxy.ts, whose
 * `authorized` callback below runs for every matched request.
 * Database-backed logic lives in services/auth.ts.
 */
/**
 * True when `pathname` is the section itself or a path below it. A plain
 * `startsWith` would also match unrelated public routes that share the prefix
 * (`/teacher` vs the public `/teachers` list).
 */
export function isUnderSection(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(`${section}/`);
}

export const authConfig = {
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            // Linking by email stays on so a student who registered with a
            // password can later use Google. The pre-verification takeover it
            // allows (attacker registers the victim's address, victim links
            // Google, attacker's password still works) is closed in the signIn
            // callback (services/google-link.ts), which refuses an address Google
            // has not verified and scrubs the password of an unverified row
            // before the link, and by the credentials provider refusing
            // unverified accounts.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    // A session lives a week; the token (and with it role/verification state)
    // is re-issued at most hourly while it is in use.
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  secret: getAuthSecret(),
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id as string;
        }
        if (token.role) {
          session.user.role = token.role as "USER" | "ADMIN" | "TEACHER" | "DEVELOPER";
        }
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
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (isUnderSection(pathname, "/admin")) {
        return auth?.user?.role === "ADMIN" || auth?.user?.role === "DEVELOPER";
      }

      if (isUnderSection(pathname, "/developer")) {
        return auth?.user?.role === "DEVELOPER";
      }

      // "/teacher" is the teacher portal; the public "/teachers" list is not.
      if (isUnderSection(pathname, "/teacher")) {
        return auth?.user?.role === "TEACHER";
      }

      if (isUnderSection(pathname, "/profile")) {
        return !!auth?.user;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
