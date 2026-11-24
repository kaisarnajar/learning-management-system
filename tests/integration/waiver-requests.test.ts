import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { approveCouponRequest, deleteCouponRequest, rejectCouponRequest } from "@/app/admin/coupons/actions";
import { confirmMonthlyPayment } from "@/app/admin/payments/actions";
import { processEnrollmentPayment } from "@/services/payments";
import { getApplicableCoupons } from "@/services/coupons";
import { withIssuedCouponCodes } from "@/services/waiver-requests";
import { sendFeeWaiverApprovedEmail, sendFeeWaiverRejectedEmail } from "@/services/email";
import { createCourse, createUser, resetDb, runAction, sessionFor, setPaymentSettings, SKIP_WITHOUT_DB, startedEnrollment } from "../helpers/db";

/** A date a month ahead, as the approval form sends it. */
const validUntil = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

async function loginAsAdmin() {
  const admin = await createUser({ email: "admin@example.test", name: "Admin" });
  vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
}

async function pendingRequest(feeType: "ENROLLMENT" | "COURSE" | "BOTH" = "COURSE") {
  const student = await createUser({ name: "Aisha Khan" });
  const course = await createCourse();
  const request = await prisma.couponRequest.create({
    data: { userId: student.id, courseId: course.id, reason: "Family circumstances", feeType },
  });
  return { student, course, request };
}

/** Lets the e-mails queued with after() run. */
const flushAfter = () => new Promise((resolve) => setTimeout(resolve, 0));

describe.skipIf(SKIP_WITHOUT_DB)("fee waiver requests: approve and reject", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(sendFeeWaiverApprovedEmail).mockClear();
    vi.mocked(sendFeeWaiverRejectedEmail).mockClear();
    await loginAsAdmin();
  });

  it("approving issues one SPECIAL coupon for that student and course, and notifies them", async () => {
    const { student, course, request } = await pendingRequest("COURSE");

    expect(await approveCouponRequest(request.id, 50, validUntil())).toEqual({ success: true });
    await flushAfter();

    const after = await prisma.couponRequest.findUniqueOrThrow({ where: { id: request.id }, include: { coupon: true } });
    expect(after.status).toBe("APPROVED");
    expect(after.coupon).toMatchObject({
      type: "SPECIAL",
      percentage: 50,
      userId: student.id,
      courseId: course.id,
      isActive: true,
      applyToEnrollment: false,
      applyToCourse: true,
    });
    expect(after.coupon!.code).toMatch(/^WAIVER-/);
    expect(sendFeeWaiverApprovedEmail).toHaveBeenCalledTimes(1);
    expect(await prisma.studentNotification.count({ where: { userId: student.id, sourceId: request.id } })).toBe(1);
  });

  it("a both-fees waiver issues one coupon per fee, and spending one leaves the other", async () => {
    await setPaymentSettings({ feeWaiverEnabled: true });
    const { student, course, request } = await pendingRequest("BOTH");

    expect(await approveCouponRequest(request.id, 50, validUntil())).toEqual({ success: true });
    await flushAfter();

    const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });
    expect(coupons).toHaveLength(2);
    const [enrollmentCoupon, courseCoupon] = coupons;
    expect(enrollmentCoupon).toMatchObject({ type: "SPECIAL", userId: student.id, courseId: course.id, applyToEnrollment: true, applyToCourse: false });
    expect(courseCoupon).toMatchObject({ type: "SPECIAL", userId: student.id, courseId: course.id, applyToEnrollment: false, applyToCourse: true });
    expect(courseCoupon!.code).toBe(`${enrollmentCoupon!.code}-C`);
    expect((await prisma.couponRequest.findUniqueOrThrow({ where: { id: request.id } })).couponId).toBe(enrollmentCoupon!.id);
    expect(sendFeeWaiverApprovedEmail).toHaveBeenCalledWith(expect.objectContaining({
      coupons: [
        { code: enrollmentCoupon!.code, appliesTo: "Enrollment Fee" },
        { code: courseCoupon!.code, appliesTo: "Course Fee (one payment)" },
      ],
    }));
    const notification = await prisma.studentNotification.findFirstOrThrow({ where: { userId: student.id, sourceId: request.id } });
    expect(notification.body).toContain(enrollmentCoupon!.code);
    expect(notification.body).toContain(courseCoupon!.code);

    await startedEnrollment(student.id, course.id);
    expect(await processEnrollmentPayment(student.id, course.id, "upi", "UTR9100001", null, enrollmentCoupon!.id, 25000)).toEqual({ success: true });
    const submission = await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: student.id } });
    await runAction(() => confirmMonthlyPayment(submission.id));

    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: enrollmentCoupon!.id } })).isActive).toBe(false);
    expect(await getApplicableCoupons(student.id, course.id, "course")).toEqual([
      expect.objectContaining({ id: courseCoupon!.id, isUsed: false }),
    ]);
  });

  it("the student's request list shows both codes of a both-fees waiver", async () => {
    const { student, request } = await pendingRequest("BOTH");
    await approveCouponRequest(request.id, 100, validUntil());
    const [enrollmentCoupon, courseCoupon] = await prisma.coupon.findMany({ orderBy: { code: "asc" } });

    const [listed] = await withIssuedCouponCodes(await prisma.couponRequest.findMany({ where: { userId: student.id }, include: { coupon: true } }));

    expect(listed!.couponCodes).toEqual([enrollmentCoupon!.code, courseCoupon!.code]);
  });

  it("deleting an unused both-fees request removes both of its coupons", async () => {
    const { request } = await pendingRequest("BOTH");
    await approveCouponRequest(request.id, 100, validUntil());
    expect(await prisma.coupon.count()).toBe(2);

    expect(await deleteCouponRequest(request.id)).toEqual({ success: "Waiver request deleted." });
    expect(await prisma.coupon.count()).toBe(0);
  });

  it("two simultaneous approvals issue exactly one coupon", async () => {
    const { request } = await pendingRequest();

    const results = await Promise.all([approveCouponRequest(request.id, 50, validUntil()), approveCouponRequest(request.id, 100, validUntil())]);

    expect(results.filter((r) => "success" in r && r.success)).toHaveLength(1);
    expect(results.filter((r) => "error" in r)).toEqual([{ error: "Request already processed" }]);
    expect(await prisma.coupon.count()).toBe(1);
    const after = await prisma.couponRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(after.couponId).toBe((await prisma.coupon.findFirstOrThrow()).id);
  });

  it("an approval racing a rejection leaves one consistent outcome", async () => {
    const { request } = await pendingRequest();

    const [approved, rejected] = await Promise.all([approveCouponRequest(request.id, 50, validUntil()), rejectCouponRequest(request.id)]);
    const after = await prisma.couponRequest.findUniqueOrThrow({ where: { id: request.id } });

    expect([approved, rejected].filter((r) => "success" in r && r.success)).toHaveLength(1);
    if (after.status === "APPROVED") {
      expect(await prisma.coupon.count()).toBe(1);
      expect(after.couponId).not.toBeNull();
    } else {
      expect(after.status).toBe("REJECTED");
      // The losing approval rolled its coupon back with the claim.
      expect(await prisma.coupon.count()).toBe(0);
      expect(after.couponId).toBeNull();
    }
  });

  it("a decided request cannot be decided again", async () => {
    const approvedOne = await pendingRequest();
    await approveCouponRequest(approvedOne.request.id, 50, validUntil());
    expect(await approveCouponRequest(approvedOne.request.id, 100, validUntil())).toEqual({ error: "Request already processed" });
    expect(await rejectCouponRequest(approvedOne.request.id)).toEqual({ error: "Request already processed" });
    expect(await prisma.coupon.count()).toBe(1);

    const rejectedOne = await pendingRequest();
    expect(await rejectCouponRequest(rejectedOne.request.id)).toEqual({ success: true });
    expect(await rejectCouponRequest(rejectedOne.request.id)).toEqual({ error: "Request already processed" });
    expect(await approveCouponRequest(rejectedOne.request.id, 50, validUntil())).toEqual({ error: "Request already processed" });
    expect((await prisma.couponRequest.findUniqueOrThrow({ where: { id: rejectedOne.request.id } })).status).toBe("REJECTED");
    await flushAfter();
    expect(sendFeeWaiverRejectedEmail).toHaveBeenCalledTimes(1);
  });

  it("refuses an invalid percentage or a date in the past without deciding", async () => {
    const { request } = await pendingRequest();
    expect(await approveCouponRequest(request.id, 0, validUntil())).toHaveProperty("error");
    expect(await approveCouponRequest(request.id, 50, "2020-01-01")).toHaveProperty("error");
    expect(await approveCouponRequest("missing", 50, validUntil())).toEqual({ error: "Request not found" });
    expect((await prisma.couponRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("PENDING");
    expect(await prisma.coupon.count()).toBe(0);
  });

  it("only an admin can decide", async () => {
    const { student, request } = await pendingRequest();
    vi.mocked(auth).mockResolvedValue(sessionFor(student, "STUDENT") as never);
    await expect(approveCouponRequest(request.id, 100, validUntil())).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    await expect(rejectCouponRequest(request.id)).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    expect((await prisma.couponRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("PENDING");
  });
});
