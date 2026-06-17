import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyFeePaise } from "@/lib/course-pricing";
import { getCourseById } from "@/lib/courses";
import {
  buildMonthlyFeeLabel,
} from "@/lib/monthly-payments";
import {
  MONTHLY_PAYMENT_PENDING,
  PAYMENT_TYPE_MONTHLY,
} from "@/lib/monthly-payment-status";
import { savePaymentScreenshot, validatePaymentScreenshot } from "@/lib/payment-upload";
import { prisma } from "@/lib/prisma";
import { isUpiConfigured } from "@/lib/upi";
import { monthlyPaymentSubmitSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (!(await isUpiConfigured())) {
    return NextResponse.json(
      { error: "Online payments are not configured yet. Please contact the academy." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const parsed = monthlyPaymentSubmitSchema.safeParse({
      courseId: formData.get("courseId"),
      paymentMonth: formData.get("paymentMonth"),
      paymentYear: formData.get("paymentYear"),
      paymentMethod: formData.get("paymentMethod"),
      upiTransactionId: formData.get("upiTransactionId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payment details." },
        { status: 400 },
      );
    }

    const screenshot = formData.get("screenshot");
    const screenshotFile = screenshot instanceof File ? screenshot : null;
    const screenshotValidation = validatePaymentScreenshot(screenshotFile);
    if (screenshotValidation.error) {
      return NextResponse.json({ error: screenshotValidation.error }, { status: 400 });
    }

    const course = await getCourseById(parsed.data.courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId: course.id },
      },
    });

    if (!enrollment || (enrollment.status !== "active" && enrollment.status !== "completed")) {
      return NextResponse.json(
        { error: "You must be enrolled and approved in this course before paying monthly fees." },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          error:
            duplicatePending.status === "approved"
              ? `Payment for ${label} is already recorded.`
              : `A payment for ${label} is already awaiting verification.`,
        },
        { status: 400 },
      );
    }

    const duplicateUtrSubmission = await prisma.coursePaymentSubmission.findFirst({
      where: { upiTransactionId: parsed.data.upiTransactionId },
    });

    if (duplicateUtrSubmission) {
      return NextResponse.json(
        { error: "This transaction reference was already used. Contact support if this is a mistake." },
        { status: 400 },
      );
    }

    const created = await prisma.coursePaymentSubmission.create({
      data: {
        userId: session.user.id,
        courseId: course.id,
        paymentType: PAYMENT_TYPE_MONTHLY,
        label,
        amountInrPaise: getMonthlyFeePaise(course),
        status: MONTHLY_PAYMENT_PENDING,
        paymentMethod: parsed.data.paymentMethod,
        upiTransactionId: parsed.data.upiTransactionId,
      },
    });

    await prisma.coursePaymentSubmission.update({
      where: { id: created.id },
      data: { paymentReference: created.id },
    });

    if (screenshotFile && screenshotFile.size > 0) {
      const paymentScreenshotPath = await savePaymentScreenshot(created.id, screenshotFile);
      await prisma.coursePaymentSubmission.update({
        where: { id: created.id },
        data: { paymentScreenshotPath },
      });
    }

    return NextResponse.json({
      redirectUrl: "/profile/payments?submitted=1",
      message: "Thank you! We will verify your monthly fee payment shortly.",
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) { throw error; }
    console.error("Caught error:", error);
    return NextResponse.json({ error: "Could not submit payment. Please try again." }, { status: 500 });
    }
}
