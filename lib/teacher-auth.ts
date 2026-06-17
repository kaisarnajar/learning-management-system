import type { Session } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export type UserRole = "USER" | "ADMIN" | "TEACHER";

export async function getTeacherByEmail(email: string | null | undefined) {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  return withDbErrorHandling(() => prisma.teacher.findUnique({ where: { email: normalized } }), "Database operation failed");
}

export async function isTeacherEmail(email: string | null | undefined): Promise<boolean> {
  if (!email || isAdminEmail(email)) return false;
  const teacher = await getTeacherByEmail(email);
  return Boolean(teacher);
}

export async function resolveUserRole(email: string | null | undefined): Promise<UserRole> {
  if (isAdminEmail(email)) return "ADMIN";
  if (await isTeacherEmail(email)) return "TEACHER";
  return "USER";
}

export function isTeacherSession(session: Session | null): boolean {
  return session?.user?.role === "TEACHER";
}

export async function getTeacherForSession(session: Session | null) {
  if (!session?.user?.email) return null;
  if (session.user.role !== "TEACHER") return null;
  return getTeacherByEmail(session.user.email);
}
