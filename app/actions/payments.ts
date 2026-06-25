"use server";

import { auth } from "@/lib/auth";
import { getMonthlyFeePaise, getRegistrationFeePaise } from "@/lib/course-pricing";
import { getCourseById } from "@/lib/courses";
import { buildMonthlyFeeLabel, buildEnrollmentFeeLabel } from "@/lib/monthly-payments";
import {
  MONTHLY_PAYMENT_PENDING,
  MONTHLY_PAYMENT_APPROVED,
  PAYMENT_TYPE_MONTHLY,
  PAYMENT_TYPE_ENROLLMENT,
} from "@/lib/monthly-payment-status";
import { validatePaymentScreenshot } from "@/lib/payment-upload";
import { prisma } from "@/lib/prisma";
import { isUpiConfigured } from "@/lib/upi";
import { monthlyPaymentSubmitSchema, enrollmentPaymentSubmitSchema } from "@/lib/validations";
import { AWAITING_ENROLLMENT_FEE } from "@/lib/enrollment-status";

export async function submitMonthlyPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in.", status: 401 };
  if (!session.user.emailVerified) return { error: "Please verify your email to submit payments.", status: 403 };
  if (!(await isUpiConfigured())) return { error: "Online payments are not configured yet. Please contact the academy.", status: 503 };

  try {
    const parsed = monthlyPaymentSubmitSchema.safeParse({
      courseId: formData.get("courseId"),
      paymentMonth: formData.get("paymentMonth"),
      paymentYear: formData.get("paymentYear"),
      paymentMethod: formData.get("paymentMethod"),
      upiTransactionId: formData.get("upiTransactionId"),
    });

    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid payment details.", status: 400 };

    const screenshot = formData.get("screenshot");
    const screenshotFile = screenshot instanceof File ? screenshot : null;
    const screenshotValidation = validatePaymentScreenshot(screenshotFile);
    if (screenshotValidation.error) return { error: screenshotValidation.error, status: 400 };

    const course = await getCourseById(parsed.data.courseId);
    if (!course) return { error: "Course not found.", status: 404 };

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
    });

    if (!enrollment || (enrollment.status !== "active" && enrollment.status !== "completed")) {
      return { error: "You must be enrolled and approved in this course before paying monthly fees.", status: 400 };
    }

    const label = buildMonthlyFeeLabel(parsed.data.paymentMonth, parsed.data.paymentYear);

    const duplicatePending = await prisma.coursePaymentSubmission.findFirst({
      where: {
        userId: session.user.id,
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

    const submissionResult = await createCoursePaymentSubmission({
      userId: session.user.id,
      courseId: course.id,
      paymentType: PAYMENT_TYPE_MONTHLY,
      label,
      amountInrPaise: getMonthlyFeePaise(course),
      status: MONTHLY_PAYMENT_PENDING,
      paymentMethod: parsed.data.paymentMethod ?? null,
      upiTransactionId: parsed.data.upiTransactionId ?? null,
      screenshotFile,
    });

    if (submissionResult.error) return { error: submissionResult.error, status: 400 };

    return { redirectUrl: "/profile/payments?submitted=1", message: "Thank you! We will verify your monthly fee payment shortly." };
  } catch (error) {
    console.error("Caught error:", error);
    return { error: "Could not submit payment. Please try again.", status: 500 };
  }
}

export async function submitEnrollmentPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in.", status: 401 };
  if (!session.user.emailVerified) return { error: "Please verify your email to submit payments.", status: 403 };
  if (!(await isUpiConfigured())) return { error: "Online payments are not configured yet. Please contact the academy.", status: 503 };

  try {
    const parsed = enrollmentPaymentSubmitSchema.safeParse({
      courseId: formData.get("courseId"),
      paymentMethod: formData.get("paymentMethod"),
      upiTransactionId: formData.get("upiTransactionId"),
    });

    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid payment details.", status: 400 };

    const screenshot = formData.get("screenshot");
    const screenshotFile = screenshot instanceof File ? screenshot : null;
    const screenshotValidation = validatePaymentScreenshot(screenshotFile);
    if (screenshotValidation.error) return { error: screenshotValidation.error, status: 400 };

    const course = await getCourseById(parsed.data.courseId);
    if (!course) return { error: "Course not found.", status: 404 };

    const enrollmentFeePaise = getRegistrationFeePaise(course);
    if (enrollmentFeePaise <= 0) return { error: "This course has no enrollment fee.", status: 400 };

    const userId = session.user.id;
    const courseId = course.id;

    // Check for an existing enrollment.
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

    // Check for duplicate UPI transaction ID before the transaction.
    if (parsed.data.upiTransactionId) {
      const duplicateUtr = await prisma.coursePaymentSubmission.findFirst({
        where: { upiTransactionId: parsed.data.upiTransactionId },
      });
      if (duplicateUtr) {
        return { error: "This transaction reference was already used. Contact support if this is a mistake.", status: 400 };
      }
    }

    // Atomically upsert the enrollment (to awaiting_enrollment_fee) and create the
    // payment submission. This ensures no enrollment record exists unless the student
    // has actually submitted a payment receipt.
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
          paymentMethod: parsed.data.paymentMethod ?? null,
          upiTransactionId: parsed.data.upiTransactionId ?? null,
        },
      });
    });

    // Set paymentReference to the submission's own ID (done outside transaction to avoid
    // needing the ID before insert).
    await prisma.coursePaymentSubmission.update({
      where: { id: created.id },
      data: { paymentReference: created.id },
    });

    // Save screenshot if provided.
    if (screenshotFile && screenshotFile.size > 0) {
      const { savePaymentScreenshot } = await import("@/lib/payment-upload");
      const paymentScreenshotPath = await savePaymentScreenshot(created.id, screenshotFile);
      await prisma.coursePaymentSubmission.update({
        where: { id: created.id },
        data: { paymentScreenshotPath },
      });
    }

    return { redirectUrl: "/profile/payments?submitted=1" };
  } catch (error) {
    console.error("Caught error:", error);
    return { error: "Could not submit payment. Please try again.", status: 500 };
  }
}

