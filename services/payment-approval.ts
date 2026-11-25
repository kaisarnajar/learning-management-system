import type { Session } from "next-auth";
import { after } from "next/server";

import { recordAudit } from "@/services/audit";
import { CouponAlreadyUsedError, releaseCouponTx, spendReservedCouponTx } from "@/services/coupons";
import { getCourseById } from "@/services/courses";
import { sendPaymentDeclinedEmail } from "@/services/email";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollments";
import { notifyPaymentApproved, revalidateNotificationPaths } from "@/services/notifications";
import { getAppBaseUrl } from "@/services/password-reset";
import { deleteUpload } from "@/services/uploads";
import { normalizeReason, softDeleteSubmissionTx, voidPaymentRecordTx, VoidError } from "@/services/payment-voiding";
import { assignRollNumberTx } from "@/services/roll-numbers";
import {
  enrollmentStatusData,
  enrollmentStatusOf,
  paymentTypeOf,
  paymentTypeWrite,
  submissionStatusData,
  submissionStatusOf,
} from "@/services/status-compat";
import { revalidateAdminPaths } from "@/utils/admin-redirects";
import { withDbErrorHandling } from "@/utils/db-error";
import { prisma } from "@/utils/prisma";

/**
 * Approving, declining and voiding fee payments. Callers (the admin website
 * actions, the staff API) authorise the admin first, then map the typed
 * result to their response: a redirect or flash, or an HTTP status.
 */

/** A refused operation: `error` is safe to show; `status` is the HTTP status an API would answer. */
export type PaymentActionFailure = { ok: false; error: string; status: 400 | 404 | 409 };
export type PaymentActionResult<T extends object = object> = ({ ok: true } & T) | PaymentActionFailure;

const fail = (error: string, status: PaymentActionFailure["status"]): PaymentActionFailure => ({ ok: false, error, status });

const REASON_REQUIRED = "Please give a reason (at least 3 characters); it is recorded in the audit log.";

/** Rolls an approval back when the enrollment stopped awaiting its fee mid-way. */
class EnrollmentNotAwaitingFeeError extends Error {}

/** Cache invalidation after a fee payment changes, for the admin and the student's pages. */
export function revalidatePaymentPaths(userId: string, courseId?: string | null) {
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

/**
 * Approves a pending fee payment: claims the submission, moves an enrollment
 * fee's enrollment to its roster status, spends the reserved coupon, records
 * the income and assigns the roll number, then notifies the student.
 * `alreadyApproved` is true when it was approved before (or by a concurrent
 * request); nothing was changed then.
 */
export async function approveFeePayment(
  submissionId: string,
): Promise<PaymentActionResult<{ alreadyApproved: boolean; userId: string; courseId: string }>> {
  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findUnique({
      where: { id: submissionId },
      include: { user: { select: { email: true, name: true } } },
    }), "Database operation failed");

  if (!submission) {
    return fail("Payment submission not found.", 404);
  }

  const submissionStatus = submissionStatusOf(submission);
  const isEnrollmentFee = paymentTypeOf(submission) === "ENROLLMENT";
  const done = (alreadyApproved: boolean) => ({ ok: true as const, alreadyApproved, userId: submission.userId, courseId: submission.courseId });

  if (submissionStatus === "APPROVED") {
    return done(true);
  }

  if (submissionStatus !== "PENDING_VERIFICATION") {
    return fail("This payment cannot be confirmed.", 409);
  }

  if (isEnrollmentFee) {
    const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: submission.userId, courseId: submission.courseId },
          },
        }), "Database operation failed");

    if (!enrollment || enrollmentStatusOf(enrollment) !== "AWAITING_ENROLLMENT_FEE") {
      return fail("Enrollment is not awaiting an enrollment fee payment.", 409);
    }
  }

  const course = await getCourseById(submission.courseId);
  if (isEnrollmentFee && !course) {
    return fail("Course not found.", 404);
  }

  const approve = () => prisma.$transaction(async (tx) => {
    // Claim the submission first. A double click, or the website and the app
    // at once, both get here; only the one whose update moves the row out of
    // PENDING_VERIFICATION creates the payment record.
    const claimed = await tx.coursePaymentSubmission.updateMany({
      where: { id: submissionId, statusEnum: "PENDING_VERIFICATION", deletedAt: null },
      data: submissionStatusData("APPROVED"),
    });
    if (claimed.count === 0) return "already-processed" as const;

    if (isEnrollmentFee && course) {
      const moved = await tx.enrollment.updateMany({
        where: {
          userId: submission.userId,
          courseId: submission.courseId,
          statusEnum: "AWAITING_ENROLLMENT_FEE",
        },
        data: enrollmentStatusData(getRosterEnrollmentStatusForCourse(course.status)),
      });
      // The enrollment left AWAITING_ENROLLMENT_FEE since the check above:
      // roll the claim back rather than record income for nothing.
      if (moved.count === 0) throw new EnrollmentNotAwaitingFeeError();
    }

    // The coupon was only reserved at submission; it is spent now, so a
    // declined submission never burns it.
    if (submission.couponId) {
      await spendReservedCouponTx(tx, submission.userId, submission.couponId, submissionId);
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
      if (error instanceof CouponAlreadyUsedError) return "coupon-used" as const;
      throw error;
    }),
    "Database operation failed",
  );

  if (outcome === "not-awaiting-fee") {
    return fail("Enrollment is not awaiting an enrollment fee payment.", 409);
  }

  if (outcome === "coupon-used") {
    return fail("The coupon on this payment was already spent on another approved payment. Decline it and ask the student to pay without the coupon.", 409);
  }

  if (outcome === "already-processed") {
    // Someone else decided it in the meantime: an approval is the same
    // outcome, anything else is reported.
    const current = await prisma.coursePaymentSubmission.findUnique({ where: { id: submissionId }, select: { status: true, statusEnum: true } });
    if (current && submissionStatusOf(current) === "APPROVED") {
      return done(true);
    }
    return fail("This payment has already been processed.", 409);
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

  return done(false);
}

/**
 * Declines a pending fee payment: clears its payment details, removes the
 * screenshot and e-mails the student a link to pay again (both after the
 * response).
 */
export async function declineFeePayment(
  submissionId: string,
): Promise<PaymentActionResult<{ userId: string; courseId: string }>> {
  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findUnique({
      where: { id: submissionId },
      include: { user: { select: { email: true, name: true } } },
    }), "Database operation failed");

  if (!submission) {
    return fail("Payment submission not found.", 404);
  }

  if (submissionStatusOf(submission) !== "PENDING_VERIFICATION") {
    return fail("Only pending payments can be declined.", 409);
  }

  const course = await getCourseById(submission.courseId);
  if (!course) {
    return fail("Course not found.", 404);
  }

  // The same guarded claim as approval: a decline that loses the race to an
  // approval (or to another decline) changes nothing.
  const claimed = await withDbErrorHandling(() => prisma.coursePaymentSubmission.updateMany({
      where: { id: submissionId, statusEnum: "PENDING_VERIFICATION", deletedAt: null },
      data: {
        ...submissionStatusData("DECLINED"),
        upiTransactionId: null,
        paymentScreenshotPath: null,
        paymentMethod: null,
        paymentMethodEnum: null,
      },
    }), "Database operation failed");
  if (claimed.count === 0) {
    return fail("This payment has already been processed.", 409);
  }

  // The row no longer points at the screenshot; remove the object too, after
  // the response (best effort: a leftover is logged, never fatal).
  const screenshotPath = submission.paymentScreenshotPath;
  if (screenshotPath) after(() => deleteUpload("payment-screenshot", screenshotPath));

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

  return { ok: true, userId: submission.userId, courseId: submission.courseId };
}

/**
 * Voids an approved fee payment: the PaymentRecord is marked voided (kept for
 * audit), the submission is soft-deleted, and both are written to the audit
 * log with the admin's reason. Nothing is hard-deleted.
 *
 * A voided enrollment fee reopens the enrollment (back to awaiting its fee,
 * so the student loses access and can pay again; the roll number is kept,
 * because roll numbers are never reused), and a coupon the payment used is
 * given back. Both are audited.
 */
export async function voidFeePayment(
  actor: Session,
  submissionId: string,
  reason: string | undefined,
): Promise<PaymentActionResult<{ userId: string; courseId: string }>> {
  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return fail(REASON_REQUIRED, 400);
  }

  const submission = await withDbErrorHandling(() => prisma.coursePaymentSubmission.findUnique({
      where: { id: submissionId },
    }), "Database operation failed");

  if (!submission || submission.deletedAt) {
    return fail("Payment submission not found.", 404);
  }

  if (submissionStatusOf(submission) !== "APPROVED") {
    return fail("Only approved payments can be voided.", 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (submission.paymentRecordId) {
        await voidPaymentRecordTx(tx, actor, submission.paymentRecordId, normalizedReason);
      }
      await softDeleteSubmissionTx(tx, actor, submissionId, normalizedReason);

      if (paymentTypeOf(submission) === "ENROLLMENT") {
        const enrollment = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId: submission.userId, courseId: submission.courseId } },
          select: { id: true, status: true, statusEnum: true, rollNumber: true },
        });
        const reopened = enrollment
          ? await tx.enrollment.updateMany({
              where: { id: enrollment.id, statusEnum: { in: ["ACTIVE", "COMPLETED"] } },
              data: enrollmentStatusData("AWAITING_ENROLLMENT_FEE"),
            })
          : { count: 0 };
        if (enrollment && reopened.count > 0) {
          await recordAudit(tx, actor, {
            action: "update",
            entity: "Enrollment",
            entityId: enrollment.id,
            reason: normalizedReason,
            before: { status: enrollmentStatusOf(enrollment), rollNumber: enrollment.rollNumber },
            after: { status: "AWAITING_ENROLLMENT_FEE", rollNumber: enrollment.rollNumber },
          });
        }
      }

      if (submission.couponId && (await releaseCouponTx(tx, submission.userId, submission.couponId))) {
        await recordAudit(tx, actor, {
          action: "restore",
          entity: "Coupon",
          entityId: submission.couponId,
          reason: normalizedReason,
          after: { userId: submission.userId, releasedBySubmission: submissionId },
        });
      }
    });
  } catch (error) {
    if (error instanceof VoidError) return fail(error.message, 409);
    throw error;
  }

  return { ok: true, userId: submission.userId, courseId: submission.courseId };
}

/**
 * Voids a manually recorded payment (kept for audit; excluded from finance).
 * A fee payment or a book order's payment has its own void flow, which also
 * undoes the submission or the order; voiding only the record here would
 * leave those approved with no income behind them.
 */
export async function voidManualPayment(
  actor: Session,
  recordId: string,
  reason: string | undefined,
): Promise<PaymentActionResult<{ userId: string }>> {
  const normalizedReason = normalizeReason(reason);
  if (!normalizedReason) {
    return fail(REASON_REQUIRED, 400);
  }

  const record = await withDbErrorHandling(
    () => prisma.paymentRecord.findUnique({ where: { id: recordId }, include: { submission: { select: { id: true } } } }),
    "Database operation failed",
  );

  if (!record || record.voidedAt) {
    return fail("Payment record not found.", 404);
  }
  if (record.submission) {
    return fail("This is a fee payment, not a manual record. Void it from Completed Payments so its submission is undone too.", 409);
  }
  if (record.bookOrderId) {
    return fail("This is a book order's payment, not a manual record. Refund the order from the Bookstore orders page instead.", 409);
  }

  try {
    await prisma.$transaction((tx) => voidPaymentRecordTx(tx, actor, recordId, normalizedReason));
  } catch (error) {
    if (error instanceof VoidError) return fail(error.message, 409);
    throw error;
  }

  return { ok: true, userId: record.userId };
}
