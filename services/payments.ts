import type { PaymentRecord, Prisma } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { getMonthlyFeePaise, getRegistrationFeePaise } from "@/services/course-pricing";
import { getCourseById } from "@/services/courses";
import { buildMonthlyFeeLabel, buildEnrollmentFeeLabel } from "@/services/monthly-payments";
import { getFeeFrequencyPaymentType } from "@/services/fee-frequency";
import {
  MONTHLY_PAYMENT_PENDING,
  MONTHLY_PAYMENT_APPROVED,
  PAYMENT_TYPE_ENROLLMENT,
} from "@/services/monthly-payment-status";
import { AWAITING_ENROLLMENT_FEE } from "@/services/enrollment-status";
import { getRosterEnrollmentStatusForCourse } from "@/services/enrollments";
import { calculateDiscountedAmount, getSelectedCoupon, recordCouponUsageTx } from "@/services/coupons";
import { deletePaymentScreenshot, savePaymentScreenshot } from "@/services/payment-upload";
import { assignRollNumberTx } from "@/services/roll-numbers";

const AMOUNT_MISMATCH_MESSAGE =
  "The payable amount has changed (for example a coupon is no longer available). Please refresh the page and try again.";
const DUPLICATE_UTR_MESSAGE =
  "This transaction reference was already used. Contact support if this is a mistake.";

/** Sentinel values written for 100 % fee waivers (no money changes hands). */
export const WAIVER_PAYMENT_METHOD = "waiver";
export const WAIVER_TRANSACTION_REF = "FEE-WAIVER";

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
  const where = { userId };
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
      where: { userId },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");
}

/**
 * Uploads the screenshot BEFORE the transaction (object storage cannot take
 * part in a DB transaction). The caller deletes it again if the transaction
 * fails, so a failed submission never leaves an orphan object.
 */
async function uploadScreenshot(prefix: string, file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  return savePaymentScreenshot(`${prefix}-${Date.now()}`, file);
}

async function assertUtrNotReused(tx: SubmissionTx, upiTransactionId: string | null, isFree: boolean) {
  if (!upiTransactionId || isFree || upiTransactionId === WAIVER_TRANSACTION_REF) return;
  const duplicate = await tx.coursePaymentSubmission.findFirst({
    where: { upiTransactionId },
    select: { id: true },
  });
  if (duplicate) throw new SubmissionRejected(DUPLICATE_UTR_MESSAGE);
}

function mapSubmissionError(error: unknown): { error: string; status: number } | null {
  if (error instanceof SubmissionRejected) return { error: error.message, status: error.status };
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
  const course = await getCourseById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };

  const derivedPaymentType = getFeeFrequencyPaymentType(course.feeFrequency);

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } },
  });

  if (!enrollment || (enrollment.status !== "active" && enrollment.status !== "completed")) {
    return { error: "You must be enrolled and approved in this course before paying course fees.", status: 400 };
  }

  const label = buildMonthlyFeeLabel(paymentMonth, paymentYear, derivedPaymentType);
  const baseAmountInrPaise = getMonthlyFeePaise(course);

  const coupon = await getSelectedCoupon(userId, courseId, "course", couponId);
  const amountInrPaise = coupon ? calculateDiscountedAmount(baseAmountInrPaise, coupon.percentage) : baseAmountInrPaise;
  if (expectedAmountPaise != null && expectedAmountPaise !== amountInrPaise) {
    return { error: AMOUNT_MISMATCH_MESSAGE, status: 409 };
  }
  const isFree = amountInrPaise === 0;
  const finalLabel = coupon && !label.includes("Waiver") ? `${label} (${coupon.percentage}% Fee Waiver)` : label;

  // Cheap pre-check outside the transaction for a friendly message; the
  // partial unique index on (userId, courseId, label) is the real guard.
  const duplicatePending = await prisma.coursePaymentSubmission.findFirst({
    where: {
      userId,
      courseId: course.id,
      label: { in: [label, finalLabel] },
      status: { in: [MONTHLY_PAYMENT_PENDING, MONTHLY_PAYMENT_APPROVED] },
    },
    select: { status: true },
  });
  if (duplicatePending) {
    return {
      error: duplicatePending.status === MONTHLY_PAYMENT_APPROVED
        ? `Payment for ${label} is already recorded.`
        : `A payment for ${label} is already awaiting verification.`,
      status: 400,
    };
  }

  const screenshotPath = isFree ? null : await uploadScreenshot(`fee-${userId}`, screenshotFile);

  try {
    await prisma.$transaction(async (tx) => {
      await assertUtrNotReused(tx, upiTransactionId, isFree);

      const submission = await tx.coursePaymentSubmission.create({
        data: {
          userId,
          courseId: course.id,
          paymentType: derivedPaymentType,
          label: finalLabel,
          amountInrPaise,
          status: isFree ? MONTHLY_PAYMENT_APPROVED : MONTHLY_PAYMENT_PENDING,
          paymentMethod: isFree ? WAIVER_PAYMENT_METHOD : paymentMethod,
          upiTransactionId: isFree ? WAIVER_TRANSACTION_REF : upiTransactionId,
          paymentScreenshotPath: screenshotPath,
          couponId: coupon?.id ?? null,
        },
      });
      await tx.coursePaymentSubmission.update({
        where: { id: submission.id },
        data: { paymentReference: submission.id },
      });

      if (coupon) {
        await recordCouponUsageTx(tx, userId, coupon.id);
      }

      if (isFree) {
        // 100 % waiver: nothing to verify, record it immediately.
        const record = await tx.paymentRecord.create({
          data: {
            userId,
            courseId,
            amountInrPaise: 0,
            paidAt: new Date(),
            paymentType: derivedPaymentType,
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
  const course = await getCourseById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };

  const baseEnrollmentFeePaise = getRegistrationFeePaise(course);
  if (baseEnrollmentFeePaise <= 0) return { error: "This course has no enrollment fee.", status: 400 };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (enrollment?.status === "active" || enrollment?.status === "completed") {
    return { error: "You are already enrolled and approved in this course.", status: 400 };
  }

  const label = buildEnrollmentFeeLabel(course.title);

  const duplicatePending = await prisma.coursePaymentSubmission.findFirst({
    where: {
      userId,
      courseId,
      paymentType: PAYMENT_TYPE_ENROLLMENT,
      status: { in: [MONTHLY_PAYMENT_PENDING, MONTHLY_PAYMENT_APPROVED] },
    },
    select: { status: true },
  });

  if (duplicatePending) {
    return {
      error: duplicatePending.status === MONTHLY_PAYMENT_APPROVED
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
  const finalLabel = coupon && !label.includes("Waiver") ? `${label} (${coupon.percentage}% Fee Waiver)` : label;

  const screenshotPath = isFree ? null : await uploadScreenshot(`enrollment-${userId}`, screenshotFile);

  try {
    await prisma.$transaction(async (tx) => {
      await assertUtrNotReused(tx, upiTransactionId, isFree);

      // Free (100 % waiver) enrollments are activated immediately; paid ones
      // wait for the admin to verify the transfer.
      const rosterStatus = getRosterEnrollmentStatusForCourse(course.status);
      const newStatus = isFree ? rosterStatus : AWAITING_ENROLLMENT_FEE;

      const upserted = await tx.enrollment.upsert({
        where: { userId_courseId: { userId, courseId } },
        create: { userId, courseId, status: newStatus },
        update: { status: newStatus },
      });

      const submission = await tx.coursePaymentSubmission.create({
        data: {
          userId,
          courseId,
          paymentType: PAYMENT_TYPE_ENROLLMENT,
          label: finalLabel,
          amountInrPaise: enrollmentFeePaise,
          status: isFree ? MONTHLY_PAYMENT_APPROVED : MONTHLY_PAYMENT_PENDING,
          paymentMethod: isFree ? WAIVER_PAYMENT_METHOD : paymentMethod,
          upiTransactionId: isFree ? WAIVER_TRANSACTION_REF : upiTransactionId,
          paymentScreenshotPath: screenshotPath,
          couponId: coupon?.id ?? null,
        },
      });
      await tx.coursePaymentSubmission.update({
        where: { id: submission.id },
        data: { paymentReference: submission.id },
      });

      if (coupon) {
        await recordCouponUsageTx(tx, userId, coupon.id);
      }

      if (isFree) {
        const record = await tx.paymentRecord.create({
          data: {
            userId,
            courseId,
            amountInrPaise: 0,
            paidAt: new Date(),
            paymentType: PAYMENT_TYPE_ENROLLMENT,
            description: `${label} (100% Fee Waiver)`,
          },
        });
        await tx.coursePaymentSubmission.update({
          where: { id: submission.id },
          data: { paymentRecordId: record.id },
        });
        if (rosterStatus === "active") {
          await assignRollNumberTx(tx, upserted.id, courseId);
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
