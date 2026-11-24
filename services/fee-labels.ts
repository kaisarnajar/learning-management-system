import { paymentTypeFromText } from "@/services/status-compat";

/**
 * The labels fee submissions are stored under. Pure (no Prisma), so the
 * seeds and client code can import them; services/monthly-payments.ts
 * re-exports them.
 */

export function buildMonthlyFeeLabel(month: string, year: string, paymentType: string = "monthly"): string {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const index = Number.parseInt(month, 10) - 1;
  const monthName = monthNames[index] ?? month;

  const type = paymentTypeFromText(paymentType);
  if (type === "QUARTERLY") {
    return `Quarterly fee — starting ${monthName} ${year}`;
  }
  if (type === "HALF_YEARLY") {
    return `Half Yearly fee — starting ${monthName} ${year}`;
  }
  if (type === "YEARLY") {
    return `Yearly fee — starting ${monthName} ${year}`;
  }
  if (type === "ONE_TIME") {
    // Paid once per course, so the label names no year (older rows did:
    // "One-Time fee — 2026"); the period key is ONE_TIME either way.
    return "One-Time fee";
  }
  return `Monthly fee — ${monthName} ${year}`;
}

export function buildEnrollmentFeeLabel(courseTitle: string): string {
  return `Enrollment fee — ${courseTitle}`;
}
