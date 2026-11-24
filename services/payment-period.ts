import type { PaymentType } from "@prisma/client";

/**
 * The billing period a fee submission pays for, as a stable key:
 *
 *   MONTHLY:2026-01      the month
 *   QUARTERLY:2026-Q1    the calendar quarter the period starts in
 *   HALF_YEARLY:2026-H1  the calendar half the period starts in
 *   YEARLY:2026          the calendar year the period starts in
 *   ONE_TIME             once per course, whatever the year
 *   ENROLLMENT           once per course
 *
 * The label shown to people embeds coupon text ("… (30% Fee Waiver)"), so it
 * cannot tell two payments for the same period apart; this key can. Two
 * periods of one frequency that start in the same bucket always overlap, so a
 * regular schedule never collides with itself.
 *
 * Kept free of runtime imports: scripts/backfill-period-key.ts uses it too.
 */

const MONTH_NAMES = [
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
] as const;

/** The key for a period of [type] starting in [month] (1–12) of [year]; null for types that have no period. */
export function buildPeriodKey(type: PaymentType, month: number, year: number): string | null {
  if (type === "ENROLLMENT") return "ENROLLMENT";
  if (type === "ONE_TIME") return "ONE_TIME";
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1000 || year > 9999) return null;
  switch (type) {
    case "MONTHLY":
      return `MONTHLY:${year}-${String(month).padStart(2, "0")}`;
    case "QUARTERLY":
      return `QUARTERLY:${year}-Q${Math.ceil(month / 3)}`;
    case "HALF_YEARLY":
      return `HALF_YEARLY:${year}-H${month <= 6 ? 1 : 2}`;
    case "YEARLY":
      return `YEARLY:${year}`;
    default:
      return null;
  }
}

const DASH = "\\s*[—–-]\\s*";
const MONTH = `(${MONTH_NAMES.join("|")})`;
const LABEL_PATTERNS: Array<{ type: PaymentType; pattern: RegExp }> = [
  { type: "MONTHLY", pattern: new RegExp(`^Monthly fee${DASH}${MONTH} (\\d{4})$`, "i") },
  { type: "QUARTERLY", pattern: new RegExp(`^Quarterly fee${DASH}starting ${MONTH} (\\d{4})$`, "i") },
  { type: "HALF_YEARLY", pattern: new RegExp(`^Half[ -]Yearly fee${DASH}starting ${MONTH} (\\d{4})$`, "i") },
  { type: "YEARLY", pattern: new RegExp(`^Yearly fee${DASH}starting ${MONTH} (\\d{4})$`, "i") },
  { type: "ONE_TIME", pattern: new RegExp(`^One[ -]Time fee${DASH}(\\d{4})$`, "i") },
  { type: "ENROLLMENT", pattern: new RegExp(`^Enrollment fee${DASH}.+$`, "i") },
];

/** A label without the coupon text the submit paths append ("… (30% Fee Waiver)"). */
export function stripWaiverSuffix(label: string): string {
  return label.replace(/\s*\(\d{1,3}% Fee Waiver\)\s*$/i, "").trim();
}

/**
 * The period key for a stored submission, from its label (as written by
 * buildMonthlyFeeLabel / buildEnrollmentFeeLabel) and its payment type. Null
 * when the label is not one of those formats, or names a different type than
 * the row's [type] (the row then needs a person to look at it).
 */
export function periodKeyFromLabel(type: PaymentType | null, label: string): string | null {
  const base = stripWaiverSuffix(label);
  for (const { type: labelType, pattern } of LABEL_PATTERNS) {
    const match = pattern.exec(base);
    if (!match) continue;
    if (type && type !== labelType) return null;
    if (labelType === "ENROLLMENT" || labelType === "ONE_TIME") return labelType;
    const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === match[1]!.toLowerCase()) + 1;
    return buildPeriodKey(labelType, month, Number(match[2]));
  }
  return null;
}
