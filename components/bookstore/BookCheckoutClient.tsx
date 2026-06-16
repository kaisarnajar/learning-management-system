"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/bookstore/CartProvider";
import { useRouter } from "next/navigation";

type CheckoutItem = {
  bookId: string;
  title: string;
  author: string;
  priceInrPaise: number;
  imagePath: string | null;
  quantity: number;
};

type BankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

type PaymentMethod = "upi" | "bank";

export function BookCheckoutClient({
  items,
  totalAmountInrPaise,
  upiId,
  upiPayeeName,
  bankDetails,
}: {
  items: CheckoutItem[];
  totalAmountInrPaise: number;
  upiId: string;
  upiPayeeName: string;
  bankDetails: BankDetails;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { clearCart } = useCart();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!transactionId.trim()) {
      setError("Please enter the transaction / UTR reference.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("items", JSON.stringify(items.map((i) => ({ bookId: i.bookId, quantity: i.quantity }))));
      formData.append("paymentMethod", paymentMethod);
      formData.append("upiTransactionId", transactionId.trim());
      formData.append("notes", notes.trim());
      if (screenshot && screenshot.size > 0) {
        formData.append("screenshot", screenshot);
      }

      const res = await fetch("/api/bookstore/order", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not submit order. Please try again.");
        setLoading(false);
        return;
      }

      // Clear only the purchased items from cart
      for (const item of items) {
        // We don't remove from cart here — let user decide. Cart clears on submit.
      }
      clearCart();
      router.push(data.redirectUrl || "/profile/cart?submitted=1");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/profile/cart" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Cart
        </Link>
        <h2 className="mt-3 font-serif text-lg font-semibold text-foreground">Checkout</h2>
        <p className="mt-1 text-sm text-muted">
          Review your order, transfer the payment, then fill in the details below.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Left — Order Summary */}
        <div className="space-y-6">
          {/* Items */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Order Summary</h3>
            <div className="mt-3 rounded-xl border border-border bg-surface divide-y divide-border">
              {items.map((item) => (
                <div key={item.bookId} className="flex items-center gap-4 p-4">
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-border">
                    {item.imagePath ? (
                      <Image src={item.imagePath} alt={item.title} width={40} height={56} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-accent-muted/30">
                        <svg className="h-4 w-4 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted">{item.author}</p>
                    <p className="mt-0.5 text-xs text-muted">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-foreground">{formatPrice(item.priceInrPaise * item.quantity)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between p-4 bg-background/50">
                <p className="font-semibold text-foreground">Total</p>
                <p className="text-lg font-bold text-primary">{formatPrice(totalAmountInrPaise)}</p>
              </div>
            </div>
          </section>

          {/* Payment Details */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Payment Details</h3>
            <div className="mt-3 rounded-xl border border-border bg-surface p-4 space-y-3 text-sm">
              {upiId && (
                <div>
                  <p className="font-semibold text-foreground">Pay via UPI</p>
                  <div className="mt-1 flex items-center">
                    <span className="text-muted">UPI ID: </span>
                    <span className="ml-1 font-mono font-medium text-foreground">{upiId}</span>
                    <CopyButton text={upiId} />
                  </div>
                  <p className="text-muted">Payee: {upiPayeeName}</p>
                  <p className="mt-1 font-bold text-primary">Amount: {formatPrice(totalAmountInrPaise)}</p>
                </div>
              )}
              {(bankDetails.accountNumber || bankDetails.bankName) && (
                <div className={upiId ? "border-t border-border pt-3" : ""}>
                  <p className="font-semibold text-foreground">Bank Transfer</p>
                  {bankDetails.accountName && <p className="mt-1 text-muted">Account: <span className="text-foreground">{bankDetails.accountName}</span></p>}
                  {bankDetails.bankName && <p className="text-muted">Bank: <span className="text-foreground">{bankDetails.bankName}</span></p>}
                  {bankDetails.accountNumber && (
                    <div className="flex items-center">
                      <span className="text-muted">Account No: </span>
                      <span className="ml-1 font-mono text-foreground">{bankDetails.accountNumber}</span>
                      <CopyButton text={bankDetails.accountNumber} />
                    </div>
                  )}
                  {bankDetails.ifsc && (
                    <div className="flex items-center">
                      <span className="text-muted">IFSC: </span>
                      <span className="ml-1 font-mono text-foreground">{bankDetails.ifsc}</span>
                      <CopyButton text={bankDetails.ifsc} />
                    </div>
                  )}
                  {bankDetails.branch && <p className="text-muted">Branch: <span className="text-foreground">{bankDetails.branch}</span></p>}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right — Payment Confirmation Form */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-serif text-base font-semibold text-foreground">Confirm Payment</h3>
          <p className="mt-1 text-xs text-muted">
            Transfer the amount above, then fill in the details to submit your order for approval.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Payment Method */}
            <fieldset>
              <legend className="text-sm font-medium text-foreground">Payment method</legend>
              <div className="mt-2 flex flex-wrap gap-4">
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
                  Bank Transfer
                </label>
              </div>
            </fieldset>

            {/* Transaction ID */}
            <div>
              <label htmlFor="checkout-utr" className="block text-sm font-medium text-foreground">
                Transaction / UTR reference <span className="text-red-600">*</span>
              </label>
              <input
                id="checkout-utr"
                type="text"
                required
                autoComplete="off"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter UPI/bank transaction reference"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Screenshot */}
            <div>
              <label htmlFor="checkout-screenshot" className="block text-sm font-medium text-foreground">
                Payment screenshot <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="checkout-screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-light"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="checkout-notes" className="block text-sm font-medium text-foreground">
                Notes <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="checkout-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any special instructions for delivery, etc."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60 transition-colors"
            >
              {loading ? "Submitting…" : "Submit Order for Approval"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
