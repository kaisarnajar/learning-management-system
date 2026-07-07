import QRCode from "qrcode";
import type { PaymentSettingsData } from "@/services/payment-settings";
import { getPaymentSettings } from "@/services/payment-settings";

export type UpiPaymentParams = {
  amountPaise: number;
  payeeName: string;
  note: string;
  transactionRef: string;
};

export async function isUpiConfigured(): Promise<boolean> {
  const settings = await getPaymentSettings();
  return Boolean(settings.upiId.trim());
}

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

export async function generateUpiQrDataUrl(upiUrl: string): Promise<string> {
  return QRCode.toDataURL(upiUrl, {
    width: 280,
    margin: 2,
    color: { dark: "#1c1917", light: "#ffffff" },
  });
}
