import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MonthlyPaymentForm } from "@/components/payment/MonthlyPaymentForm";
import { PaymentDetailsPanel } from "@/components/payment/PaymentDetailsPanel";
import { requireUser } from "@/services/auth-actions";
import { getMonthlyFeePaise } from "@/services/course-pricing";
import { formatPrice, getCourseById } from "@/services/courses";
import { prisma } from "@/utils/prisma";
import { isUpiConfigured } from "@/services/upi";
import { withDbErrorHandling } from "@/utils/db-error";
import { getFeeFrequencyLabel, getFeeFrequencySuffix } from "@/services/fee-frequency";
import { getBestApplicableCoupon, calculateDiscountedAmount } from "@/services/coupons";
import { getPaymentSettings } from "@/services/payment-settings";

export default async function PayFeePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await requireUser();
  const { courseId } = await params;

  const course = await getCourseById(courseId);
  if (!course) notFound();

  const paymentSettings = await getPaymentSettings();

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    }), "Database operation failed");

  if (!enrollment || (enrollment.status !== "active" && enrollment.status !== "completed")) {
    redirect("/profile/courses");
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

  const originalFeePaise = getMonthlyFeePaise(course);
  
  const coupon = await getBestApplicableCoupon(session.user.id, courseId, "course");
  const finalFeePaise = coupon
    ? calculateDiscountedAmount(originalFeePaise, coupon.percentage)
    : originalFeePaise;

  const feeFrequency = course.feeFrequency ?? "MONTHLY";
  const freqLabel = getFeeFrequencyLabel(feeFrequency);
  const freqSuffix = getFeeFrequencySuffix(feeFrequency);
  const amountLabel = formatPrice(finalFeePaise);

  return (
    <div>
      <Link href="/profile/courses" className="text-sm text-primary hover:underline">
        ← My courses
      </Link>

      <h2 className="mt-4 font-serif text-lg font-semibold text-foreground">Pay Fee</h2>
      <p className="mt-1 text-sm text-muted">{course.title}</p>
      <p className="mt-2 text-sm font-medium text-foreground">
        {amountLabel} {freqSuffix} · <span className="text-muted">{freqLabel}</span>
        {coupon && <span className="ml-2 text-xs text-green-600 line-through">{formatPrice(originalFeePaise)}</span>}
      </p>

      <div className="mx-auto mt-8 max-w-5xl space-y-8">
        <PaymentDetailsPanel
          amountLabel={amountLabel}
          amountPaise={finalFeePaise}
          paymentNote={`${course.title} — ${freqLabel}`.slice(0, 80)}
        />
        <div className="card-elevated p-6 sm:p-8">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Submit payment</h3>
          <p className="mt-2 text-sm text-muted">
            After paying by UPI or bank transfer, enter your transaction reference below.
          </p>
          <div className="mt-6">
            <MonthlyPaymentForm
              courseId={course.id}
              feePaise={finalFeePaise}
              feeFrequency={feeFrequency}
              couponInfo={coupon ? { code: coupon.code, percentage: coupon.percentage } : null}
            />
          </div>
          
          {paymentSettings?.feeWaiverEnabled && finalFeePaise > 0 && (
            <div className="mt-8 border-t border-border pt-6 text-center">
              <p className="text-sm text-muted mb-2">Are you unable to afford the fee?</p>
              <Link 
                href={`/profile/waiver-requests?courseId=${course.id}&type=course`} 
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
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
