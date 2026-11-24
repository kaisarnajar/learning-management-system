import type { PaymentRecord, Prisma } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { getMonthlyFeePaise, getRegistrationFeePaise } from "@/services/course-pricing";
import { getCourseById } from "@/services/courses";
import { buildMonthlyFeeLabel, buildEnrollmentFeeLabel } from "@/services/monthly-payments";
import { getFeeFrequencyPaymentType } from "@/services/fee-frequency";
import { buildPeriodKey } from "@/services/payment-period";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollments";
import { PAYMENT_PROOF_REQUIRED_MESSAGE, PAYMENTS } from "@/config/constants/payments";
import {
  enrollmentStatusData,
  enrollmentStatusOf,
  isApprovedEnrollment,
  paymentMethodWrite,
  paymentTypeData,
  paymentTypeFromText,
  paymentTypeWrite,
  submissionStatusData,
  submissionStatusOf,
} from "@/services/status-compat";
import {
  calculateDiscountedAmount,
  CouponAlreadyUsedError,
  getSelectedCoupon,
  recordCouponUsageTx,
  reserveCouponTx,
} from "@/services/coupons";
import { deletePaymentScreenshot, savePaymentScreenshot } from "@/services/payment-upload";
import { isUploadError } from "@/services/storage";
import { assignRollNumberTx } from "@/services/roll-numbers";
import { getPaymentSettings } from "@/services/payment-settings";
import { getCourseEnrollmentClosedMessage } from "@/services/course-status";
import { isUserProfileComplete } from "@/services/profile";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import { isUtrUsed, normalizeUtr, WAIVER_TRANSACTION_REF } from "@/services/utr";

const AMOUNT_MISMATCH_MESSAGE =
  "The payable amount has changed (for example a coupon is no longer available). Please refresh the page and try again.";
const DUPLICATE_UTR_MESSAGE =
  "This transaction reference was already used. Contact support if this is a mistake.";

/** Written for 100 % fee waivers (no money changes hands), with WAIVER_TRANSACTION_REF. */
export const WAIVER_PAYMENT_METHOD = "waiver";

type SubmissionTx = Prisma.TransactionClient;

export type ProcessPaymentResult =
  | { success: true; error?: never; status?: never }
  | { success?: never; error: string; status: number };

/** Thrown inside the submission transaction to abort with a user-facing message. */
class SubmissionRejected extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export async function getPaymentRecordById(id: string) {
  return withDbErrorHandling(() => prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, address: true, whatsapp: true },
        },
        submission: {
          select: { paymentMethod: true, upiTransactionId: true, label: true, couponId: true },
        },
      },
    }), "Database operation failed");
}

export async function getPaymentRecordsForUserPaginated(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<PaymentRecord>> {
  const where = { userId, voidedAt: null };
  const totalCount = await withDbErrorHandling(() => prisma.paymentRecord.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.paymentRecord.findMany({
      where,
      orderBy: { paidAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getPaymentSubmissionsForUser(userId: string) {
  return withDbErrorHandling(() => prisma.coursePaymentSubmission.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}

/**
 * Uploads the screenshot BEFORE the transaction (object storage cannot take
 * part in a DB transaction). The caller deletes it again if the transaction
 * fails, so a failed submission never leaves an orphan object.
 */
/** Stores the screenshot; a refused file becomes a SubmissionRejected so callers answer 400. */
async function uploadScreenshot(prefix: string, file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  try {
    return await savePaymentScreenshot(prefix, file);
  } catch (error) {
    if (isUploadError(error)) throw new SubmissionRejected(error.message, 400);
    throw error;
  }
}

/** A fee that costs money is only verifiable with a UTR or a screenshot. */
function missingPaymentProof(isFree: boolean, upiTransactionId: string | null, screenshotFile: File | null): boolean {
  return !isFree && !upiTransactionId && !(screenshotFile && screenshotFile.size > 0);
}

/** A reference already backing a fee submission or a book order, in any case, is refused. */
async function assertUtrNotReused(tx: SubmissionTx, upiTransactionId: string | null, isFree: boolean) {
  if (isFree) return;
  if (await isUtrUsed(tx, upiTransactionId)) throw new SubmissionRejected(DUPLICATE_UTR_MESSAGE, 409);
}

function mapSubmissionError(error: unknown): { error: string; status: number } | null {
  if (error instanceof SubmissionRejected) return { error: error.message, status: error.status };
  if (error instanceof CouponAlreadyUsedError) return { error: error.message, status: 409 };
  if (isUniqueViolation(error)) {
    // Partial unique indexes: same UTR reused, or same fee period submitted twice.
    return { error: "This payment appears to have been submitted already. Please refresh and check your payment history.", status: 409 };
  }
  return null;
}

export async function processMonthlyPayment(
  userId: string,
  courseId: string,
  paymentMonth: string,
  paymentYear: string,
  paymentMethod: string | null,
  upiTransactionId: string | null,
  screenshotFile: File | null,
  couponId?: string | null,
  expectedAmountPaise?: number | null,
): Promise<ProcessPaymentResult> {
  upiTransactionId = normalizeUtr(upiTransactionId);
  const course = await getCourseById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };

  const derivedPaymentType = getFeeFrequencyPaymentType(course.feeFrequency);

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (!enrollment || !isApprovedEnrollment(enrollment)) {
    return { error: "You must be enrolled and approved in this course before paying course fees.", status: 400 };
  }

  const label = buildMonthlyFeeLabel(paymentMonth, paymentYear, derivedPaymentType);
  const derivedType = paymentTypeFromText(derivedPaymentType);
  const periodKey = derivedType ? buildPeriodKey(derivedType, Number.parseInt(paymentMonth, 10), Number.parseInt(paymentYear, 10)) : null;
  const baseAmountInrPaise = getMonthlyFeePaise(course);

  const coupon = await getSelectedCoupon(userId, courseId, "course", couponId);
  const amountInrPaise = coupon ? calculateDiscountedAmount(baseAmountInrPaise, coupon.percentage) : baseAmountInrPaise;
  if (expectedAmountPaise != null && expectedAmountPaise !== amountInrPaise) {
    return { error: AMOUNT_MISMATCH_MESSAGE, status: 409 };
  }
  const isFree = amountInrPaise === 0;
  if (missingPaymentProof(isFree, upiTransactionId, screenshotFile)) return { error: PAYMENT_PROOF_REQUIRED_MESSAGE, status: 400 };
  // A fully waived fee is auto-approved only when the academy opted in;
  // otherwise it queues for admin confirmation like any other payment.
  const autoApprove = isFree && (await getPaymentSettings()).autoApproveFullWaivers;
  const finalLabel = coupon && !label.includes("Waiver") ? `${label} (${coupon.percentage}% Fee Waiver)` : label;

  // One live submission per billing period, whatever coupon text the label
  // carries. Rows written before periodKey existed (and not yet backfilled)
  // are matched by their label without the coupon suffix. Checked outside
  // the transaction for a friendly message; the partial unique indexes on
  // the period key and the label are the real guard.
  const duplicatePending = await prisma.coursePaymentSubmission.findFirst({
    where: {
      userId,
      courseId: course.id,
      deletedAt: null,
      status: { in: [PAYMENTS.SUBMISSION_STATUS.PENDING, PAYMENTS.SUBMISSION_STATUS.APPROVED] },
      OR: [...(periodKey ? [{ periodKey }] : []), { periodKey: null, label: { startsWith: label } }],
    },
    select: { status: true, statusEnum: true },
  });
  if (duplicatePending) {
    return {
      error: submissionStatusOf(duplicatePending) === "APPROVED"
        ? `Payment for ${label} is already recorded.`
        : `A payment for ${label} is already awaiting verification.`,
      status: 409,
    };
  }

  let screenshotPath: string | null = null;
  try {
    screenshotPath = isFree ? null : await uploadScreenshot(`fee-${userId}`, screenshotFile);
  } catch (error) {
    const mapped = mapSubmissionError(error);
    if (mapped) return mapped;
    throw error;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await assertUtrNotReused(tx, upiTransactionId, isFree);
      // The pending submission holds the coupon; it is spent on approval.
      if (coupon) await reserveCouponTx(tx, userId, coupon.id);

      const submission = await tx.coursePaymentSubmission.create({
        data: {
          userId,
          courseId: course.id,
          ...paymentTypeWrite(derivedPaymentType),
          label: finalLabel,
          periodKey,
          baseFeePaise: baseAmountInrPaise,
          amountInrPaise,
          ...submissionStatusData(autoApprove ? "APPROVED" : "PENDING_VERIFICATION"),
          ...paymentMethodWrite(isFree ? WAIVER_PAYMENT_METHOD : paymentMethod),
          upiTransactionId: isFree ? WAIVER_TRANSACTION_REF : upiTransactionId,
          paymentScreenshotPath: screenshotPath,
          couponId: coupon?.id ?? null,
        },
      });
      await tx.coursePaymentSubmission.update({
        where: { id: submission.id },
        data: { paymentReference: submission.id },
      });

      if (autoApprove) {
        if (coupon) await recordCouponUsageTx(tx, userId, coupon.id);
        // 100 % waiver with auto-approval enabled: nothing to verify, record it immediately.
        const record = await tx.paymentRecord.create({
          data: {
            userId,
            courseId,
            amountInrPaise: 0,
            paidAt: new Date(),
            ...paymentTypeWrite(derivedPaymentType),
            description: `${label} (100% Fee Waiver)`,
          },
        });
        await tx.coursePaymentSubmission.update({
          where: { id: submission.id },
          data: { paymentRecordId: record.id },
        });
      }
    });
  } catch (error) {
    if (screenshotPath) await deletePaymentScreenshot(screenshotPath);
    const mapped = mapSubmissionError(error);
    if (mapped) return mapped;
    throw error;
  }

  return { success: true };
}

export async function processEnrollmentPayment(
  userId: string,
  courseId: string,
  paymentMethod: string | null,
  upiTransactionId: string | null,
  screenshotFile: File | null,
  couponId?: string | null,
  expectedAmountPaise?: number | null,
): Promise<ProcessPaymentResult> {
  upiTransactionId = normalizeUtr(upiTransactionId);
  const course = await getCourseById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };

  const baseEnrollmentFeePaise = getRegistrationFeePaise(course);
  if (baseEnrollmentFeePaise <= 0) return { error: "This course has no enrollment fee.", status: 400 };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (enrollment && isApprovedEnrollment(enrollment)) {
    return { error: "You are already enrolled and approved in this course.", status: 400 };
  }
  // The fee is paid for an enrollment the student has started (startEnrollment
  // checks the course is open and the profile complete). A rejected, pending
  // or missing enrollment cannot be paid into the queue, or straight to ACTIVE
  // with an auto-approved waiver.
  if (!enrollment || enrollmentStatusOf(enrollment) !== "AWAITING_ENROLLMENT_FEE") {
    return { error: "Start your enrollment in this course before paying the enrollment fee.", status: 400 };
  }
  // Both may have changed since the enrollment was started.
  const closed = getCourseEnrollmentClosedMessage(course.status);
  if (closed) return { error: closed, status: 400 };
  if (!(await isUserProfileComplete(userId))) {
    return { error: "Please complete your profile before paying the enrollment fee.", status: 400 };
  }

  const label = buildEnrollmentFeeLabel(course.title);

  const duplicatePending = await prisma.coursePaymentSubmission.findFirst({
    where: {
      userId,
      courseId,
      paymentType: PAYMENTS.TYPES.ENROLLMENT,
      deletedAt: null,
      status: { in: [PAYMENTS.SUBMISSION_STATUS.PENDING, PAYMENTS.SUBMISSION_STATUS.APPROVED] },
    },
    select: { status: true, statusEnum: true },
  });

  if (duplicatePending) {
    return {
      error: submissionStatusOf(duplicatePending) === "APPROVED"
        ? "Your enrollment fee is already recorded."
        : "Your enrollment fee payment is already awaiting verification.",
      status: 400,
    };
  }

  const coupon = await getSelectedCoupon(userId, courseId, "enrollment", couponId);
  const enrollmentFeePaise = coupon ? calculateDiscountedAmount(baseEnrollmentFeePaise, coupon.percentage) : baseEnrollmentFeePaise;
  if (expectedAmountPaise != null && expectedAmountPaise !== enrollmentFeePaise) {
    return { error: AMOUNT_MISMATCH_MESSAGE, status: 409 };
  }
  const isFree = enrollmentFeePaise === 0;
  if (missingPaymentProof(isFree, upiTransactionId, screenshotFile)) return { error: PAYMENT_PROOF_REQUIRED_MESSAGE, status: 400 };
  const autoApprove = isFree && (await getPaymentSettings()).autoApproveFullWaivers;
  const finalLabel = coupon && !label.includes("Waiver") ? `${label} (${coupon.percentage}% Fee Waiver)` : label;

  let screenshotPath: string | null = null;
  try {
    screenshotPath = isFree ? null : await uploadScreenshot(`enrollment-${userId}`, screenshotFile);
  } catch (error) {
    const mapped = mapSubmissionError(error);
    if (mapped) return mapped;
    throw error;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await assertUtrNotReused(tx, upiTransactionId, isFree);
      // The pending submission holds the coupon; it is spent on approval.
      if (coupon) await reserveCouponTx(tx, userId, coupon.id);

      // Auto-approved waivers activate the enrollment immediately; everything
      // else (paid, or waived without auto-approval) waits for the admin.
      const rosterStatus = getRosterEnrollmentStatusForCourse(course.status);
      const newStatus = autoApprove ? rosterStatus : "AWAITING_ENROLLMENT_FEE";

      // Guarded on the status read above, so an admin rejecting the enrollment
      // meanwhile is not overwritten.
      const moved = await tx.enrollment.updateMany({
        where: { id: enrollment.id, status: ENROLLMENT_STATUS.AWAITING_FEE },
        data: enrollmentStatusData(newStatus),
      });
      if (moved.count === 0) {
        throw new SubmissionRejected("Your enrollment is no longer awaiting the enrollment fee. Please refresh and try again.");
      }

      const submission = await tx.coursePaymentSubmission.create({
        data: {
          userId,
          courseId,
          ...paymentTypeData("ENROLLMENT"),
          label: finalLabel,
          periodKey: buildPeriodKey("ENROLLMENT", 0, 0),
          baseFeePaise: baseEnrollmentFeePaise,
          amountInrPaise: enrollmentFeePaise,
          ...submissionStatusData(autoApprove ? "APPROVED" : "PENDING_VERIFICATION"),
          ...paymentMethodWrite(isFree ? WAIVER_PAYMENT_METHOD : paymentMethod),
          upiTransactionId: isFree ? WAIVER_TRANSACTION_REF : upiTransactionId,
          paymentScreenshotPath: screenshotPath,
          couponId: coupon?.id ?? null,
        },
      });
      await tx.coursePaymentSubmission.update({
        where: { id: submission.id },
        data: { paymentReference: submission.id },
      });

      if (autoApprove) {
        if (coupon) await recordCouponUsageTx(tx, userId, coupon.id);
        const record = await tx.paymentRecord.create({
          data: {
            userId,
            courseId,
            amountInrPaise: 0,
            paidAt: new Date(),
            ...paymentTypeData("ENROLLMENT"),
            description: `${label} (100% Fee Waiver)`,
          },
        });
        await tx.coursePaymentSubmission.update({
          where: { id: submission.id },
          data: { paymentRecordId: record.id },
        });
        if (rosterStatus === "ACTIVE") {
          await assignRollNumberTx(tx, enrollment.id, courseId);
        }
      }
    });
  } catch (error) {
    if (screenshotPath) await deletePaymentScreenshot(screenshotPath);
    const mapped = mapSubmissionError(error);
    if (mapped) return mapped;
    throw error;
  }

  return { success: true };
}
