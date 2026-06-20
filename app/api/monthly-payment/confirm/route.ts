import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyFeePaise } from "@/lib/course-pricing";
import { getCourseById } from "@/lib/courses";
import { buildMonthlyFeeLabel } from "@/lib/monthly-payments";
import {
  MONTHLY_PAYMENT_PENDING,
  PAYMENT_TYPE_MONTHLY,
} from "@/lib/monthly-payment-status";
import { createCoursePaymentSubmission } from "@/lib/payment-submission";
import { validatePaymentScreenshot } from "@/lib/payment-upload";
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

    if (submissionResult.error) {
      return NextResponse.json({ error: submissionResult.error }, { status: 400 });
    }

    return NextResponse.json({
      redirectUrl: "/profile/payments?submitted=1",
      message: "Thank you! We will verify your monthly fee payment shortly.",
    });
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Caught error:", error);
    return NextResponse.json({ error: "Could not submit payment. Please try again." }, { status: 500 });
  }
}
