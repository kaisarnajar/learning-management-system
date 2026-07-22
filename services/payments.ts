import type { PaymentRecord } from "@prisma/client";
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
import { createCoursePaymentSubmission } from "@/services/payment-submission";
import { AWAITING_ENROLLMENT_FEE } from "@/services/enrollment-status";

export async function getPaymentRecordById(id: string) {
  return withDbErrorHandling(() => prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, address: true, whatsapp: true },
        },
        submission: {
          select: { paymentMethod: true, upiTransactionId: true, label: true },
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

export async function processMonthlyPayment(
  userId: string,
  courseId: string,
  paymentMonth: string,
  paymentYear: string,
  paymentMethod: string | null,
  upiTransactionId: string | null,
  screenshotFile: File | null,
  paymentType?: string
) {
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

  const duplicatePending = await prisma.coursePaymentSubmission.findFirst({
    where: {
      userId,
      courseId: course.id,
      label,
      status: { in: [MONTHLY_PAYMENT_PENDING, "approved"] },
    },
  });

  if (duplicatePending) {
    return {
      error: duplicatePending.status === "approved"
        ? `Payment for ${label} is already recorded.`
        : `A payment for ${label} is already awaiting verification.`,
      status: 400,
    };
  }

  const baseAmountInrPaise = getMonthlyFeePaise(course);
  
  const { getBestApplicableCoupon, calculateDiscountedAmount } = await import("@/services/coupons");
  const coupon = await getBestApplicableCoupon(userId, courseId, "course");
  const amountInrPaise = coupon ? calculateDiscountedAmount(baseAmountInrPaise, coupon.percentage) : baseAmountInrPaise;
  const isFree = amountInrPaise === 0;

  const submissionResult = await createCoursePaymentSubmission({
    userId,
    courseId: course.id,
    paymentType: derivedPaymentType,
    label,
    amountInrPaise,
    status: isFree ? MONTHLY_PAYMENT_APPROVED : MONTHLY_PAYMENT_PENDING,
    paymentMethod: isFree ? "waiver" : paymentMethod,
    upiTransactionId: isFree ? "FEE-WAIVER" : upiTransactionId,
    screenshotFile: isFree ? null : screenshotFile,
  });

  if (submissionResult.error) return { error: submissionResult.error, status: 400 };

  if (isFree && submissionResult.createdId) {
    // Auto-create PaymentRecord for 100% waiver
    const record = await prisma.paymentRecord.create({
      data: {
        userId,
        courseId,
        amountInrPaise: 0,
        paidAt: new Date(),
        paymentType: derivedPaymentType,
        description: label + " (100% Fee Waiver)",
      },
    });

    await prisma.coursePaymentSubmission.update({
      where: { id: submissionResult.createdId },
      data: { paymentRecordId: record.id },
    });
  }

  return { success: true };
}

export async function processEnrollmentPayment(
  userId: string,
  courseId: string,
  paymentMethod: string | null,
  upiTransactionId: string | null,
  screenshotFile: File | null
) {
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
  });

  if (duplicatePending) {
    return {
      error: duplicatePending.status === MONTHLY_PAYMENT_APPROVED
        ? "Your enrollment fee is already recorded."
        : "Your enrollment fee payment is already awaiting verification.",
      status: 400,
    };
  }

  const { getBestApplicableCoupon, calculateDiscountedAmount } = await import("@/services/coupons");
  const coupon = await getBestApplicableCoupon(userId, courseId, "enrollment");
  const enrollmentFeePaise = coupon ? calculateDiscountedAmount(baseEnrollmentFeePaise, coupon.percentage) : baseEnrollmentFeePaise;
  const isFree = enrollmentFeePaise === 0;

  if (upiTransactionId && !isFree) {
    const duplicateUtr = await prisma.coursePaymentSubmission.findFirst({
      where: { upiTransactionId },
    });
    if (duplicateUtr) {
      return { error: "This transaction reference was already used. Contact support if this is a mistake.", status: 400 };
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    // If it's free, auto-approve the enrollment right away
    const newStatus = isFree ? (await import("@/services/enrollments")).getRosterEnrollmentStatusForCourse(course.status) : AWAITING_ENROLLMENT_FEE;

    await tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, status: newStatus },
      update: { status: newStatus },
    });

    return tx.coursePaymentSubmission.create({
      data: {
        userId,
        courseId,
        paymentType: PAYMENT_TYPE_ENROLLMENT,
        label,
        amountInrPaise: enrollmentFeePaise,
        status: isFree ? MONTHLY_PAYMENT_APPROVED : MONTHLY_PAYMENT_PENDING,
        paymentMethod: isFree ? "waiver" : paymentMethod,
        upiTransactionId: isFree ? "FEE-WAIVER" : upiTransactionId,
      },
    });
  });

  await prisma.coursePaymentSubmission.update({
    where: { id: created.id },
    data: { paymentReference: created.id },
  });

  if (screenshotFile && screenshotFile.size > 0 && !isFree) {
    const { savePaymentScreenshot } = await import("@/services/payment-upload");
    const paymentScreenshotPath = await savePaymentScreenshot(created.id, screenshotFile);
    await prisma.coursePaymentSubmission.update({
      where: { id: created.id },
      data: { paymentScreenshotPath },
    });
  }

  if (isFree) {
    // Auto-create PaymentRecord for 100% waiver
    await prisma.paymentRecord.create({
      data: {
        userId,
        courseId,
        amountInrPaise: 0,
        paidAt: new Date(),
        paymentType: PAYMENT_TYPE_ENROLLMENT,
        description: label + " (100% Fee Waiver)",
      },
    });
    
    // Assign roll number if active
    const { getRosterEnrollmentStatusForCourse } = await import("@/services/enrollments");
    if (getRosterEnrollmentStatusForCourse(course.status) === "active") {
      const activeEnrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true },
      });
      if (activeEnrollment) {
        const { assignRollNumber } = await import("@/services/roll-numbers");
        await assignRollNumber(activeEnrollment.id, courseId);
      }
    }
  }

  return { success: true };
}
