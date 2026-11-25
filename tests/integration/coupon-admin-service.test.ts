import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import {
  approveWaiverRequest,
  createCoupon,
  editCoupon,
  rejectWaiverRequest,
  removeCoupon,
  removeWaiverRequest,
  type CouponInput,
} from "@/services/coupon-admin-actions";
import { createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

/**
 * The service behind the admin coupon actions answers with typed results;
 * the lifecycle itself is covered through the actions in
 * waiver-requests.test.ts.
 */
const input = (overrides: Partial<CouponInput> = {}): CouponInput => ({
  code: "SPRING10",
  percentage: "10",
  validFrom: "2026-01-01",
  validUntil: "2036-01-01",
  courseId: "",
  gender: "",
  isActive: true,
  applyTo: "BOTH",
  ...overrides,
});

describe.skipIf(SKIP_WITHOUT_DB)("coupon admin service", () => {
  beforeEach(resetDb);

  it("creates a coupon and answers a duplicate code with 409", async () => {
    expect(await createCoupon(input())).toEqual({ ok: true });
    expect(await createCoupon(input())).toEqual({ ok: false, status: 409, error: "A coupon with this code already exists." });
    expect(await createCoupon(input({ code: "", percentage: "500" }))).toMatchObject({ ok: false, status: 400 });
  });

  it("answers missing coupons and requests with 404", async () => {
    const session = sessionFor(await createUser({ email: "admin@example.test" }), "ADMIN") as never;
    expect(await editCoupon("missing", input())).toMatchObject({ ok: false, status: 404 });
    expect(await removeCoupon(session, "missing")).toMatchObject({ ok: false, status: 404 });
    expect(await rejectWaiverRequest("missing")).toMatchObject({ ok: false, status: 404 });
    expect(await removeWaiverRequest(session, "missing")).toMatchObject({ ok: false, status: 404 });
    expect(await approveWaiverRequest("missing", 50, "2036-01-01")).toMatchObject({ ok: false, status: 404 });
  });

  it("refuses an approval with an invalid discount before reading the request", async () => {
    expect(await approveWaiverRequest("missing", 0, "2036-01-01")).toMatchObject({ ok: false, status: 400 });
  });

  it("deletes an unused coupon and reports it was not deactivated", async () => {
    const session = sessionFor(await createUser({ email: "admin@example.test" }), "ADMIN") as never;
    await createCoupon(input());
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { code: "SPRING10" } });

    expect(await removeCoupon(session, coupon.id)).toEqual({ ok: true, deactivated: false });
    expect(await prisma.coupon.count()).toBe(0);
  });
});
