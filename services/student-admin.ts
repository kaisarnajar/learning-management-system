import { isAdminEmail } from "@/services/admin";
import { lookupRegisteredUser, normalizeAccountEmail } from "@/services/user-account-lookup";

export { normalizeAccountEmail as normalizeStudentEmail };

export type StudentAccountLookup =
  | { ok: true; userId: string; name: string; email: string }
  | { ok: false; error: string };

/** Admin may only enroll emails that already belong to a registered student account. */
export async function lookupStudentAccountForEnrollment(
  email: string,
): Promise<StudentAccountLookup> {
  const normalized = normalizeAccountEmail(email);

  if (!normalized) {
    return { ok: false, error: "Enter an email address." };
  }

  if (isAdminEmail(normalized)) {
    return { ok: false, error: "This email is reserved for administration." };
  }

  return lookupRegisteredUser(normalized, {
    notFoundMessage:
      "No account found with this email. The student must register on the site first, then you can enroll them.",
  });
}
