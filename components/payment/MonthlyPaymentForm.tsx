"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import { getPaymentYearOptions } from "@/services/monthly-payments";
import { getFeeFrequencyOption, isOneTimeFee, getFeeFrequencyLabel } from "@/services/fee-frequency";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { submitMonthlyPayment } from "@/app/actions/payments";

type PaymentMethod = "upi" | "bank";

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
  /** Base fee amount in paise for the configured billing period. */
  feePaise: number;
  /** The course's configured fee frequency (e.g. "MONTHLY", "EVERY_3_MONTHS"). */
  feeFrequency?: string | null;
  defaultMonth?: string;
  defaultYear?: string;
};

export function MonthlyPaymentForm({
  courseId,
  feePaise,
  feeFrequency,
  defaultMonth,
  defaultYear,
}: MonthlyPaymentFormProps) {
  const router = useRouter();
  const now = new Date();
  const yearOptions = getPaymentYearOptions(now);
  const defaultYearValue =
    defaultYear && yearOptions.includes(defaultYear) ? defaultYear : String(now.getFullYear());

  const freqOption = getFeeFrequencyOption(feeFrequency);
  const isOneTime = isOneTimeFee(feeFrequency);

  const [paymentMonth, setPaymentMonth] = useState(defaultMonth ?? String(now.getMonth() + 1).padStart(2, "0"));
  const [paymentYear, setPaymentYear] = useState(defaultYearValue);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Amount is the base fee — multiplier already baked in at the course level
  const totalAmountPaise = feePaise;

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
      formData.append("paymentMonth", isOneTime ? "01" : paymentMonth);
      formData.append("paymentYear", isOneTime ? String(now.getFullYear()) : paymentYear);
      formData.append("paymentMethod", paymentMethod);
      formData.append("upiTransactionId", transactionId.trim());
      formData.append("paymentType", freqOption.paymentType);
      if (screenshot && screenshot.size > 0) {
        formData.append("screenshot", screenshot);
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fee summary badge */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
        <span className="text-sm text-muted">
          Fee type: <span className="font-semibold text-foreground">{getFeeFrequencyLabel(feeFrequency)}</span>
        </span>
        <span className="text-sm font-bold text-foreground">
          ₹{(totalAmountPaise / 100).toFixed(2)}
        </span>
      </div>

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

      {error && (
        <p className="rounded-lg bg-destructive-bg px-3 py-2 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <SubmitButton isSubmitting={loading}
        type="submit"
        disabled={loading}
        className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit fee payment for verification"}
      </SubmitButton>
    </form>
  );
}
