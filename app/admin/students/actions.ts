"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

function revalidateStudentPaths(courseIds: string[] = []) {
  revalidatePath("/admin/students");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  revalidatePath("/profile");
  revalidatePath("/profile/courses");
  revalidatePath("/profile/payments");
  for (const courseId of courseIds) {
    revalidatePath(`/admin/courses/${courseId}/students`);
  }
}

export async function deleteStudentUser(id: string): Promise<{ error?: string; success?: string }> {
  await requireAdmin();

  const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { id } }), "Database operation failed");
  if (!user) {
    return { error: "Student not found." };
  }

  if (isAdminEmail(user.email)) {
    return { error: "The admin account cannot be deleted." };
  }

  const courseIds = (
    await withDbErrorHandling(() => prisma.enrollment.findMany({
            where: { userId: id },
            select: { courseId: true },
          }), "Database operation failed")
  ).map((e) => e.courseId);

  await withDbErrorHandling(() => prisma.user.delete({ where: { id } }), "Database operation failed");

  revalidateStudentPaths(courseIds);

  return { success: "Student successfully deleted." };
}

export async function deleteStudentUserForm(id: string) {
  const result = await deleteStudentUser(id);
  if (result.error) {
    redirect(`/admin/students/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/students?deleted=1");
}
