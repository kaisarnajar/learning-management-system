import { isAdminEmail } from "@/services/admin";
import { prisma } from "@/utils/prisma";
import { lookupRegisteredUser, normalizeAccountEmail } from "@/services/user-account-lookup";
import { withDbErrorHandling } from "@/utils/db-error";

export const normalizeTeacherEmail = normalizeAccountEmail;

export function deriveTeacherInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export type TeacherAccountLookup =
  | { ok: true; name: string; email: string; image: string | null }
  | { ok: false; error: string };

/** Admin may only link emails that already belong to a registered user account. */
export async function lookupTeacherAccount(
  email: string,
  options?: { excludeTeacherId?: string },
): Promise<TeacherAccountLookup> {
  const normalized = normalizeAccountEmail(email);

  if (!normalized) {
    return { ok: false, error: "Enter an email address." };
  }

  if (isAdminEmail(normalized)) {
    return { ok: false, error: "This email is reserved for administration." };
  }

  const existingTeacher = await withDbErrorHandling(() => prisma.teacher.findUnique({ where: { email: normalized } }), "Database operation failed");
  if (existingTeacher && existingTeacher.id !== options?.excludeTeacherId) {
    return { ok: false, error: "This email is already linked to another teacher profile." };
  }

  const account = await lookupRegisteredUser(normalized, {
    notFoundMessage:
      "No account found with this email. The person must register on the site first, then you can add them as a teacher.",
  });

  if (!account.ok) {
    return account;
  }

  return { ok: true, name: account.name, email: account.email, image: account.image };
}
