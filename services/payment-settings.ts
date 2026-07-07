import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { BRAND_CONFIG } from "@/config/brand";

export type BankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
};

export const PAYMENT_SETTINGS_ID = "default";

export type PaymentSettingsData = {
  upiId: string;
  upiNumber: string;
  upiPayeeName: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
};

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
  };
}

export async function getPaymentSettings(): Promise<PaymentSettingsData> {
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
}

export function toBankDetails(settings: PaymentSettingsData): BankDetails {
  return {
    accountName: settings.bankAccountName,
    bankName: settings.bankName,
    accountNumber: settings.bankAccountNumber,
    ifsc: settings.bankIfsc,
    branch: settings.bankBranch,
  };
}

export function isUpiConfiguredFromSettings(settings: PaymentSettingsData): boolean {
  return Boolean(settings.upiId.trim());
}
