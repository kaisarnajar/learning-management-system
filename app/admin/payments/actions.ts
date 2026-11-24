"use server";

import { adminReturnUrl, revalidateAdminPaths } from "@/utils/admin-redirects";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/services/auth-actions";
import { sendPaymentDeclinedEmail } from "@/services/email";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollments";
import {
  enrollmentStatusData,
  enrollmentStatusOf,
  paymentTypeOf,
  paymentTypeWrite,
  submissionStatusData,
  submissionStatusOf,
  SUBMISSION_STATUS_TEXT,
} from "@/services/status-compat";
import { prisma } from "@/utils/prisma";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import { getCourseById } from "@/services/courses";
import { notifyPaymentApproved, revalidateNotificationPaths } from "@/services/notifications";
import { withDbErrorHandling } from "@/utils/db-error";
import { getAppBaseUrl } from "@/services/password-reset";
import { normalizeReason, softDeleteSubmissionTx, voidPaymentRecordTx, VoidError } from "@/services/payment-voiding";
import { assignRollNumberTx } from "@/services/roll-numbers";

/** Rolls an approval back when the enrollment stopped awaiting its fee mid-way. */
class EnrollmentNotAwaitingFeeError extends Error {}

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
  revalidateAdminPaths(paths);
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

  const submissionStatus = submissionStatusOf(submission);
  const isEnrollmentFee = paymentTypeOf(submission) === "ENROLLMENT";

  if (submissionStatus === "APPROVED") {
    redirect(adminReturnUrl(returnTo, "/admin/payments", "confirmed"));
  }

  if (submissionStatus !== "PENDING_VERIFICATION") {
    return { error: "This payment cannot be confirmed." };
  }

  if (isEnrollmentFee) {
    const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: submission.userId, courseId: submission.courseId },
          },
        }), "Database operation failed");

    if (!enrollment || enrollmentStatusOf(enrollment) !== "AWAITING_ENROLLMENT_FEE") {
      return { error: "Enrollment is not awaiting an enrollment fee payment." };
    }
  }

  const course = await getCourseById(submission.courseId);
  if (isEnrollmentFee && !course) {
    return { error: "Course not found." };
  }

  const approve = () => prisma.$transaction(async (tx) => {
    // Claim the submission first. A double click, or the website and the app
    // at once, both get here; only the one whose update moves the row out of
    // PENDING_VERIFICATION creates the payment record.
    const claimed = await tx.coursePaymentSubmission.updateMany({
      where: { id: submissionId, status: SUBMISSION_STATUS_TEXT.PENDING_VERIFICATION, deletedAt: null },
      data: submissionStatusData("APPROVED"),
    });
    if (claimed.count === 0) return "already-processed" as const;

    if (isEnrollmentFee && course) {
      const moved = await tx.enrollment.updateMany({
        where: {
          userId: submission.userId,
          courseId: submission.courseId,
          status: ENROLLMENT_STATUS.AWAITING_FEE,
        },
        data: enrollmentStatusData(getRosterEnrollmentStatusForCourse(course.status)),
      });
      // The enrollment left AWAITING_ENROLLMENT_FEE since the check above:
      // roll the claim back rather than record income for nothing.
      if (moved.count === 0) throw new EnrollmentNotAwaitingFeeError();
    }

    const record = await tx.paymentRecord.create({
      data: {
        userId: submission.userId,
        courseId: submission.courseId,
        amountInrPaise: submission.amountInrPaise,
        paidAt: new Date(),
        ...paymentTypeWrite(submission.paymentType),
        description: submission.label,
      },
    });

    await tx.coursePaymentSubmission.update({
      where: { id: submissionId },
      data: { paymentRecordId: record.id },
    });

    if (isEnrollmentFee && course && getRosterEnrollmentStatusForCourse(course.status) === "ACTIVE") {
      const enrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId: submission.userId, courseId: submission.courseId } },
        select: { id: true },
      });
      if (enrollment) await assignRollNumberTx(tx, enrollment.id, submission.courseId);
    }
    return "approved" as const;
  });

  const outcome = await withDbErrorHandling(
    () => approve().catch((error: unknown) => {
      if (error instanceof EnrollmentNotAwaitingFeeError) return "not-awaiting-fee" as const;
      throw error;
    }),
    "Database operation failed",
  );

  if (outcome === "not-awaiting-fee") {
    return { error: "Enrollment is not awaiting an enrollment fee payment." };
  }

  if (outcome === "already-processed") {
    // Someone else decided it in the meantime: an approval is the same
    // outcome, anything else is reported.
    const current = await prisma.coursePaymentSubmission.findUnique({ where: { id: submissionId }, select: { status: true, statusEnum: true } });
    if (current && submissionStatusOf(current) === "APPROVED") {
      redirect(adminReturnUrl(returnTo, "/admin/payments", "confirmed"));
    }
    return { error: "This payment has already been processed." };
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
  redirect(adminReturnUrl(returnTo, "/admin/payments", "confirmed"));
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

  if (submissionStatusOf(submission) !== "PENDING_VERIFICATION") {
    return { error: "Only pending payments can be declined." };
  }

  const course = await getCourseById(submission.courseId);
  if (!course) {
    return { error: "Course not found." };
  }

  // The same guarded claim as approval: a decline that loses the race to an
  // approval (or to another decline) changes nothing.
  const claimed = await withDbErrorHandling(() => prisma.coursePaymentSubmission.updateMany({
      where: { id: submissionId, status: SUBMISSION_STATUS_TEXT.PENDING_VERIFICATION, deletedAt: null },
      data: {
        ...submissionStatusData("DECLINED"),
        upiTransactionId: null,
        paymentScreenshotPath: null,
        paymentMethod: null,
        paymentMethodEnum: null,
      },
    }), "Database operation failed");
  if (claimed.count === 0) {
    return { error: "This payment has already been processed." };
  }

  const base = getAppBaseUrl();
  const paymentUrl =
    paymentTypeOf(submission) === "ENROLLMENT"
      ? `${base.replace(/\/$/, "")}/profile/courses/${submission.courseId}/enrollment-pay`
      : `${base.replace(/\/$/, "")}/profile/courses/${submission.courseId}/pay`;

  // The decline is committed; the email goes out after the response.
  after(() => sendPaymentDeclinedEmail({
    to: submission.user.email,
    studentName: submission.user.name ?? "",
    courseTitle: course.title,
    paymentUrl,
  }));

  revalidatePaymentPaths(submission.userId, submission.courseId);
  redirect(adminReturnUrl(returnTo, "/admin/payments", "declined"));
}

/**
 * Voids an approved fee payment: the PaymentRecord is marked voided (kept for
 * audit), the submission is soft-deleted, and both are written to the audit
 * log with the admin's reason. Nothing is hard-deleted.
 */
export async function voidApprovedPayment(
  submissionId: string,
  reason: string | undefined,
  returnTo?: string,
): Promise<{ error?: string } | void> {
  const session = await requireAdmin();
  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return { error: "Please give a reason (at least 3 characters); it is recorded in the audit log." };
  }

  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findUnique({
      where: { id: submissionId },
    }), "Database operation failed");

  if (!submission || submission.deletedAt) {
    return { error: "Payment submission not found." };
  }

  if (submissionStatusOf(submission) !== "APPROVED") {
    return { error: "Only approved payments can be voided." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (submission.paymentRecordId) {
        await voidPaymentRecordTx(tx, session, submission.paymentRecordId, normalizedReason);
      }
      await softDeleteSubmissionTx(tx, session, submissionId, normalizedReason);
    });
  } catch (error) {
    if (error instanceof VoidError) return { error: error.message };
    throw error;
  }

  revalidatePaymentPaths(submission.userId, submission.courseId);
  redirect(adminReturnUrl(returnTo, "/admin/payments", "deleted"));
}

/** Voids a manually recorded payment (kept for audit; excluded from finance). */
export async function voidManualPaymentRecord(
  recordId: string,
  reason: string | undefined,
  returnTo?: string,
): Promise<{ error?: string } | void> {
  const session = await requireAdmin();
  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return { error: "Please give a reason (at least 3 characters); it is recorded in the audit log." };
  }

  const record = await withDbErrorHandling(
    () => prisma.paymentRecord.findUnique({ where: { id: recordId } }),
    "Database operation failed",
  );

  if (!record || record.voidedAt) {
    return { error: "Payment record not found." };
  }

  try {
    await prisma.$transaction((tx) => voidPaymentRecordTx(tx, session, recordId, normalizedReason));
  } catch (error) {
    if (error instanceof VoidError) return { error: error.message };
    throw error;
  }

  revalidatePaymentPaths(record.userId);
  const param = new URLSearchParams({ type: "manual_transactions", deleted: "1" });
  redirect(returnTo?.startsWith("/admin") ? adminReturnUrl(returnTo, "/admin/payments", "deleted") : `/admin/payments?${param.toString()}`);
}

