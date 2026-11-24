export const PAYMENTS = {
  GST_PERCENTAGE: 18,
  
  // Legacy text values of paymentType (CoursePaymentSubmission, PaymentRecord).
  // The typed twin is the PaymentType enum; see services/status-compat.ts.
  TYPES: {
    MONTHLY_FEE: "monthly",
    QUARTERLY_FEE: "quarterly",
    HALF_YEARLY_FEE: "half_yearly",
    YEARLY_FEE: "yearly",
    ONE_TIME: "one_time",
    BOOK_ORDER: "book_purchase",
    ENROLLMENT: "enrollment",
    MANUAL: "manual",
  },

  // Legacy text values of CoursePaymentSubmission.status; typed twin is
  // PaymentSubmissionStatus (REJECTED here is DECLINED there).
  SUBMISSION_STATUS: {
    PENDING: "pending_verification",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
} as const;

/**
 * Bounds of a manually recorded payment, in rupees. The upper bound keeps a
 * typo (or a pasted reference number) out of the books and well inside the
 * database's 32-bit paise column.
 */
export const MANUAL_PAYMENT_MIN_INR = 1;
export const MANUAL_PAYMENT_MAX_INR = 10_00_000;

/** Shown when a fee that costs money is submitted with neither a UTR nor a screenshot. */
export const PAYMENT_PROOF_REQUIRED_MESSAGE =
  "Enter the transaction reference (UTR) or upload a screenshot of the payment.";

export const PAYMENT_SUBMISSION_UI: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [PAYMENTS.SUBMISSION_STATUS.PENDING]: { label: "Pending Verification", variant: "warning" },
  [PAYMENTS.SUBMISSION_STATUS.APPROVED]: { label: "Approved", variant: "success" },
  [PAYMENTS.SUBMISSION_STATUS.REJECTED]: { label: "Rejected", variant: "destructive" },
};

/** The submission fields a receipt reads; select exactly these wherever a receipt is rendered. */
export const RECEIPT_SUBMISSION_SELECT = {
  paymentMethod: true,
  upiTransactionId: true,
  label: true,
  couponId: true,
  baseFeePaise: true,
} as const;
