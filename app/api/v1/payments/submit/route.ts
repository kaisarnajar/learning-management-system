import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth, requireVerifiedEmail } from "@/services/api-auth";
import { processMonthlyPayment, processEnrollmentPayment } from "@/services/payments";
import { isUpiConfigured } from "@/services/upi";
import { paymentTypeFromText } from "@/services/status-compat";
import { validatePendingUpload } from "@/services/uploads";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";
import { enrollmentPaymentSubmitSchema, monthlyPaymentSubmitSchema } from "@/utils/validations";

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;
  const unverified = requireVerifiedEmail(user, "submit payments");
  if (unverified) return unverified;

  if (!(await isUpiConfigured())) {
    return apiError("Online payments are not configured yet. Please contact the academy.", 503);
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let raw: Record<string, unknown>;
    let screenshotFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      raw = Object.fromEntries(
        [...formData.entries()].filter(([, value]) => typeof value === "string"),
      );
      const file = formData.get("screenshot");
      if (file instanceof File) {
        screenshotFile = file;
      }
    } else {
      const body = await readJson(request);
      if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
      raw = body;
    }

    const courseId = typeof raw.courseId === "string" ? raw.courseId : "";
    if (!courseId) {
      return apiError("Course ID is required.", 400);
    }

    const paymentType = raw.paymentType ?? "monthly";
    if (paymentType !== "enrollment" && paymentType !== "monthly") {
      return apiError("Payment type must be \"enrollment\" or \"monthly\".", 400);
    }

    // Mobile clients historically send "UPI" and a numeric month; the shared
    // schemas (also used by the web) expect "upi" and a zero-padded month.
    const common = {
      courseId,
      paymentMethod: typeof raw.paymentMethod === "string" ? raw.paymentMethod.toLowerCase() : "upi",
      upiTransactionId: raw.upiTransactionId ?? "",
      couponId: raw.couponId ?? null,
      expectedAmountPaise: raw.expectedAmountPaise,
      hasScreenshot: Boolean(screenshotFile && screenshotFile.size > 0),
    };

    const screenshotValidation = validatePendingUpload("payment-screenshot", screenshotFile);
    if (screenshotValidation.error) {
      return apiError(screenshotValidation.error, 400);
    }

    let result;
    if (paymentTypeFromText(paymentType) === "ENROLLMENT") {
      const parsed = enrollmentPaymentSubmitSchema.safeParse(common);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Invalid payment details.", 400);
      }
      result = await processEnrollmentPayment(
        user.id,
        parsed.data.courseId,
        parsed.data.paymentMethod ?? null,
        parsed.data.upiTransactionId ?? null,
        screenshotFile,
        parsed.data.couponId ?? null,
        parsed.data.expectedAmountPaise ?? null,
      );
    } else {
      const parsed = monthlyPaymentSubmitSchema.safeParse({
        ...common,
        paymentMonth: String(raw.paymentMonth ?? "1").padStart(2, "0"),
        paymentYear: String(raw.paymentYear ?? new Date().getFullYear()),
      });
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Invalid payment details.", 400);
      }
      result = await processMonthlyPayment(
        user.id,
        parsed.data.courseId,
        parsed.data.paymentMonth,
        parsed.data.paymentYear,
        parsed.data.paymentMethod ?? null,
        parsed.data.upiTransactionId ?? null,
        screenshotFile,
        parsed.data.couponId ?? null,
        parsed.data.expectedAmountPaise ?? null,
      );
    }

    if (result.error) {
      return apiError(result.error, result.status || 400);
    }

    return NextResponse.json({
      success: true,
      message: "Payment proof submitted successfully. We will verify your fee payment shortly.",
    });
  } catch (error) {
    return apiServerError("api/v1/payments/submit", error, "Could not submit payment proof. Please try again.");
  }
}
