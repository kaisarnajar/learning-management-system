"use client";

import { SubmitButton } from "@/components/shared/SubmitButton";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { submitEnrollmentPayment } from "@/app/actions/payments";
import { CouponSelector } from "@/components/payment/CouponSelector";
import { calculateDiscountedAmount, type ApplicableCoupon } from "@/services/coupons";
import { formatPrice } from "@/services/courses";

type PaymentMethod = "upi" | "bank";

type EnrollmentPaymentFormProps = {
  courseId: string;
  baseFeePaise: number;
  availableCoupons?: ApplicableCoupon[];
};

export function EnrollmentPaymentForm({
  courseId,
  baseFeePaise,
  availableCoupons = [],
}: EnrollmentPaymentFormProps) {
  const router = useRouter();
  const [selectedCouponId, setSelectedCouponId] = useState<string>(
    availableCoupons.length > 0 ? availableCoupons[0].id : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId);
  const currentPercentage = selectedCoupon ? selectedCoupon.percentage : 0;
  const currentAmountPaise = selectedCoupon
    ? calculateDiscountedAmount(baseFeePaise, currentPercentage)
    : baseFeePaise;

  const isFree = currentAmountPaise === 0;

  function handleClearScreenshot() {
    setScreenshot(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      if (selectedCouponId && selectedCouponId !== "none") {
        formData.append("couponId", selectedCouponId);
      }
      
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
    <form onSubmit={handleSubmit} className="space-y-5">
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
          <fieldset>
            <legend className="text-sm font-medium text-foreground">How did you pay?</legend>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={() => setPaymentMethod("upi")}
                  className="text-primary"
                />
                UPI
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank"
                  checked={paymentMethod === "bank"}
                  onChange={() => setPaymentMethod("bank")}
                  className="text-primary"
                />
                Bank transfer
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="utr" className="block text-sm font-medium text-foreground">
              Transaction / UTR reference
            </label>
            <input
              id="utr"
              type="text"
              required
              autoComplete="off"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="screenshot" className="block text-sm font-medium text-foreground">
                Payment screenshot <span className="font-normal text-muted">(optional)</span>
              </label>
              {screenshot && (
                <button
                  type="button"
                  onClick={handleClearScreenshot}
                  className="text-xs font-medium text-destructive-text hover:underline"
                >
                  Clear selection
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              id="screenshot"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
              className="mt-2 w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
          </div>
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
  );
}
