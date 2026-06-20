/** Academy details shown on payment invoices / receipts. */
export const ACADEMY_INVOICE = {
  name: "Darse Quran Academy",
  addressLine1: "Treran Tangmarg",
  addressLine2: "Baramulla J&K 193402",
  phone: "+91 9622966911",
  email: "darsequraann@gmail.com",
  website: "www.daraequrann.blogspot.com",
} as const;

export const INVOICE_TERMS = [
  "No Fee Refund Policy: Once the fee is paid, it is non-refundable under any circumstances.",
  "Terms Subject to Change: Darse-Quran Academy reserves the right to change the terms and conditions at any time without prior notice. Please regularly check our official platforms for updates.",
] as const;

export const AUTHORITY_SIGNATURE = {
  name: "Authorized Signatory",
  designation: "Finance Department",
} as const;
