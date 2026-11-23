import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getCourseById } from "@/services/courses";
import { getMonthlyFeePaise, getRegistrationFeePaise } from "@/services/course-pricing";
import { calculateDiscountedAmount, getApplicableCoupons } from "@/services/coupons";
import { canReapplyForEnrollment } from "@/services/enrollment-status";
import { getFeeFrequencyLabel, getFeeFrequencyPaymentType, isOneTimeFee } from "@/services/fee-frequency";
import { getPaymentYearOptions, hasPendingEnrollmentFeeSubmission } from "@/services/monthly-payments";
import { getPaymentSettings, isUpiConfiguredFromSettings } from "@/services/payment-settings";
import { isApprovedEnrollment } from "@/services/status-compat";
import { prisma } from "@/utils/prisma";
import { apiError, apiServerError } from "@/utils/api-response";

/**
 * Everything the app's pay screen needs, computed by the same rules as the
 * website's pay pages: ?courseId=...&type=enrollment|course.
 *
 * - `baseAmountPaise`: the fee before any waiver.
 * - `coupons`: waivers the student may choose (best first), each with the
 *   amount to pay. Nothing is applied unless the app sends its `couponId`.
 * - Send the amount shown as `expectedAmountPaise` to /api/v1/payments/submit;
 *   a changed price is refused with 409 instead of being charged silently.
 * - For course fees: `oneTimeFee` (send paymentMonth "01"), and `yearOptions`.
 * - `canPay` is false with a `reason` when the website would not offer payment.
 */
export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = request.nextUrl;
    const courseId = searchParams.get("courseId") ?? "";
    const type = searchParams.get("type");
    if (type !== "enrollment" && type !== "course") return apiError('type must be "enrollment" or "course".', 400);

    const course = await getCourseById(courseId);
    if (!course) return apiError("Course not found.", 404);

    const [settings, enrollment] = await Promise.all([
      getPaymentSettings(),
      prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } }),
    ]);

    const baseAmountPaise = type === "enrollment" ? getRegistrationFeePaise(course) : getMonthlyFeePaise(course);
    let reason: string | null = null;
    if (!isUpiConfiguredFromSettings(settings)) reason = "Online payments are not configured yet. Please contact the academy.";
    else if (baseAmountPaise <= 0) reason = type === "enrollment" ? "This course has no enrollment fee." : "This course has no course fee.";
    else if (type === "enrollment") {
      if (enrollment && isApprovedEnrollment(enrollment)) reason = "You are already enrolled and approved in this course.";
      else if (enrollment && canReapplyForEnrollment(enrollment.status)) reason = "Your request was not approved. Apply again from the course page first.";
      else if (await hasPendingEnrollmentFeeSubmission(user.id, courseId)) reason = "Your enrollment fee payment is already awaiting verification.";
    } else if (!enrollment || !isApprovedEnrollment(enrollment)) {
      reason = "You must be enrolled and approved in this course before paying course fees.";
    }

    const coupons = reason ? [] : await getApplicableCoupons(user.id, courseId, type);
    const feeFrequency = course.feeFrequency ?? "MONTHLY";

    return NextResponse.json({
      success: true,
      courseId,
      type,
      canPay: reason === null,
      reason,
      baseAmountPaise,
      coupons: coupons
        .filter((coupon) => !coupon.isUsed)
        .map((coupon) => ({
          id: coupon.id,
          code: coupon.code,
          percentage: coupon.percentage,
          type: coupon.type,
          validUntil: coupon.validUntil,
          amountPaise: calculateDiscountedAmount(baseAmountPaise, coupon.percentage),
        })),
      ...(type === "course"
        ? {
            feeFrequency,
            feeFrequencyLabel: getFeeFrequencyLabel(feeFrequency),
            paymentType: getFeeFrequencyPaymentType(feeFrequency),
            oneTimeFee: isOneTimeFee(feeFrequency),
            yearOptions: getPaymentYearOptions(),
          }
        : {}),
    });
  } catch (error) {
    return apiServerError("api/v1/payments/quote", error, "Failed to prepare the payment.");
  }
}
