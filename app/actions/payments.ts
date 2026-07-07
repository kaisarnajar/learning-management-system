"use server";

import { ensureAuth } from "@/utils/auth-utils";
import { processMonthlyPayment, processEnrollmentPayment } from "@/services/payments";
import { isUpiConfigured } from "@/services/upi";
import { monthlyPaymentSubmitSchema, enrollmentPaymentSubmitSchema } from "@/utils/validations";
import { validatePaymentScreenshot } from "@/services/payment-upload";

export async function submitMonthlyPayment(formData: FormData) {
  const { session, error: authError } = await ensureAuth();
  if (authError || !session) return { error: authError || "Please sign in.", status: 401 };
  if (!session.user.emailVerified) return { error: "Please verify your email to submit payments.", status: 403 };
  if (!(await isUpiConfigured())) return { error: "Online payments are not configured yet. Please contact the academy.", status: 503 };

  try {
    const parsed = monthlyPaymentSubmitSchema.safeParse({
      courseId: formData.get("courseId"),
      paymentMonth: formData.get("paymentMonth"),
      paymentYear: formData.get("paymentYear"),
      paymentMethod: formData.get("paymentMethod"),
      upiTransactionId: formData.get("upiTransactionId"),
      paymentType: formData.get("paymentType"),
    });

    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid payment details.", status: 400 };

    const screenshot = formData.get("screenshot");
    const screenshotFile = screenshot instanceof File ? screenshot : null;
    const screenshotValidation = validatePaymentScreenshot(screenshotFile);
    if (screenshotValidation.error) return { error: screenshotValidation.error, status: 400 };

    const result = await processMonthlyPayment(
      session.user.id,
      parsed.data.courseId,
      parsed.data.paymentMonth,
      parsed.data.paymentYear,
      parsed.data.paymentMethod ?? null,
      parsed.data.upiTransactionId ?? null,
      screenshotFile,
      parsed.data.paymentType
    );

    if (result.error) return { error: result.error, status: result.status ?? 400 };

    return { redirectUrl: "/profile/payments?submitted=1", message: "Thank you! We will verify your course fee payment shortly." };
  } catch (error) {
    console.error("Caught error:", error);
    return { error: "Could not submit payment. Please try again.", status: 500 };
  }
}

export async function submitEnrollmentPayment(formData: FormData) {
  const { session, error: authError } = await ensureAuth();
  if (authError || !session) return { error: authError || "Please sign in.", status: 401 };
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

    const result = await processEnrollmentPayment(
      session.user.id,
      parsed.data.courseId,
      parsed.data.paymentMethod ?? null,
      parsed.data.upiTransactionId ?? null,
      screenshotFile
    );

    if (result.error) return { error: result.error, status: result.status ?? 400 };

    return { redirectUrl: "/profile/payments?submitted=1" };
  } catch (error) {
    console.error("Caught error:", error);
    return { error: "Could not submit payment. Please try again.", status: 500 };
  }
}

