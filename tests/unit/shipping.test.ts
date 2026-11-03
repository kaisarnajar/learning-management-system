import { describe, expect, it } from "vitest";
import { computeShippingCharge, validateSlabSet } from "@/services/book-orders";

const slab = (minWeightGrams: number, maxWeightGrams: number, chargeInrPaise: number) => ({
  minWeightGrams,
  maxWeightGrams,
  chargeInrPaise,
});

const SLABS = [slab(0, 500, 5000), slab(501, 1000, 8000), slab(1001, 2000, 12000)];

describe("computeShippingCharge", () => {
  it("is free when no slabs are configured", () => {
    expect(computeShippingCharge(750, [])).toBe(0);
  });

  it("uses the slab containing the weight, bounds included", () => {
    expect(computeShippingCharge(0, SLABS)).toBe(5000);
    expect(computeShippingCharge(500, SLABS)).toBe(5000);
    expect(computeShippingCharge(501, SLABS)).toBe(8000);
    expect(computeShippingCharge(1000, SLABS)).toBe(8000);
    expect(computeShippingCharge(2000, SLABS)).toBe(12000);
  });

  it("does not depend on the order the slabs are given in", () => {
    expect(computeShippingCharge(700, [...SLABS].reverse())).toBe(8000);
  });

  it("charges the next higher slab for a weight that falls in a gap", () => {
    const gapped = [slab(0, 500, 5000), slab(700, 1000, 9000)];
    expect(computeShippingCharge(600, gapped)).toBe(9000);
  });

  it("charges the lowest slab for weights below it and for negative weights", () => {
    const offset = [slab(100, 500, 5000), slab(501, 1000, 8000)];
    expect(computeShippingCharge(50, offset)).toBe(5000);
    expect(computeShippingCharge(-20, SLABS)).toBe(5000);
  });

  it("charges the highest slab above the last bound", () => {
    expect(computeShippingCharge(5000, SLABS)).toBe(12000);
  });
});

describe("validateSlabSet", () => {
  it("accepts a contiguous set starting at 0", () => {
    expect(validateSlabSet(SLABS)).toEqual([]);
    expect(validateSlabSet([])).toEqual([]);
  });

  it("requires the first slab to start at 0", () => {
    expect(validateSlabSet([slab(10, 500, 1)])).toEqual([expect.stringContaining("must start at 0 g")]);
  });

  it("reports empty ranges", () => {
    expect(validateSlabSet([slab(0, 0, 1)])).toEqual([expect.stringContaining("has no range")]);
  });

  it("reports overlaps", () => {
    const errors = validateSlabSet([slab(0, 500, 1), slab(400, 900, 2)]);
    expect(errors).toEqual([expect.stringContaining("overlap")]);
  });

  it("reports gaps", () => {
    const errors = validateSlabSet([slab(0, 500, 1), slab(600, 900, 2)]);
    expect(errors).toEqual([expect.stringContaining("Gap between 500 g and 600 g")]);
  });
});
