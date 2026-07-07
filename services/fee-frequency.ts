/**
 * Fee Frequency — central definitions for course-level fee scheduling.
 *
 * `monthlyFeeInrPaise` on the Course model stores the base fee for the
 * configured billing period (NOT necessarily a per-month amount).
 *
 * Legacy courses (feeFrequency = null) are treated as MONTHLY.
 */

export type FeeFrequencyValue =
  | "MONTHLY"
  | "EVERY_3_MONTHS"
  | "EVERY_6_MONTHS"
  | "YEARLY"
  | "ONE_TIME";

export type FeeFrequencyOption = {
  value: FeeFrequencyValue;
  /** Human-readable label shown to Admins and Students. */
  label: string;
  /** Short suffix shown after the price (e.g. "₹499 / month"). */
  suffix: string;
  /** paymentType string used in CoursePaymentSubmission records. */
  paymentType: string;
  /**
   * Multiplier relative to one month — only meaningful for recurring plans.
   * ONE_TIME uses 1 (the stored amount is the full price).
   */
  multiplier: number;
};

export const FEE_FREQUENCY_OPTIONS: FeeFrequencyOption[] = [
  {
    value: "MONTHLY",
    label: "Monthly",
    suffix: "/ month",
    paymentType: "monthly",
    multiplier: 1,
  },
  {
    value: "EVERY_3_MONTHS",
    label: "Every 3 Months",
    suffix: "/ 3 months",
    paymentType: "quarterly",
    multiplier: 3,
  },
  {
    value: "EVERY_6_MONTHS",
    label: "Every 6 Months",
    suffix: "/ 6 months",
    paymentType: "half_yearly",
    multiplier: 6,
  },
  {
    value: "YEARLY",
    label: "Yearly",
    suffix: "/ year",
    paymentType: "yearly",
    multiplier: 12,
  },
  {
    value: "ONE_TIME",
    label: "One-Time",
    suffix: "(one-time)",
    paymentType: "one_time",
    multiplier: 1,
  },
];

const FALLBACK = FEE_FREQUENCY_OPTIONS[0]; // MONTHLY

function resolveOption(freq?: string | null): FeeFrequencyOption {
  if (!freq) return FALLBACK;
  return FEE_FREQUENCY_OPTIONS.find((o) => o.value === freq) ?? FALLBACK;
}

export function getFeeFrequencyOption(freq?: string | null): FeeFrequencyOption {
  return resolveOption(freq);
}

export function getFeeFrequencyLabel(freq?: string | null): string {
  return resolveOption(freq).label;
}

export function getFeeFrequencySuffix(freq?: string | null): string {
  return resolveOption(freq).suffix;
}

export function getFeeFrequencyPaymentType(freq?: string | null): string {
  return resolveOption(freq).paymentType;
}


export function isOneTimeFee(freq?: string | null): boolean {
  return resolveOption(freq).value === "ONE_TIME";
}

