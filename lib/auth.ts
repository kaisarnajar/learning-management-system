import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { getTeacherByEmail, resolveUserRole } from "@/lib/teacher-auth";
import { withDbErrorHandling } from "@/lib/db-error";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { email } }), "Database operation failed");

        if (!user?.password) return null;

        const valid = await compare(String(credentials.password), user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.email) {
        try {
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
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id as string;
        }
        session.user.role =
          (token.role as "USER" | "ADMIN" | "TEACHER" | "DEVELOPER") ??
          (await resolveUserRole(session.user.email));
        if (token.teacherId) {
          session.user.teacherId = token.teacherId as string;
        }
      }
      return session;
    },
  },
});
