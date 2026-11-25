import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { BRAND_CONFIG } from "@/config/brand";
import { cache } from "react";
import { isUpiConfiguredFromSettings, PAYMENT_SETTINGS_ID, toBankDetails, type BankDetails, type PaymentSettingsData } from "@/utils/payment-settings-format";

// Pure helpers, importable from client components: utils/payment-settings-format.ts
export { isUpiConfiguredFromSettings, PAYMENT_SETTINGS_ID, toBankDetails };
export type { BankDetails, PaymentSettingsData };

function defaultSettings(): PaymentSettingsData {
  return {
    upiId: "",
    upiNumber: "",
    upiPayeeName: BRAND_CONFIG.name,
    bankAccountName: BRAND_CONFIG.name,
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: "",
    includeGstByDefault: false,
    feeWaiverEnabled: false,
    autoApproveFullWaivers: false,
  };
}

function rowToSettings(row: {
  upiId: string;
  upiNumber: string;
  upiPayeeName: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  includeGstByDefault: boolean;
  feeWaiverEnabled: boolean;
  autoApproveFullWaivers: boolean;
}): PaymentSettingsData {
  const defaults = defaultSettings();
  return {
    upiId: row.upiId.trim(),
    upiNumber: row.upiNumber.trim(),
    upiPayeeName: row.upiPayeeName.trim() || defaults.upiPayeeName,
    bankAccountName: row.bankAccountName.trim() || defaults.bankAccountName,
    bankName: row.bankName.trim(),
    bankAccountNumber: row.bankAccountNumber.trim(),
    bankIfsc: row.bankIfsc.trim(),
    bankBranch: row.bankBranch.trim(),
    includeGstByDefault: row.includeGstByDefault,
    feeWaiverEnabled: row.feeWaiverEnabled,
    autoApproveFullWaivers: row.autoApproveFullWaivers,
  };
}

/** Memoised per request: several components on one page read the settings. */
export const getPaymentSettings = cache(async (): Promise<PaymentSettingsData> => {
  const row = await withDbErrorHandling(
    () =>
      prisma.paymentSettings.findUnique({
        where: { id: PAYMENT_SETTINGS_ID },
      }),
    "Database operation failed",
  );

  if (!row) {
    return defaultSettings();
  }

  return rowToSettings(row);
});

