"use client";

import { SubmitButton } from "@/components/shared/SubmitButton";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitEnrollmentPayment } from "@/app/actions/payments";
import { CouponSelector } from "@/components/payment/CouponSelector";
import { PaymentDetailsPanel } from "@/components/payment/PaymentDetailsPanel";
import { PaymentProofFields, type PaymentMethod } from "@/components/payment/PaymentProofFields";
import { calculateDiscountedAmount, type ApplicableCoupon } from "@/services/coupons";
import { formatPrice } from "@/utils/money";
import type { PaymentSettingsData } from "@/services/payment-settings";

type EnrollmentPaymentFormProps = {
  courseId: string;
  courseTitle?: string;
  baseFeePaise: number;
  availableCoupons?: ApplicableCoupon[];
  paymentSettings: PaymentSettingsData;
};

export function EnrollmentPaymentForm({
  courseId,
  courseTitle = "Course",
  baseFeePaise,
  availableCoupons = [],
  paymentSettings,
}: EnrollmentPaymentFormProps) {
  const router = useRouter();
  const firstSelectable = availableCoupons.find((c) => !c.isUsed);
  const [selectedCouponId, setSelectedCouponId] = useState<string>(
    firstSelectable ? firstSelectable.id : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId && !c.isUsed);
  const currentPercentage = selectedCoupon ? selectedCoupon.percentage : 0;
  const currentAmountPaise = selectedCoupon
    ? calculateDiscountedAmount(baseFeePaise, currentPercentage)
    : baseFeePaise;

  const isFree = currentAmountPaise === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      // Always send the choice explicitly ("none" = pay the full fee) and the
      // amount the student saw, so the server can refuse a mismatch.
      formData.append("couponId", selectedCouponId && selectedCouponId !== "none" ? selectedCouponId : "none");
      formData.append("expectedAmountPaise", String(currentAmountPaise));
      
      if (!isFree) {
        formData.append("paymentMethod", paymentMethod);
        formData.append("upiTransactionId", transactionId.trim());
        if (screenshot && screenshot.size > 0) {
          formData.append("screenshot", screenshot);
        }
      }

      const data = await submitEnrollmentPayment(formData);

      if (data.error) {
        setError(data.error || "Could not submit payment.");
        setLoading(false);
        return;
      }

      router.push(data.redirectUrl || "/profile/payments?submitted=1");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PaymentDetailsPanel
        settings={paymentSettings}
        amountLabel={currentAmountPaise === 0 ? "FREE" : formatPrice(currentAmountPaise)}
        amountPaise={currentAmountPaise}
        paymentNote={`${courseTitle} enrollment`.slice(0, 80)}
      />

      <div className="card-elevated p-6 sm:p-8">
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Submit payment</h3>
        <p className="mt-2 text-sm text-muted">
          After paying by UPI or bank transfer, enter your transaction reference below. The academy will
          verify your payment and activate your enrollment.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {/* Fee summary badge */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
        <span className="text-sm text-muted">
          Enrollment Fee:
        </span>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground">
            {currentAmountPaise === 0 ? "FREE" : formatPrice(currentAmountPaise)}
          </span>
          {selectedCoupon && currentAmountPaise < baseFeePaise && (
            <span className="ml-2 text-xs text-muted line-through">
              {formatPrice(baseFeePaise)}
            </span>
          )}
        </div>
      </div>

      {availableCoupons.length > 0 && (
        <CouponSelector
          coupons={availableCoupons}
          selectedCouponId={selectedCouponId}
          onSelectCoupon={(id) => setSelectedCouponId(id)}
          baseFeePaise={baseFeePaise}
        />
      )}

      {!isFree && (
        <>
          <PaymentProofFields
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            transactionId={transactionId}
            onTransactionIdChange={setTransactionId}
            screenshot={screenshot}
            onScreenshotChange={setScreenshot}
          />
        </>
      )}

      {error && (
        <p className="rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <SubmitButton
        isSubmitting={loading}
        type="submit"
        disabled={loading}
        className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-light transition-colors disabled:opacity-60"
      >
        {loading ? "Submitting…" : isFree ? "Claim Fee Waiver & Enroll" : "Submit enrollment fee for verification"}
      </SubmitButton>
    </form>
  </div>
</div>
);
}
