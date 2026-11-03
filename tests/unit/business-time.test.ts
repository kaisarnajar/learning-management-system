import { describe, expect, it } from "vitest";
import {
  businessCalendarParts,
  businessDateString,
  businessDayEnd,
  businessDayStart,
  formatBusinessDate,
} from "@/services/business-time";
import { buildFinanceQueryString, financePaidAtWhere, parseFinanceFilters } from "@/services/finance-filters";

// India has no DST: IST is always UTC+05:30.
describe("business day boundaries (Asia/Kolkata)", () => {
  it("starts the day at 00:00 IST, i.e. 18:30 UTC the day before", () => {
    expect(businessDayStart("2026-03-01")?.toISOString()).toBe("2026-02-28T18:30:00.000Z");
  });

  it("ends the day at 23:59:59.999 IST", () => {
    expect(businessDayEnd("2026-03-01")?.toISOString()).toBe("2026-03-01T18:29:59.999Z");
  });

  it("rejects malformed and overflowed dates instead of rolling over", () => {
    expect(businessDayStart(undefined)).toBeNull();
    expect(businessDayStart("")).toBeNull();
    expect(businessDayStart("01-03-2026")).toBeNull();
    expect(businessDayStart("2026-02-31")).toBeNull();
    expect(businessDayEnd("2026-13-01")).toBeNull();
  });

  it("formats an instant as its IST calendar day", () => {
    // 20:00 UTC on 28 Feb is already 1 March in IST.
    expect(formatBusinessDate(new Date("2026-02-28T20:00:00Z"))).toBe("2026-03-01");
    expect(formatBusinessDate(new Date("2026-02-28T18:29:59Z"))).toBe("2026-02-28");
  });

  it("round-trips a day through start and end", () => {
    expect(formatBusinessDate(businessDayStart("2026-07-15")!)).toBe("2026-07-15");
    expect(formatBusinessDate(businessDayEnd("2026-07-15")!)).toBe("2026-07-15");
  });

  it("derives calendar parts and date strings in IST", () => {
    expect(businessCalendarParts(new Date("2026-02-28T20:00:00Z"))).toEqual({ year: 2026, month: 2, day: 1 });
    expect(businessDateString(2026, 12, 1)).toBe("2027-01-01");
    expect(businessDateString(2026, 3, 0)).toBe("2026-03-31");
  });
});

describe("parseFinanceFilters presets", () => {
  // 1 March 2026, 01:00 IST == 28 Feb 19:30 UTC: the server is still in February.
  const now = new Date("2026-02-28T19:30:00Z");

  it("defaults to this month in IST, not in UTC", () => {
    const filters = parseFinanceFilters({}, now);
    expect(filters.preset).toBe("this_month");
    expect(filters.from?.toISOString()).toBe("2026-02-28T18:30:00.000Z");
    expect(filters.to?.toISOString()).toBe("2026-03-31T18:29:59.999Z");
  });

  it("resolves last month, this year and all time", () => {
    const last = parseFinanceFilters({ preset: "last_month" }, now);
    expect(formatBusinessDate(last.from!)).toBe("2026-02-01");
    expect(formatBusinessDate(last.to!)).toBe("2026-02-28");

    const year = parseFinanceFilters({ preset: "this_year" }, now);
    expect(formatBusinessDate(year.from!)).toBe("2026-01-01");
    expect(formatBusinessDate(year.to!)).toBe("2026-12-31");

    const all = parseFinanceFilters({ preset: "all_time" }, now);
    expect(all.from).toBeNull();
    expect(all.to).toBeNull();
    expect(financePaidAtWhere(all)).toBeUndefined();
  });

  it("wraps last month across a year boundary", () => {
    const january = new Date("2026-01-15T06:00:00Z");
    const last = parseFinanceFilters({ preset: "last_month" }, january);
    expect(formatBusinessDate(last.from!)).toBe("2025-12-01");
    expect(formatBusinessDate(last.to!)).toBe("2025-12-31");
  });

  it("treats from/to as a custom range in IST", () => {
    const filters = parseFinanceFilters({ from: "2026-03-05", to: "2026-03-06" }, now);
    expect(filters.preset).toBe("custom");
    expect(filters.from?.toISOString()).toBe("2026-03-04T18:30:00.000Z");
    expect(filters.to?.toISOString()).toBe("2026-03-06T18:29:59.999Z");
    expect(financePaidAtWhere(filters)).toEqual({ gte: filters.from, lte: filters.to });
  });

  it("ignores unknown tab, payment type and category values", () => {
    const filters = parseFinanceFilters({ tab: "x", paymentType: "bogus", category: "bogus" }, now);
    expect(filters.tab).toBe("income");
    expect(filters.paymentType).toBeUndefined();
    expect(filters.category).toBeUndefined();
  });

  it("only keeps teacherId for the teacher-salary category", () => {
    expect(parseFinanceFilters({ category: "marketing", teacherId: "t1" }, now).teacherId).toBeUndefined();
    expect(parseFinanceFilters({ category: "teacher_salary", teacherId: "t1" }, now).teacherId).toBe("t1");
  });

  it("serialises filters back to a query string using IST dates", () => {
    const filters = parseFinanceFilters({ preset: "custom", from: "2026-03-05", to: "2026-03-06" }, now);
    const qs = buildFinanceQueryString(filters);
    expect(qs).toContain("preset=custom");
    expect(qs).toContain("from=2026-03-05");
    expect(qs).toContain("to=2026-03-06");
    expect(buildFinanceQueryString({ preset: "this_month" })).toBe("");
  });
});
