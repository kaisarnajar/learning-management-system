import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { processMonthlyPayment, processEnrollmentPayment } from "@/services/payments";
import { isUpiConfigured } from "@/services/upi";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  if (!(await isUpiConfigured())) {
    return NextResponse.json(
      { success: false, error: "Online payments are not configured yet. Please contact the academy." },
      { status: 503 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let courseId = "";
    let paymentType = "monthly"; // "enrollment" | "monthly"
    let paymentMonth = 1;
    let paymentYear = new Date().getFullYear();
    let paymentMethod = "UPI";
    let upiTransactionId = "";
    let couponId: string | null = null;
    let screenshotFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      courseId = (formData.get("courseId") as string) || "";
      paymentType = (formData.get("paymentType") as string) || "monthly";
      paymentMonth = parseInt((formData.get("paymentMonth") as string) || "1", 10);
      paymentYear = parseInt((formData.get("paymentYear") as string) || String(new Date().getFullYear()), 10);
      paymentMethod = (formData.get("paymentMethod") as string) || "UPI";
      upiTransactionId = (formData.get("upiTransactionId") as string) || "";
      couponId = (formData.get("couponId") as string) || null;

      const file = formData.get("screenshot");
      if (file instanceof File) {
        screenshotFile = file;
      }
    } else {
      const body = await request.json();
      courseId = body.courseId || "";
      paymentType = body.paymentType || "monthly";
      paymentMonth = body.paymentMonth || 1;
      paymentYear = body.paymentYear || new Date().getFullYear();
      paymentMethod = body.paymentMethod || "UPI";
      upiTransactionId = body.upiTransactionId || "";
      couponId = body.couponId || null;
    }

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Course ID is required." },
        { status: 400 }
      );
    }

    let result;
    if (paymentType === "enrollment") {
      result = await processEnrollmentPayment(
        user.id,
        courseId,
        paymentMethod,
        upiTransactionId,
        screenshotFile,
        couponId
      );
    } else {
      result = await processMonthlyPayment(
        user.id,
        courseId,
        String(paymentMonth),
        String(paymentYear),
        paymentMethod,
        upiTransactionId,
        screenshotFile,
        couponId
      );
    }

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment proof submitted successfully. We will verify your fee payment shortly.",
    });
  } catch (error) {
    console.error("[api/v1/payments/submit] Error:", error);
    return NextResponse.json(
      { success: false, error: "Could not submit payment proof. Please try again." },
      { status: 500 }
    );
  }
}
