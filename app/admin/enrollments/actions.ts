"use server";

import { revalidatePath } from "next/cache";
import { adminReturnUrl, revalidateAdminPaths } from "@/utils/admin-redirects";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";

import { getCourseById } from "@/services/courses";
import { canApproveEnrollment, canRejectEnrollment } from "@/services/enrollment-status";
import { assignRollNumberTx } from "@/services/roll-numbers";
import { enrollmentStatusData, enrollmentStatusOf } from "@/services/status-compat";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollments";
import {
  notifyEnrollmentApproved,
  notifyEnrollmentRejected,
} from "@/services/notifications";
import { prisma } from "@/utils/prisma";
import {
  lookupStudentAccountForEnrollment,
  normalizeStudentEmail,
} from "@/services/student-admin";
import { adminEnrollUserSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";

function revalidateEnrollmentPaths(courseId: string) {
  const paths = [
    "/admin",
    "/admin/enrollments",
    "/admin/students",
    "/admin/courses",
    `/admin/courses/${courseId}/students`,
    "/profile/courses",
    "/profile/notifications",
    "/courses",
  ];

  revalidateAdminPaths(paths);
}

/** Approve a free-course enrollment request. */
export async function approveEnrollmentRequest(
  enrollmentId: string,
  courseId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    }), "Database operation failed");

  if (!enrollment || enrollment.courseId !== courseId) {
    return { error: "Enrollment not found." };
  }

  const currentStatus = enrollmentStatusOf(enrollment);

  if (currentStatus === "ACTIVE") {
    redirect(adminReturnUrl(returnTo, "/admin/enrollments"));
  }

  if (currentStatus === "COMPLETED") {
    return { error: "This enrollment is already completed." };
  }

  if (!canApproveEnrollment(enrollment.status)) {
    return { error: "This enrollment cannot be approved." };
  }

  const course = await getCourseById(courseId);
  if (!course) {
    return { error: "Course not found." };
  }

  const rosterStatus = getRosterEnrollmentStatusForCourse(course.status);

  // Status change and roll number commit together; the status guard makes a
  // second concurrent approval a no-op instead of a double update.
  const approved = await withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.updateMany({
      where: { id: enrollmentId, status: enrollment.status },
      data: { ...enrollmentStatusData(rosterStatus), rejectedAt: null },
    });
    if (updated.count === 0) return false;
    if (rosterStatus === "ACTIVE") {
      await assignRollNumberTx(tx, enrollmentId, courseId);
    }
    return true;
  }), "Database operation failed");

  if (!approved) {
    return { error: "This enrollment was already processed by someone else. Refresh the page." };
  }

  await notifyEnrollmentApproved({
    userId: enrollment.userId,
    courseTitle: course.title,
    enrollmentId,
  });

  revalidateEnrollmentPaths(courseId);
  revalidatePath(`/admin/students/${enrollment.userId}`, "page");

  redirect(adminReturnUrl(returnTo, "/admin/enrollments", "approved"));
}

/** Reject a student's pending enrollment request. */
export async function rejectEnrollmentRequest(
  enrollmentId: string,
  courseId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    }), "Database operation failed");

  if (!enrollment || enrollment.courseId !== courseId) {
    return { error: "Enrollment not found." };
  }

  if (!canRejectEnrollment(enrollment.status)) {
    return { error: "Only pending enrollment requests can be rejected." };
  }

  const course = await getCourseById(courseId);
  const courseTitle = course?.title ?? "the course";

  // Rejection is a status, not a deletion: the request stays visible in the
  // student's history and the student can apply again later.
  const rejected = await withDbErrorHandling(() => prisma.enrollment.updateMany({
      where: { id: enrollmentId, status: enrollment.status },
      data: { ...enrollmentStatusData("REJECTED"), rejectedAt: new Date() },
    }), "Database operation failed");

  if (rejected.count === 0) {
    return { error: "This enrollment was already processed by someone else. Refresh the page." };
  }

  // Notify only once the rejection is committed.
  await notifyEnrollmentRejected({
    userId: enrollment.userId,
    courseTitle,
    enrollmentId,
  });

  revalidateEnrollmentPaths(courseId);
  revalidatePath(`/admin/students/${enrollment.userId}`, "page");

  redirect(adminReturnUrl(returnTo, "/admin/enrollments", "rejected"));
}

export type AdminEnrollUserState = {
  error?: string;
  success?: string;
};

export async function adminEnrollUser(
  _prev: AdminEnrollUserState,
  formData: FormData,
): Promise<AdminEnrollUserState> {
  await requireAdmin();

  const parsed = adminEnrollUserSchema.safeParse({
    email: formData.get("email"),
    courseId: formData.get("courseId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const account = await lookupStudentAccountForEnrollment(parsed.data.email);
  if (!account.ok) {
    return { error: account.error };
  }

  const course = await getCourseById(parsed.data.courseId);
  if (!course) {
    return { error: "Course not found." };
  }

  const status = getRosterEnrollmentStatusForCourse(course.status);

  const upserted = await withDbErrorHandling(() => prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: account.userId, courseId: course.id },
      },
      create: {
        userId: account.userId,
        courseId: course.id,
        ...enrollmentStatusData(status),
      },
      update: { ...enrollmentStatusData(status), rejectedAt: null },
    }), "Database operation failed");

  if (status === "ACTIVE") {
    const { assignRollNumber } = await import("@/services/roll-numbers");
    await assignRollNumber(upserted.id, course.id);
  }

  revalidateEnrollmentPaths(course.id);

  return { success: `${account.name} is now enrolled in ${course.title}.` };
}

export async function previewStudentAccountForEnrollment(email: string) {
  await requireAdmin();
  if (!email.trim()) {
    return { ok: false as const, error: "Enter an email address." };
  }
  return lookupStudentAccountForEnrollment(normalizeStudentEmail(email));
}

export async function removeEnrollmentFromCourse(enrollmentId: string, courseId: string) {
  await requireAdmin();

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    }), "Database operation failed");

  if (!enrollment || enrollment.courseId !== courseId) {
    return { error: "Enrollment not found." };
  }
  await withDbErrorHandling(() => prisma.enrollment.delete({ where: { id: enrollmentId } }), "Database operation failed");

  revalidateEnrollmentPaths(courseId);
  revalidatePath(`/admin/students/${enrollment.userId}`);

  return { success: "Enrollment removed successfully." };
}
