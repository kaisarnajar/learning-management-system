import { getPaymentSettings } from "@/services/payment-settings";
import { buildUpiPaymentUrlFromSettings, buildUpiVpaUrlFromSettings, formatUpiAmount, type UpiPaymentParams } from "@/utils/upi";

// Pure helpers, importable from client components: utils/upi.ts
export { buildUpiPaymentUrlFromSettings, buildUpiVpaUrlFromSettings, formatUpiAmount };
export type { UpiPaymentParams };

export async function isUpiConfigured(): Promise<boolean> {
  const settings = await getPaymentSettings();
  return Boolean(settings.upiId.trim());
}

