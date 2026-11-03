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

export const PAYMENT_SUBMISSION_UI: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [PAYMENTS.SUBMISSION_STATUS.PENDING]: { label: "Pending Verification", variant: "warning" },
  [PAYMENTS.SUBMISSION_STATUS.APPROVED]: { label: "Approved", variant: "success" },
  [PAYMENTS.SUBMISSION_STATUS.REJECTED]: { label: "Rejected", variant: "destructive" },
};
