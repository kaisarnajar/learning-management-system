import type { PaymentSettingsData } from "@/utils/payment-settings-format";

/**
 * UPI payment links.
 * Pure (no Prisma, no server APIs), so client components import them
 * here; the service module re-exports them for server code.
 */

export type UpiPaymentParams = {
  amountPaise: number;
  payeeName: string;
  note: string;
  transactionRef: string;
};

export function formatUpiAmount(amountPaise: number): string {
  return (amountPaise / 100).toFixed(2);
}

export function buildUpiVpaUrlFromSettings(settings: PaymentSettingsData): string {
  const query = new URLSearchParams({
    pa: settings.upiId,
    pn: settings.upiPayeeName.slice(0, 50),
    cu: "INR",
  });
  return `upi://pay?${query.toString()}`;
}

export function buildUpiPaymentUrlFromSettings(
  settings: PaymentSettingsData,
  params: UpiPaymentParams,
): string {
  const query = new URLSearchParams({
    pa: settings.upiId,
    pn: params.payeeName.slice(0, 50),
    am: formatUpiAmount(params.amountPaise),
    cu: "INR",
    tn: params.note.slice(0, 80),
    tr: params.transactionRef.slice(0, 35),
  });
  return `upi://pay?${query.toString()}`;
}
