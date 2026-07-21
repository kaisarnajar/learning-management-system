import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnrollmentPaymentForm } from "@/components/payment/EnrollmentPaymentForm";
import { PaymentDetailsPanel } from "@/components/payment/PaymentDetailsPanel";
import { requireUser } from "@/services/auth-actions";
import { getRegistrationFeePaise } from "@/services/course-pricing";
import { formatPrice, getCourseById } from "@/services/courses";
import { hasPendingEnrollmentFeeSubmission } from "@/services/monthly-payments";
import { prisma } from "@/utils/prisma";
import { isUpiConfigured } from "@/services/upi";
import { withDbErrorHandling } from "@/utils/db-error";
import { getBestApplicableCoupon, calculateDiscountedAmount } from "@/services/coupons";
import { getPaymentSettings } from "@/services/payment-settings";

export default async function PayEnrollmentFeePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await requireUser();
  const { courseId } = await params;

  const course = await getCourseById(courseId);
  if (!course) notFound();

  const paymentSettings = await getPaymentSettings();

  const originalEnrollmentFeePaise = getRegistrationFeePaise(course);
  if (originalEnrollmentFeePaise <= 0) {
    redirect("/profile/courses");
  }

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    }), "Database operation failed");

  // Block access if already fully enrolled or completed.
  if (enrollment?.status === "active" || enrollment?.status === "completed") {
    redirect("/profile/courses");
  }

  if (await hasPendingEnrollmentFeeSubmission(session.user.id, courseId)) {
    redirect("/profile/payments?submitted=1");
  }

  if (!(await isUpiConfigured())) {
    return (
      <div>
        <p className="rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Online payments are not configured yet. Please contact the academy.
        </p>
      </div>
    );
  }

  const coupon = await getBestApplicableCoupon(session.user.id, courseId);
  const finalEnrollmentFeePaise = coupon 
    ? calculateDiscountedAmount(originalEnrollmentFeePaise, coupon.percentage)
    : originalEnrollmentFeePaise;

  const amountLabel = formatPrice(finalEnrollmentFeePaise);

  return (
    <div>
      <Link href="/profile/courses" className="text-sm text-primary hover:underline">
        ← My courses
      </Link>

      <h2 className="mt-4 font-serif text-lg font-semibold text-foreground">Pay enrollment fee</h2>
      <p className="mt-1 text-sm text-muted">{course.title}</p>
      <p className="mt-2 text-sm font-medium text-foreground">
        Amount: {amountLabel}
        {coupon && <span className="ml-2 text-xs text-green-600 line-through">{formatPrice(originalEnrollmentFeePaise)}</span>}
      </p>

      <div className="mx-auto mt-8 max-w-5xl space-y-8">
        <PaymentDetailsPanel
          amountLabel={amountLabel}
          amountPaise={finalEnrollmentFeePaise}
          paymentNote={`${course.title} enrollment`.slice(0, 80)}
        />
        <div className="card-elevated p-6 sm:p-8">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Submit payment</h3>
          <p className="mt-2 text-sm text-muted">
            After paying by UPI or bank transfer, enter your transaction reference below. The academy will
            verify your payment and activate your enrollment.
          </p>
          <div className="mt-6">
            <EnrollmentPaymentForm 
              courseId={course.id} 
              amountPaise={finalEnrollmentFeePaise}
              couponInfo={coupon ? { code: coupon.code, percentage: coupon.percentage } : null}
            />
          </div>
          
          {paymentSettings?.feeWaiverEnabled && finalEnrollmentFeePaise > 0 && (
            <div className="mt-8 border-t border-border pt-6 text-center">
              <p className="text-sm text-muted mb-2">Are you unable to afford the enrollment fee?</p>
              <Link 
                href={`/profile/waiver-requests?courseId=${course.id}&type=enrollment`} 
                className="inline-block rounded border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                Request a Fee Waiver
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
