"use client";

import { SubmitButton } from "@/components/shared/SubmitButton";
import { getPaymentYearOptions } from "@/services/monthly-payments";
import { getFeeFrequencyOption, isOneTimeFee, getFeeFrequencyLabel } from "@/services/fee-frequency";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitMonthlyPayment } from "@/app/actions/payments";
import { CouponSelector } from "@/components/payment/CouponSelector";
import { PaymentDetailsPanel } from "@/components/payment/PaymentDetailsPanel";
import { PaymentProofFields, type PaymentMethod } from "@/components/payment/PaymentProofFields";
import { calculateDiscountedAmount, type ApplicableCoupon } from "@/services/coupons";
import { formatPrice } from "@/utils/money";
import type { PaymentSettingsData } from "@/services/payment-settings";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

type MonthlyPaymentFormProps = {
  courseId: string;
  courseTitle?: string;
  baseFeePaise: number;
  feeFrequency?: string | null;
  defaultMonth?: string;
  defaultYear?: string;
  availableCoupons?: ApplicableCoupon[];
  paymentSettings: PaymentSettingsData;
};

export function MonthlyPaymentForm({
  courseId,
  courseTitle = "Course",
  baseFeePaise,
  feeFrequency,
  defaultMonth,
  defaultYear,
  availableCoupons = [],
  paymentSettings,
}: MonthlyPaymentFormProps) {
  const router = useRouter();
  const now = new Date();
  const yearOptions = getPaymentYearOptions(now);
  const defaultYearValue =
    defaultYear && yearOptions.includes(defaultYear) ? defaultYear : String(now.getFullYear());

  const freqOption = getFeeFrequencyOption(feeFrequency);
  const isOneTime = isOneTimeFee(feeFrequency);

  const firstSelectable = availableCoupons.find((c) => !c.isUsed);
  const [selectedCouponId, setSelectedCouponId] = useState<string>(
    firstSelectable ? firstSelectable.id : ""
  );
  const [paymentMonth, setPaymentMonth] = useState(defaultMonth ?? String(now.getMonth() + 1).padStart(2, "0"));
  const [paymentYear, setPaymentYear] = useState(defaultYearValue);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCoupon = availableCoupons.find((c) => c.id === selectedCouponId && !c.isUsed);
  const currentPercentage = selectedCoupon ? selectedCoupon.percentage : 0;
  const totalAmountPaise = selectedCoupon
    ? calculateDiscountedAmount(baseFeePaise, currentPercentage)
    : baseFeePaise;

  const isFree = totalAmountPaise === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("paymentMonth", isOneTime ? "01" : paymentMonth);
      formData.append("paymentYear", isOneTime ? String(now.getFullYear()) : paymentYear);
      formData.append("paymentType", freqOption.paymentType);
      // Always send the choice explicitly ("none" = pay the full fee) and the
      // amount the student saw, so the server can refuse a mismatch.
      formData.append("couponId", selectedCouponId && selectedCouponId !== "none" ? selectedCouponId : "none");
      formData.append("expectedAmountPaise", String(totalAmountPaise));
      
      if (!isFree) {
        formData.append("paymentMethod", paymentMethod);
        formData.append("upiTransactionId", transactionId.trim());
        if (screenshot && screenshot.size > 0) {
          formData.append("screenshot", screenshot);
        }
      }

      const data = await submitMonthlyPayment(formData);

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
        amountLabel={totalAmountPaise === 0 ? "FREE" : formatPrice(totalAmountPaise)}
        amountPaise={totalAmountPaise}
        paymentNote={`${courseTitle} — ${getFeeFrequencyLabel(feeFrequency)}`.slice(0, 80)}
      />

      <div className="card-elevated p-6 sm:p-8">
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Submit payment</h3>
        <p className="mt-2 text-sm text-muted">
          After paying by UPI or bank transfer, enter your transaction reference below.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {/* Fee summary badge */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
        <span className="text-sm text-muted">
          Fee type: <span className="font-semibold text-foreground">{getFeeFrequencyLabel(feeFrequency)}</span>
        </span>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground">
            {totalAmountPaise === 0 ? "FREE" : formatPrice(totalAmountPaise)}
          </span>
          {selectedCoupon && totalAmountPaise < baseFeePaise && (
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

      {/* Month / year pickers — only for recurring fees */}
      {!isOneTime && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="paymentMonth" className="block text-sm font-medium text-foreground">
              Starting Month
            </label>
            <select
              id="paymentMonth"
              value={paymentMonth}
              onChange={(e) => setPaymentMonth(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentYear" className="block text-sm font-medium text-foreground">
              Starting Year
            </label>
            <select
              id="paymentYear"
              value={paymentYear}
              onChange={(e) => setPaymentYear(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
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
        {loading ? "Submitting…" : isFree ? "Claim Fee Waiver" : "Submit fee payment for verification"}
      </SubmitButton>
        </form>
      </div>
    </div>
  );
}
