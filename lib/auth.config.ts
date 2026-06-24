import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID) && Boolean(process.env.AUTH_GOOGLE_SECRET);

/**
 * Edge-safe Auth.js config (no Prisma/bcrypt). Used by proxy.ts.
 * Database-backed logic lives in lib/auth.ts.
 */
export const authConfig = {
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
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

      if (pathname.startsWith("/admin")) {
        return auth?.user?.role === "ADMIN" || auth?.user?.role === "DEVELOPER";
      }

      if (pathname.startsWith("/developer")) {
        return auth?.user?.role === "DEVELOPER";
      }

      if (pathname.startsWith("/teacher")) {
        return auth?.user?.role === "TEACHER";
      }

      if (pathname.startsWith("/profile")) {
        return !!auth?.user;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
