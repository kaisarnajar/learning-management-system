"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { formatPrice } from "@/utils/money";

import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/bookstore/CartProvider";
import { useRouter } from "next/navigation";
import { submitBookOrder } from "@/app/actions/bookstore";
import { useToast } from "@/components/shared/ToastProvider";
import { PaymentProofFields, type PaymentMethod } from "@/components/payment/PaymentProofFields";

type CheckoutItem = {
  bookId: string;
  title: string;
  author: string;
  priceInrPaise: number;
  mrpInrPaise?: number;
  imagePath: string | null;
  quantity: number;
};

export function BookCheckoutClient({
  items,
  totalAmountInrPaise,
  shippingChargeInrPaise,
}: {
  items: CheckoutItem[];
  totalAmountInrPaise: number;
  shippingChargeInrPaise: number;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [transactionId, setTransactionId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPinCode, setDeliveryPinCode] = useState("");
  const [deliveryPhoneNumber, setDeliveryPhoneNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { removeItem } = useCart();
  const router = useRouter();
  const { addToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;
    if (!transactionId.trim()) {
      addToast("Please enter the transaction / UTR reference.", "error");
      return;
    }

    if (deliveryAddress.trim().length < 10) {
      addToast("Please enter a complete delivery address (minimum 10 characters).", "error");
      return;
    }

    if (!/^[0-9]{5,10}$/.test(deliveryPinCode.trim())) {
      addToast("Please enter a valid pin code.", "error");
      return;
    }

    if (!/^[0-9]{10,15}$/.test(deliveryPhoneNumber.trim())) {
      addToast("Please enter a valid phone number (10-15 digits).", "error");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("items", JSON.stringify(items.map((i) => ({ bookId: i.bookId, quantity: i.quantity }))));
      formData.append("paymentMethod", paymentMethod);
      formData.append("upiTransactionId", transactionId.trim());
      formData.append("deliveryAddress", deliveryAddress.trim());
      formData.append("deliveryPinCode", deliveryPinCode.trim());
      formData.append("deliveryPhoneNumber", deliveryPhoneNumber.trim());
      if (screenshot && screenshot.size > 0) {
        formData.append("screenshot", screenshot);
      }

      const data = await submitBookOrder(formData);

      if (data.error) {
        addToast(data.error || "Could not submit order. Please try again.", "error");
        setLoading(false);
        return;
      }

      // Clear only the purchased items from cart
      for (const item of items) {
        removeItem(item.bookId);
      }
      router.push(data.redirectUrl || "/profile/cart?submitted=1");
    } catch {
      addToast("Something went wrong. Please try again.", "error");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        {/* Left — Order Summary */}
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Order Summary</h3>
            <div className="mt-6 rounded-xl border border-border bg-background divide-y divide-border">
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
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatPrice(item.priceInrPaise * item.quantity, { exact: true })}</p>
                    {item.mrpInrPaise && item.mrpInrPaise > item.priceInrPaise && (
                      <p className="text-xs text-muted line-through">{formatPrice(item.mrpInrPaise * item.quantity, { exact: true })}</p>
                    )}
                  </div>
                </div>
              ))}
              <div className="p-4 bg-background/50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted">Subtotal</p>
                  <p className="font-medium text-foreground">{formatPrice(totalAmountInrPaise - shippingChargeInrPaise, { exact: true })}</p>
                </div>
                {shippingChargeInrPaise > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted">Shipping</p>
                    <p className="font-medium text-foreground">{formatPrice(shippingChargeInrPaise, { exact: true })}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <p className="font-semibold text-foreground">Total</p>
                  <p className="text-lg font-bold text-primary">{formatPrice(totalAmountInrPaise, { exact: true })}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right — Payment Confirmation Form */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Submit payment</h3>
          <p className="mt-2 text-sm text-muted">
            After paying by UPI or bank transfer, fill in the details below to submit your order for approval.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <PaymentProofFields
              idPrefix="checkout-"
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              transactionId={transactionId}
              onTransactionIdChange={setTransactionId}
              screenshot={screenshot}
              onScreenshotChange={setScreenshot}
            />

            {/* Delivery Address */}
            <div>
              <label htmlFor="checkout-address" className="block text-sm font-medium text-foreground">
                Delivery Address
              </label>
              <textarea
                id="checkout-address"
                required
                rows={3}
                placeholder="Enter your full address (Street, City, State)..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Pin Code */}
              <div>
                <label htmlFor="checkout-pincode" className="block text-sm font-medium text-foreground">
                  Pin Code
                </label>
                <input
                  id="checkout-pincode"
                  type="text"
                  required
                  placeholder="e.g. 193402"
                  value={deliveryPinCode}
                  onChange={(e) => setDeliveryPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="checkout-phone" className="block text-sm font-medium text-foreground">
                  Phone Number
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={deliveryPhoneNumber}
                  onChange={(e) => setDeliveryPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* No inline error banner. Errors are shown via toast. */}

            <SubmitButton isSubmitting={loading}
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60 transition-colors"
            >
              {loading ? "Submitting…" : "Submit Order for Approval"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
