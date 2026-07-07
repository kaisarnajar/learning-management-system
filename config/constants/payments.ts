export const PAYMENTS = {
  GST_PERCENTAGE: 18,
  
  // Stored string constants in DB for payment types
  TYPES: {
    MONTHLY_FEE: "monthly",
    QUARTERLY_FEE: "quarterly",
    HALF_YEARLY_FEE: "half_yearly",
    YEARLY_FEE: "yearly",
    ADMISSION_FEE: "admission_fee",
    ONE_TIME: "one_time",
    CERTIFICATE_FEE: "certificate",
    ID_CARD_FEE: "id_card",
    BOOK_ORDER: "book_order",
    ENROLLMENT: "enrollment",
    MANUAL: "manual",
  },
  
  // Statuses for Payment Submissions (manual UPI flows)
  SUBMISSION_STATUS: {
    PENDING: "pending_verification",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
  
  // Common expense categories for Finance module
  EXPENSE_CATEGORIES: [
    "Salary",
    "Server Hosting",
    "Domain",
    "Marketing",
    "Office Supplies",
    "Miscellaneous"
  ]
} as const;

export const PAYMENT_SUBMISSION_UI: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" }> = {
  [PAYMENTS.SUBMISSION_STATUS.PENDING]: { label: "Pending Verification", variant: "warning" },
  [PAYMENTS.SUBMISSION_STATUS.APPROVED]: { label: "Approved", variant: "success" },
  [PAYMENTS.SUBMISSION_STATUS.REJECTED]: { label: "Rejected", variant: "destructive" },
};
