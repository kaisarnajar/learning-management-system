import { describe, expect, it } from "vitest";
import { buildPeriodKey, periodKeyFromLabel, stripWaiverSuffix } from "@/services/payment-period";
import { buildEnrollmentFeeLabel, buildMonthlyFeeLabel } from "@/services/monthly-payments";

describe("billing period keys", () => {
  it("names the period each frequency covers", () => {
    expect(buildPeriodKey("MONTHLY", 1, 2026)).toBe("MONTHLY:2026-01");
    expect(buildPeriodKey("MONTHLY", 12, 2026)).toBe("MONTHLY:2026-12");
    expect(buildPeriodKey("QUARTERLY", 1, 2026)).toBe("QUARTERLY:2026-Q1");
    expect(buildPeriodKey("QUARTERLY", 3, 2026)).toBe("QUARTERLY:2026-Q1");
    expect(buildPeriodKey("QUARTERLY", 4, 2026)).toBe("QUARTERLY:2026-Q2");
    expect(buildPeriodKey("QUARTERLY", 12, 2026)).toBe("QUARTERLY:2026-Q4");
    expect(buildPeriodKey("HALF_YEARLY", 6, 2026)).toBe("HALF_YEARLY:2026-H1");
    expect(buildPeriodKey("HALF_YEARLY", 7, 2026)).toBe("HALF_YEARLY:2026-H2");
    expect(buildPeriodKey("YEARLY", 9, 2026)).toBe("YEARLY:2026");
    // Not tied to a year: a one-time fee is paid once per course.
    expect(buildPeriodKey("ONE_TIME", 1, 2026)).toBe("ONE_TIME");
    expect(buildPeriodKey("ONE_TIME", 1, 2027)).toBe("ONE_TIME");
    expect(buildPeriodKey("ENROLLMENT", 0, 0)).toBe("ENROLLMENT");
  });

  it("has no key for types without a period, or an impossible month or year", () => {
    expect(buildPeriodKey("MANUAL", 1, 2026)).toBeNull();
    expect(buildPeriodKey("BOOK_PURCHASE", 1, 2026)).toBeNull();
    expect(buildPeriodKey("MONTHLY", 0, 2026)).toBeNull();
    expect(buildPeriodKey("MONTHLY", 13, 2026)).toBeNull();
    expect(buildPeriodKey("MONTHLY", 1, 26)).toBeNull();
    expect(buildPeriodKey("MONTHLY", Number.NaN, 2026)).toBeNull();
  });

  it("consecutive periods of one frequency never share a key", () => {
    const steps = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, YEARLY: 12 } as const;
    for (const [type, step] of Object.entries(steps) as Array<[keyof typeof steps, number]>) {
      for (let start = 1; start <= 12; start++) {
        const keys = new Set<string>();
        for (let n = 0; n < 8; n++) {
          const index = start - 1 + n * step;
          keys.add(buildPeriodKey(type, (index % 12) + 1, 2026 + Math.floor(index / 12))!);
        }
        expect(keys.size, `${type} starting month ${start}`).toBe(8);
      }
    }
  });
});

describe("periodKeyFromLabel", () => {
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  it("reads every label buildMonthlyFeeLabel writes", () => {
    for (const month of months) {
      const m = Number(month);
      expect(periodKeyFromLabel("MONTHLY", buildMonthlyFeeLabel(month, "2026", "monthly"))).toBe(`MONTHLY:2026-${month}`);
      expect(periodKeyFromLabel("QUARTERLY", buildMonthlyFeeLabel(month, "2026", "quarterly"))).toBe(buildPeriodKey("QUARTERLY", m, 2026));
      expect(periodKeyFromLabel("HALF_YEARLY", buildMonthlyFeeLabel(month, "2027", "half_yearly"))).toBe(buildPeriodKey("HALF_YEARLY", m, 2027));
      expect(periodKeyFromLabel("YEARLY", buildMonthlyFeeLabel(month, "2028", "yearly"))).toBe("YEARLY:2028");
    }
    expect(periodKeyFromLabel("ONE_TIME", buildMonthlyFeeLabel("01", "2026", "one_time"))).toBe("ONE_TIME");
    expect(periodKeyFromLabel("ONE_TIME", buildMonthlyFeeLabel("05", "2031", "one_time"))).toBe("ONE_TIME");
    // Rows written before the one-time label dropped its year.
    expect(periodKeyFromLabel("ONE_TIME", "One-Time fee — 2026")).toBe("ONE_TIME");
  });

  it("reads the enrollment fee label, whatever the course title", () => {
    expect(periodKeyFromLabel("ENROLLMENT", buildEnrollmentFeeLabel("Tajweed Foundations"))).toBe("ENROLLMENT");
    expect(periodKeyFromLabel("ENROLLMENT", buildEnrollmentFeeLabel("Arabic — Level 2 (Evening)"))).toBe("ENROLLMENT");
  });

  it("ignores the coupon text the submit paths append", () => {
    const label = buildMonthlyFeeLabel("01", "2026", "monthly");
    expect(stripWaiverSuffix(`${label} (30% Fee Waiver)`)).toBe(label);
    expect(periodKeyFromLabel("MONTHLY", `${label} (30% Fee Waiver)`)).toBe("MONTHLY:2026-01");
    expect(periodKeyFromLabel("MONTHLY", `${label} (100% Fee Waiver)`)).toBe("MONTHLY:2026-01");
    expect(periodKeyFromLabel("ENROLLMENT", `${buildEnrollmentFeeLabel("Tajweed")} (50% Fee Waiver)`)).toBe("ENROLLMENT");
    expect(periodKeyFromLabel("ONE_TIME", "One-Time fee — 2026 (100% Fee Waiver)")).toBe("ONE_TIME");
  });

  it("infers the type from the label for rows that have none", () => {
    expect(periodKeyFromLabel(null, "Monthly fee — March 2026")).toBe("MONTHLY:2026-03");
    expect(periodKeyFromLabel(null, "Quarterly fee — starting May 2026")).toBe("QUARTERLY:2026-Q2");
  });

  it("tolerates the other dashes and casing older rows may carry", () => {
    expect(periodKeyFromLabel("MONTHLY", "Monthly fee - January 2026")).toBe("MONTHLY:2026-01");
    expect(periodKeyFromLabel("MONTHLY", "Monthly fee – january 2026")).toBe("MONTHLY:2026-01");
    expect(periodKeyFromLabel("HALF_YEARLY", "Half-Yearly fee — starting July 2026")).toBe("HALF_YEARLY:2026-H2");
  });

  it("returns null for labels it cannot place, or that contradict the row's type", () => {
    expect(periodKeyFromLabel("MONTHLY", "Fee for January")).toBeNull();
    expect(periodKeyFromLabel("MONTHLY", "Monthly fee — Janvier 2026")).toBeNull();
    expect(periodKeyFromLabel("MONTHLY", "Monthly fee — 13 2026")).toBeNull();
    expect(periodKeyFromLabel("MONTHLY", "Quarterly fee — starting January 2026")).toBeNull();
    expect(periodKeyFromLabel("MANUAL", "Monthly fee — January 2026")).toBeNull();
    expect(periodKeyFromLabel(null, "")).toBeNull();
  });
});
