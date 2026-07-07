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
  paymentType?: string // kept for backward compat but now ignored — derived from course
) {
  const course = await getCourseById(courseId);
  if (!course) return { error: "Course not found.", status: 404 };

  // Always use the course-configured fee frequency — student cannot override it
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

  const amountInrPaise = getMonthlyFeePaise(course);

  const submissionResult = await createCoursePaymentSubmission({
    userId,
    courseId: course.id,
    paymentType: derivedPaymentType,
    label,
    amountInrPaise,
    status: MONTHLY_PAYMENT_PENDING,
    paymentMethod,
    upiTransactionId,
    screenshotFile,
  });

  if (submissionResult.error) return { error: submissionResult.error, status: 400 };

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

  const enrollmentFeePaise = getRegistrationFeePaise(course);
  if (enrollmentFeePaise <= 0) return { error: "This course has no enrollment fee.", status: 400 };

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

  if (upiTransactionId) {
    const duplicateUtr = await prisma.coursePaymentSubmission.findFirst({
      where: { upiTransactionId },
    });
    if (duplicateUtr) {
      return { error: "This transaction reference was already used. Contact support if this is a mistake.", status: 400 };
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, status: AWAITING_ENROLLMENT_FEE },
      update: { status: AWAITING_ENROLLMENT_FEE },
    });

    return tx.coursePaymentSubmission.create({
      data: {
        userId,
        courseId,
        paymentType: PAYMENT_TYPE_ENROLLMENT,
        label,
        amountInrPaise: enrollmentFeePaise,
        status: MONTHLY_PAYMENT_PENDING,
        paymentMethod,
        upiTransactionId,
      },
    });
  });

  await prisma.coursePaymentSubmission.update({
    where: { id: created.id },
    data: { paymentReference: created.id },
  });

  if (screenshotFile && screenshotFile.size > 0) {
    const { savePaymentScreenshot } = await import("@/services/payment-upload");
    const paymentScreenshotPath = await savePaymentScreenshot(created.id, screenshotFile);
    await prisma.coursePaymentSubmission.update({
      where: { id: created.id },
      data: { paymentScreenshotPath },
    });
  }

  return { success: true };
}
