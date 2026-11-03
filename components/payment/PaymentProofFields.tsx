"use client";

import { useRef } from "react";

export type PaymentMethod = "upi" | "bank";

type PaymentProofFieldsProps = {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  transactionId: string;
  onTransactionIdChange: (value: string) => void;
  screenshot: File | null;
  onScreenshotChange: (file: File | null) => void;
  /** Prefix for the input ids, so two forms on one page never share them. */
  idPrefix?: string;
};

/** Payment method, UTR reference and optional screenshot, shared by the fee and book checkout forms. */
export function PaymentProofFields({
  paymentMethod,
  onPaymentMethodChange,
  transactionId,
  onTransactionIdChange,
  screenshot,
  onScreenshotChange,
  idPrefix = "",
}: PaymentProofFieldsProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClearScreenshot() {
    onScreenshotChange(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  return (
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
              onChange={() => onPaymentMethodChange("upi")}
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
              onChange={() => onPaymentMethodChange("bank")}
              className="text-primary"
            />
            Bank transfer
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}utr`} className="block text-sm font-medium text-foreground">
          Transaction / UTR reference
        </label>
        <input
          id={`${idPrefix}utr`}
          type="text"
          required
          autoComplete="off"
          value={transactionId}
          onChange={(e) => onTransactionIdChange(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor={`${idPrefix}screenshot`} className="block text-sm font-medium text-foreground">
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
          id={`${idPrefix}screenshot`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => onScreenshotChange(e.target.files?.[0] ?? null)}
          className="mt-2 w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
        />
      </div>
    </>
  );
}
