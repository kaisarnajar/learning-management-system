"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { sendPaymentDeclinedEmail } from "@/lib/email";
import { AWAITING_ENROLLMENT_FEE } from "@/lib/enrollment-status";
import { getRosterEnrollmentStatusForCourse } from "@/lib/enrollments";
import {
  MONTHLY_PAYMENT_APPROVED,
  MONTHLY_PAYMENT_DECLINED,
  MONTHLY_PAYMENT_PENDING,
  PAYMENT_TYPE_ENROLLMENT,
} from "@/lib/monthly-payment-status";
import { prisma } from "@/lib/prisma";
import { getCourseById } from "@/lib/courses";
import { notifyPaymentApproved, revalidateNotificationPaths } from "@/lib/notifications";
import { withDbErrorHandling } from "@/lib/db-error";
import { getAppBaseUrl } from "@/lib/password-reset";

function revalidatePaymentPaths(userId: string, courseId?: string | null) {
  const paths = [
    "/admin",
    "/admin/finance",
    "/admin/enrollments",
    "/admin/payments",
    "/admin/students",
    `/admin/students/${userId}`,
    "/profile/payments",
    "/profile/courses",
    "/profile/notifications",
  ];
  if (courseId) {
    paths.push(`/admin/courses/${courseId}/students`);
  }
  for (const path of paths) {
    revalidatePath(path, "layout");
    revalidatePath(path, "page");
  }
}

function paymentReturnUrl(returnTo: string | undefined, event: "confirmed" | "declined" | "deleted"): string {
  const param = event === "confirmed" ? "confirmed" : event === "declined" ? "declined" : "deleted";
  const fallback = `/admin/payments?${param}=1`;
  if (!returnTo?.startsWith("/admin")) return fallback;
  const [pathname, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);
  params.set(param, "1");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : `${pathname}?${param}=1`;
}

export async function confirmMonthlyPayment(
  submissionId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findUnique({
      where: { id: submissionId },
      include: { user: { select: { email: true, name: true } } },
    }), "Database operation failed");

  if (!submission) {
    return { error: "Payment submission not found." };
  }

  if (submission.status === MONTHLY_PAYMENT_APPROVED) {
    redirect(paymentReturnUrl(returnTo, "confirmed"));
  }

  if (submission.status !== MONTHLY_PAYMENT_PENDING) {
    return { error: "This payment cannot be confirmed." };
  }

  if (submission.paymentType === PAYMENT_TYPE_ENROLLMENT) {
    const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: submission.userId, courseId: submission.courseId },
          },
        }), "Database operation failed");

    if (!enrollment || enrollment.status !== AWAITING_ENROLLMENT_FEE) {
      return { error: "Enrollment is not awaiting an enrollment fee payment." };
    }
  }

  const course = await getCourseById(submission.courseId);
  if (submission.paymentType === PAYMENT_TYPE_ENROLLMENT && !course) {
    return { error: "Course not found." };
  }

  await withDbErrorHandling(() => prisma.$transaction(async (tx) => {
    const record = await tx.paymentRecord.create({
      data: {
        userId: submission.userId,
        courseId: submission.courseId,
        amountInrPaise: submission.amountInrPaise,
        paidAt: new Date(),
        paymentType: submission.paymentType,
        description: submission.label,
      },
    });

    await tx.coursePaymentSubmission.update({
      where: { id: submissionId },
      data: {
        status: MONTHLY_PAYMENT_APPROVED,
        paymentRecordId: record.id,
      },
    });

      if (submission.paymentType === PAYMENT_TYPE_ENROLLMENT && course) {
        await tx.enrollment.updateMany({
          where: {
            userId: submission.userId,
            courseId: submission.courseId,
            status: AWAITING_ENROLLMENT_FEE,
          },
          data: { status: getRosterEnrollmentStatusForCourse(course.status) },
        });
      }
    }), "Database operation failed");

    if (submission.paymentType === PAYMENT_TYPE_ENROLLMENT && course && getRosterEnrollmentStatusForCourse(course.status) === "active") {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: submission.userId, courseId: submission.courseId } },
        select: { id: true },
      });
      if (enrollment) {
        const { assignRollNumber } = await import("@/lib/roll-numbers");
        await assignRollNumber(enrollment.id, submission.courseId);
      }
    }

  if (course) {
    await notifyPaymentApproved({
      userId: submission.userId,
      courseTitle: course.title,
      sourceId: submissionId,
      sourceType: "CoursePaymentSubmission",
    });
  } else {
    revalidateNotificationPaths(submission.userId);
  }

  revalidatePaymentPaths(submission.userId, submission.courseId);
  redirect(paymentReturnUrl(returnTo, "confirmed"));
}

export async function declineMonthlyPayment(
  submissionId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findUnique({
      where: { id: submissionId },
      include: { user: { select: { email: true, name: true } } },
    }), "Database operation failed");

  if (!submission) {
    return { error: "Payment submission not found." };
  }

  if (submission.status !== MONTHLY_PAYMENT_PENDING) {
    return { error: "Only pending payments can be declined." };
  }

  const course = await getCourseById(submission.courseId);
  if (!course) {
    return { error: "Course not found." };
  }

  await withDbErrorHandling(() => prisma.coursePaymentSubmission.update({
      where: { id: submissionId },
      data: {
        status: MONTHLY_PAYMENT_DECLINED,
        upiTransactionId: null,
        paymentScreenshotPath: null,
        paymentMethod: null,
      },
    }), "Database operation failed");

  const base = getAppBaseUrl();
  const paymentUrl =
    submission.paymentType === PAYMENT_TYPE_ENROLLMENT
      ? `${base.replace(/\/$/, "")}/profile/courses/${submission.courseId}/enrollment-pay`
      : `${base.replace(/\/$/, "")}/profile/courses/${submission.courseId}/pay`;

  await sendPaymentDeclinedEmail({
    to: submission.user.email,
    studentName: submission.user.name ?? "",
    courseTitle: course.title,
    paymentUrl,
  });

  revalidatePaymentPaths(submission.userId, submission.courseId);
  redirect(paymentReturnUrl(returnTo, "declined"));
}

export async function deleteApprovedPayment(
  submissionId: string,
  returnTo?: string,
): Promise<{ error?: string } | void> {
  await requireAdmin();

  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findUnique({
      where: { id: submissionId },
    }), "Database operation failed");

  if (!submission) {
    return { error: "Payment submission not found." };
  }

  if (submission.status !== MONTHLY_PAYMENT_APPROVED) {
    return { error: "Only approved payments can be deleted." };
  }

  if (submission.paymentRecordId) {
    const recordId = submission.paymentRecordId;
    await withDbErrorHandling(() => prisma.paymentRecord.delete({
        where: { id: recordId },
      }), "Database operation failed");
  }

  await withDbErrorHandling(() => prisma.coursePaymentSubmission.delete({
      where: { id: submissionId },
    }), "Database operation failed");

  revalidatePaymentPaths(submission.userId, submission.courseId);
  redirect(paymentReturnUrl(returnTo, "deleted"));
}
