import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "USER" | "ADMIN" | "TEACHER" | "DEVELOPER";
      teacherId?: string;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "ADMIN" | "TEACHER" | "DEVELOPER";
    teacherId?: string;
    emailVerified?: string | null;
    /** Epoch ms of the last role/verification refresh from the database. */
    refreshedAt?: number;
  }
}
