import { BRAND_CONFIG } from "@/config/brand";

export const INVOICE_TERMS = [
  "No Fee Refund Policy: Once the fee is paid, it is non-refundable under any circumstances.",
  `Terms Subject to Change: ${BRAND_CONFIG.organizationName} Academy reserves the right to change the terms and conditions at any time without prior notice. Please regularly check our official platforms for updates.`,
] as const;

export const AUTHORITY_SIGNATURE = {
  name: "Authorized Signatory",
  designation: "Academy Administrator",
} as const;
