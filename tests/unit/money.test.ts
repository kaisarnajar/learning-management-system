import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/utils/prisma";
import { calculateDiscountedAmount, getSelectedCoupon } from "@/services/coupons";
import { splitInclusiveGst } from "@/services/gst";

describe("calculateDiscountedAmount", () => {
  it("returns the original amount for 0% or a negative percentage", () => {
    expect(calculateDiscountedAmount(50000, 0)).toBe(50000);
    expect(calculateDiscountedAmount(50000, -10)).toBe(50000);
  });

  it("is free at 100% or above", () => {
    expect(calculateDiscountedAmount(50000, 100)).toBe(0);
    expect(calculateDiscountedAmount(50000, 150)).toBe(0);
  });

  it("rounds the discount down so the student never pays less than due", () => {
    // 10% of 99 paise = 9.9 -> discount 9 -> pays 90
    expect(calculateDiscountedAmount(99, 10)).toBe(90);
    expect(calculateDiscountedAmount(34900, 25)).toBe(26175);
    expect(calculateDiscountedAmount(1, 50)).toBe(1);
  });
});

describe("splitInclusiveGst", () => {
  it("splits an inclusive amount at 18% as P*18/118", () => {
    expect(splitInclusiveGst(10000, 18)).toEqual({ basePaise: 8475, gstPaise: 1525 });
    expect(splitInclusiveGst(11800, 18)).toEqual({ basePaise: 10000, gstPaise: 1800 });
  });

  it("defaults to the configured GST percentage (18)", () => {
    expect(splitInclusiveGst(11800)).toEqual({ basePaise: 10000, gstPaise: 1800 });
  });

  it("always sums back to the total", () => {
    for (const total of [1, 7, 99, 12345, 349900]) {
      const { basePaise, gstPaise } = splitInclusiveGst(total, 18);
      expect(basePaise + gstPaise).toBe(total);
    }
  });

  it("charges no tax on zero, negative or zero-rate amounts", () => {
    expect(splitInclusiveGst(0)).toEqual({ basePaise: 0, gstPaise: 0 });
    expect(splitInclusiveGst(-500)).toEqual({ basePaise: 0, gstPaise: 0 });
    expect(splitInclusiveGst(10000, 0)).toEqual({ basePaise: 10000, gstPaise: 0 });
  });
});

describe("getSelectedCoupon", () => {
  const findMany = vi.fn();

  beforeEach(() => {
    findMany.mockReset();
    Object.assign(prisma, {
      paymentSettings: { findUnique: vi.fn().mockResolvedValue({ feeWaiverEnabled: true }) },
      user: { findUnique: vi.fn().mockResolvedValue({ gender: "MALE" }) },
      couponUsage: { findMany: vi.fn().mockResolvedValue([]) },
      coursePaymentSubmission: { findMany: vi.fn().mockResolvedValue([]) },
      coupon: { findMany },
    });
  });

  const coupon = (id: string, code: string, percentage: number) => ({
    id,
    code,
    percentage,
    type: "DEFAULT",
    gender: null,
    userId: null,
    validUntil: new Date(Date.now() + 86_400_000),
    applyToEnrollment: true,
    applyToCourse: true,
  });

  it("applies no coupon when none was selected, even if one is available", async () => {
    findMany.mockResolvedValue([coupon("c1", "SAVE50", 50)]);
    await expect(getSelectedCoupon("u1", "course1", "course", null)).resolves.toBeNull();
    await expect(getSelectedCoupon("u1", "course1", "course", undefined)).resolves.toBeNull();
    await expect(getSelectedCoupon("u1", "course1", "course", "none")).resolves.toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns the explicitly selected coupon by id or code", async () => {
    findMany.mockResolvedValue([coupon("c1", "SAVE50", 50), coupon("c2", "SAVE10", 10)]);
    expect((await getSelectedCoupon("u1", "course1", "course", "c2"))?.code).toBe("SAVE10");
    expect((await getSelectedCoupon("u1", "course1", "course", "SAVE50"))?.id).toBe("c1");
  });

  it("returns null for an unknown or already used coupon", async () => {
    findMany.mockResolvedValue([coupon("c1", "SAVE50", 50)]);
    await expect(getSelectedCoupon("u1", "course1", "course", "missing")).resolves.toBeNull();

    Object.assign(prisma, { couponUsage: { findMany: vi.fn().mockResolvedValue([{ couponId: "c1" }]) } });
    await expect(getSelectedCoupon("u1", "course1", "course", "c1")).resolves.toBeNull();
  });

  it("returns null when fee waivers are switched off", async () => {
    Object.assign(prisma, { paymentSettings: { findUnique: vi.fn().mockResolvedValue({ feeWaiverEnabled: false }) } });
    await expect(getSelectedCoupon("u1", "course1", "course", "c1")).resolves.toBeNull();
  });
});
