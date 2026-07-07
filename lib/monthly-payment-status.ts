import { PAYMENTS, PAYMENT_SUBMISSION_UI } from "@/config/constants/payments";

export const PAYMENT_TYPE_MONTHLY = PAYMENTS.TYPES.MONTHLY_FEE;
export const PAYMENT_TYPE_QUARTERLY = PAYMENTS.TYPES.QUARTERLY_FEE;
export const PAYMENT_TYPE_HALF_YEARLY = PAYMENTS.TYPES.HALF_YEARLY_FEE;
export const PAYMENT_TYPE_YEARLY = PAYMENTS.TYPES.YEARLY_FEE;
export const PAYMENT_TYPE_ONE_TIME = PAYMENTS.TYPES.ONE_TIME;
export const PAYMENT_TYPE_ENROLLMENT = PAYMENTS.TYPES.ENROLLMENT;
export const PAYMENT_TYPE_MANUAL = PAYMENTS.TYPES.MANUAL;

export const INCOME_PAYMENT_TYPES = [
  PAYMENT_TYPE_ENROLLMENT,
  PAYMENT_TYPE_MONTHLY,
  PAYMENT_TYPE_QUARTERLY,
  PAYMENT_TYPE_HALF_YEARLY,
  PAYMENT_TYPE_YEARLY,
  PAYMENT_TYPE_ONE_TIME,
  PAYMENT_TYPE_MANUAL,
] as const;

export type IncomePaymentType = (typeof INCOME_PAYMENT_TYPES)[number];

export function incomePaymentTypeLabel(type: string | null | undefined): string {
  if (type === PAYMENT_TYPE_ENROLLMENT) return "Enrollment fee";
  if (type === PAYMENT_TYPE_MONTHLY) return "Monthly fee";
  if (type === PAYMENT_TYPE_QUARTERLY) return "Quarterly fee";
  if (type === PAYMENT_TYPE_HALF_YEARLY) return "Half Yearly fee";
  if (type === PAYMENT_TYPE_YEARLY) return "Yearly fee";
  if (type === PAYMENT_TYPE_ONE_TIME) return "One-Time fee";
  if (type === PAYMENT_TYPE_MANUAL) return "Manual";
  return type ?? "Unknown";
}

export const MONTHLY_PAYMENT_PENDING = PAYMENTS.SUBMISSION_STATUS.PENDING;
export const MONTHLY_PAYMENT_APPROVED = PAYMENTS.SUBMISSION_STATUS.APPROVED;
export const MONTHLY_PAYMENT_DECLINED = PAYMENTS.SUBMISSION_STATUS.REJECTED;

export function monthlyPaymentStatusLabel(status: string): string {
  return PAYMENT_SUBMISSION_UI[status]?.label || status.replace(/_/g, " ");
}

export function monthlyPaymentStatusClass(status: string): string {
  const variant = PAYMENT_SUBMISSION_UI[status]?.variant;
  if (variant === "success") return "bg-success-bg text-success-text";
  if (variant === "warning") return "bg-warning-bg text-warning-text";
  if (variant === "destructive") return "bg-destructive-bg text-destructive-text";
  return "bg-surface-muted-hover text-muted";
}
