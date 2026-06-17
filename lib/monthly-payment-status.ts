export const PAYMENT_TYPE_MONTHLY = "monthly" as const;
export const PAYMENT_TYPE_ENROLLMENT = "enrollment" as const;
export const PAYMENT_TYPE_MANUAL = "manual" as const;

export const INCOME_PAYMENT_TYPES = [
  PAYMENT_TYPE_ENROLLMENT,
  PAYMENT_TYPE_MONTHLY,
  PAYMENT_TYPE_MANUAL,
] as const;

export type IncomePaymentType = (typeof INCOME_PAYMENT_TYPES)[number];

export function incomePaymentTypeLabel(type: string | null | undefined): string {
  if (type === PAYMENT_TYPE_ENROLLMENT) return "Enrollment fee";
  if (type === PAYMENT_TYPE_MONTHLY) return "Monthly fee";
  if (type === PAYMENT_TYPE_MANUAL) return "Manual";
  return type ?? "Unknown";
}

export const MONTHLY_PAYMENT_PENDING = "pending_verification" as const;
export const MONTHLY_PAYMENT_APPROVED = "approved" as const;
export const MONTHLY_PAYMENT_DECLINED = "declined" as const;

export function monthlyPaymentStatusLabel(status: string): string {
  if (status === MONTHLY_PAYMENT_PENDING) return "Awaiting verification";
  if (status === MONTHLY_PAYMENT_APPROVED) return "Approved";
  if (status === MONTHLY_PAYMENT_DECLINED) return "Declined — resubmit";
  return status.replace(/_/g, " ");
}

export function monthlyPaymentStatusClass(status: string): string {
  if (status === MONTHLY_PAYMENT_APPROVED) return "bg-success-bg text-success-text";
  if (status === MONTHLY_PAYMENT_PENDING) return "bg-warning-bg text-warning-text";
  if (status === MONTHLY_PAYMENT_DECLINED) return "bg-red-100 text-red-900";
  return "bg-surface-muted-hover text-stone-700";
}
