"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import {
  deleteUploadedCertificate,
  saveUploadedCertificate,
  validateCertificatePdf,
} from "@/lib/certificate-upload";
import { getCourseById } from "@/lib/courses";
import { canApproveEnrollment, canRejectEnrollment } from "@/lib/enrollment-status";
import { getRosterEnrollmentStatusForCourse } from "@/lib/enrollments";
import {
  notifyEnrollmentApproved,
  notifyEnrollmentRejected,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  lookupStudentAccountForEnrollment,
  normalizeStudentEmail,
} from "@/lib/student-admin";
import { adminEnrollUserSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

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

  for (const path of paths) {
    revalidatePath(path, "layout");
    revalidatePath(path, "page");
  }
}

function enrollmentReturnUrl(returnTo: string | undefined): string {
  if (!returnTo?.startsWith("/admin")) return "/admin/enrollments";
  return returnTo.split("?")[0] ?? "/admin/enrollments";
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

  if (enrollment.status === "active") {
    redirect(enrollmentReturnUrl(returnTo));
  }

  if (enrollment.status === "completed") {
    return { error: "This enrollment is already completed." };
  }

  if (!canApproveEnrollment(enrollment.status)) {
    return { error: "This enrollment cannot be approved." };
  }

  const course = await getCourseById(courseId);
  if (!course) {
    return { error: "Course not found." };
  }

  await withDbErrorHandling(() => prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: getRosterEnrollmentStatusForCourse(course.status) },
    }), "Database operation failed");

  await notifyEnrollmentApproved({
    userId: enrollment.userId,
    courseTitle: course.title,
    enrollmentId,
  });

  revalidateEnrollmentPaths(courseId);
  revalidatePath(`/admin/students/${enrollment.userId}`, "page");

  redirect(enrollmentReturnUrl(returnTo));
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

  await notifyEnrollmentRejected({
    userId: enrollment.userId,
    courseTitle,
    enrollmentId,
  });

  await withDbErrorHandling(() => prisma.enrollment.delete({ where: { id: enrollmentId } }), "Database operation failed");

  revalidateEnrollmentPaths(courseId);
  revalidatePath(`/admin/students/${enrollment.userId}`, "page");

  redirect(enrollmentReturnUrl(returnTo));
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

  await withDbErrorHandling(() => prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: account.userId, courseId: course.id },
      },
      create: {
        userId: account.userId,
        courseId: course.id,
        status,
      },
      update: { status },
    }), "Database operation failed");

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

export async function uploadCertificate(
  enrollmentId: string,
  courseId: string,
  formData: FormData,
) {
  await requireAdmin();

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({ where: { id: enrollmentId } }), "Database operation failed");
  if (!enrollment || enrollment.courseId !== courseId) {
    return { error: "Enrollment not found." };
  }

  if (enrollment.status !== "completed") {
    return { error: "Certificates can only be uploaded for completed students." };
  }

  const course = await getCourseById(courseId);
  if (!course) {
    return { error: "Course not found." };
  }

  if (course.status !== "COMPLETED") {
    return { error: "Upload certificates after the course status is set to Completed." };
  }

  const file = formData.get("certificate");
  const validation = validateCertificatePdf(file instanceof File ? file : null);
  if (validation.error) {
    return { error: validation.error };
  }

  if (enrollment.uploadedCertificatePath) {
    await deleteUploadedCertificate(enrollment.uploadedCertificatePath);
  }

  const uploadedPath = await saveUploadedCertificate(enrollmentId, file as File);

  await withDbErrorHandling(() => prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { uploadedCertificatePath: uploadedPath },
    }), "Database operation failed");

  revalidateEnrollmentPaths(courseId);
  revalidatePath("/profile/courses");

  return { success: true };
}

export async function removeEnrollmentFromCourse(enrollmentId: string, courseId: string) {
  await requireAdmin();

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    }), "Database operation failed");

  if (!enrollment || enrollment.courseId !== courseId) {
    return { error: "Enrollment not found." };
  }

  await deleteUploadedCertificate(enrollment.uploadedCertificatePath);
  await withDbErrorHandling(() => prisma.enrollment.delete({ where: { id: enrollmentId } }), "Database operation failed");

  revalidateEnrollmentPaths(courseId);
  revalidatePath(`/admin/students/${enrollment.userId}`);

  return { success: true };
}
