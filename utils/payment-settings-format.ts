/**
 * Payment settings shapes and formatting.
 * Pure (no Prisma, no server APIs), so client components import them
 * here; the service module re-exports them for server code.
 */

/** The id of the single PaymentSettings row. */
export const PAYMENT_SETTINGS_ID = "default";

export type BankDetails = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
};

export type PaymentSettingsData = {
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
};

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
