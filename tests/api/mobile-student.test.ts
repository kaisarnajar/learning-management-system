import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { GET as courseAnnouncements } from "@/app/api/v1/courses/[id]/announcements/route";
import { GET as quote } from "@/app/api/v1/payments/quote/route";
import { GET as receipt } from "@/app/api/v1/payments/[id]/receipt/route";
import { PATCH as cartPatch } from "@/app/api/v1/bookstore/cart/route";
import { POST as checkoutQuote } from "@/app/api/v1/bookstore/checkout-quote/route";
import { GET as orderById } from "@/app/api/v1/bookstore/orders/[id]/route";
import { GET as notificationById } from "@/app/api/v1/notifications/[id]/route";
import { POST as enroll } from "@/app/api/v1/enrollments/route";
import { POST as submitPayment } from "@/app/api/v1/payments/submit/route";
import { POST as placeOrder } from "@/app/api/v1/bookstore/orders/route";
import { createBook, createCourse, createEnrollment, resetDb, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf, routeParams, signedInStudent } from "../helpers/api";

const UPI = { upiId: "academy@upi", upiPayeeName: "Academy", feeWaiverEnabled: true };

describe.skipIf(SKIP_WITHOUT_DB)("mobile API: student screens", () => {
  beforeEach(async () => {
    await resetDb();
    await setPaymentSettings(UPI);
  });

  describe("course announcements", () => {
    it("shows course-wide and private messages to an approved student only", async () => {
      const course = await createCourse();
      const me = await signedInStudent();
      const applicant = await signedInStudent();
      const enrollment = await createEnrollment(me.user.id, course.id);
      await createEnrollment(applicant.user.id, course.id, { status: "pending_approval", statusEnum: "PENDING_APPROVAL" });
      await prisma.courseAnnouncement.create({ data: { courseId: course.id, authorName: "", category: "CLASS_SCHEDULE", title: "Class moved", body: "To 6pm" } });
      await prisma.courseAnnouncement.create({ data: { courseId: course.id, enrollmentId: enrollment.id, authorName: "Ustadh", category: "GENERAL_NOTICE", title: "Well done", body: "Keep it up" } });

      const mine = await jsonOf(await courseAnnouncements(apiRequest("/x", { headers: me.headers }), routeParams({ id: course.id })));
      expect(mine.courseWide).toHaveLength(1);
      expect(mine.courseWide[0].authorName).toBe("Academy");
      expect(mine.personal).toHaveLength(1);

      const theirs = await jsonOf(await courseAnnouncements(apiRequest("/x", { headers: applicant.headers }), routeParams({ id: course.id })));
      expect(theirs).toMatchObject({ courseWide: [], personal: [], courseWideTotal: 0 });
    });
  });

  describe("payment quote", () => {
    it("prices the enrollment fee with the waivers the student may choose", async () => {
      const course = await createCourse({ priceInrPaise: 100000 });
      const me = await signedInStudent();
      await prisma.coupon.create({
        data: { code: "HALF", type: "DEFAULT", percentage: 50, validFrom: new Date(Date.now() - 86_400_000), validUntil: new Date(Date.now() + 86_400_000), isActive: true },
      });

      const data = await jsonOf(await quote(apiRequest(`/x?courseId=${course.id}&type=enrollment`, { headers: me.headers })));
      expect(data).toMatchObject({ canPay: true, reason: null, baseAmountPaise: 100000 });
      expect(data.coupons).toEqual([expect.objectContaining({ code: "HALF", percentage: 50, amountPaise: 50000 })]);
    });

    it("explains why a course fee cannot be paid before approval, and lists fee years once approved", async () => {
      const course = await createCourse();
      const me = await signedInStudent();

      const before = await jsonOf(await quote(apiRequest(`/x?courseId=${course.id}&type=course`, { headers: me.headers })));
      expect(before).toMatchObject({ canPay: false, coupons: [] });
      expect(before.reason).toContain("enrolled and approved");

      await createEnrollment(me.user.id, course.id);
      const after = await jsonOf(await quote(apiRequest(`/x?courseId=${course.id}&type=course`, { headers: me.headers })));
      expect(after).toMatchObject({ canPay: true, baseAmountPaise: 34900, oneTimeFee: false });
      expect(after.yearOptions.length).toBeGreaterThan(0);
    });

    it("validates the request", async () => {
      const me = await signedInStudent();
      expect((await quote(apiRequest("/x?courseId=x&type=other", { headers: me.headers }))).status).toBe(400);
      expect((await quote(apiRequest("/x?courseId=missing&type=course", { headers: me.headers }))).status).toBe(404);
      expect((await quote(apiRequest("/x?courseId=x&type=course"))).status).toBe(401);
    });
  });

  describe("receipts", () => {
    it("are only for the owner, and only once issued", async () => {
      const course = await createCourse();
      const me = await signedInStudent();
      const other = await signedInStudent();
      const record = await prisma.paymentRecord.create({ data: { userId: me.user.id, courseId: course.id, amountInrPaise: 34900, paidAt: new Date() } });

      expect((await receipt(apiRequest("/x", { headers: other.headers }), routeParams({ id: record.id }))).status).toBe(404);
      expect((await receipt(apiRequest("/x", { headers: me.headers }), routeParams({ id: record.id }))).status).toBe(409);
      expect((await receipt(apiRequest("/x", { headers: me.headers }), routeParams({ id: "missing" }))).status).toBe(404);
    });
  });

  describe("bookstore", () => {
    it("sets and removes single cart lines", async () => {
      const me = await signedInStudent();
      const book = await createBook();
      const soldOut = await createBook({ status: "OUT_OF_STOCK" });
      const patch = (json: unknown) => cartPatch(apiRequest("/x", { method: "PATCH", headers: me.headers, json }));

      expect((await jsonOf(await patch({ bookId: book.id, quantity: 2 }))).items).toEqual([expect.objectContaining({ bookId: book.id, quantity: 2 })]);
      expect((await jsonOf(await patch({ bookId: book.id, quantity: 99 }))).items[0].quantity).toBe(20);
      expect((await patch({ bookId: soldOut.id, quantity: 1 })).status).toBe(404);
      expect((await patch({ bookId: book.id, quantity: -1 })).status).toBe(400);
      expect((await jsonOf(await patch({ bookId: book.id, quantity: 0 }))).items).toEqual([]);
    });

    it("prices a checkout with shipping by weight, and refuses what cannot be bought", async () => {
      const me = await signedInStudent();
      const book = await createBook({ priceInrPaise: 25000, weightInGrams: 400, inventoryPurchased: 10 });
      await prisma.shippingChargeSlab.createMany({
        data: [
          { minWeightGrams: 0, maxWeightGrams: 500, chargeInrPaise: 5000 },
          { minWeightGrams: 501, maxWeightGrams: 2000, chargeInrPaise: 9000 },
        ],
      });

      const data = await jsonOf(await checkoutQuote(apiRequest("/x", { method: "POST", headers: me.headers, json: { items: [{ bookId: book.id, quantity: 2 }] } })));
      expect(data).toMatchObject({ subtotalAmountInrPaise: 50000, shippingChargeInrPaise: 9000, totalAmountInrPaise: 59000 });
      expect(data.lines).toEqual([expect.objectContaining({ bookId: book.id, quantity: 2, lineTotalInrPaise: 50000 })]);

      const tooMany = await checkoutQuote(apiRequest("/x", { method: "POST", headers: me.headers, json: { items: [{ bookId: book.id, quantity: 11 }] } }));
      expect(tooMany.status).toBe(409);
      expect((await checkoutQuote(apiRequest("/x", { method: "POST", headers: me.headers, json: { items: [] } }))).status).toBe(400);
    });

    it("shows one of the caller's orders, never someone else's", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const book = await createBook();
      const order = await prisma.bookOrder.create({
        data: {
          userId: me.user.id, totalAmountInrPaise: 25000, shippingChargeInrPaise: 0, deliveryAddress: "12 Street", deliveryPinCode: "190001", deliveryPhoneNumber: "9876543210",
          items: { create: [{ bookId: book.id, quantity: 1, priceAtPurchaseInrPaise: 25000 }] },
        },
      });

      const mine = await jsonOf(await orderById(apiRequest("/x", { headers: me.headers }), routeParams({ id: order.id })));
      expect(mine.order).toMatchObject({ id: order.id, status: "PENDING_VERIFICATION", paymentRecordId: null });
      expect(mine.order.items).toHaveLength(1);
      expect((await orderById(apiRequest("/x", { headers: other.headers }), routeParams({ id: order.id }))).status).toBe(404);
    });
  });

  describe("e-mail verification", () => {
    it("is required to enrol, pay and order, as on the website", async () => {
      const course = await createCourse();
      const unverified = await signedInStudent({ emailVerified: null });
      const post = (handler: typeof enroll, json: unknown) =>
        handler(apiRequest("/x", { method: "POST", headers: unverified.headers, json }));

      for (const response of [
        await post(enroll, { courseId: course.id }),
        await post(submitPayment, { courseId: course.id, paymentType: "monthly" }),
        await post(placeOrder, { items: [] }),
      ]) {
        expect(response.status).toBe(403);
        expect(await jsonOf(response)).toMatchObject({ success: false, code: "email_not_verified" });
      }
      expect(await prisma.enrollment.count()).toBe(0);
    });
  });

  describe("notifications", () => {
    it("opens one of the caller's notifications and marks it read", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const note = await prisma.studentNotification.create({ data: { userId: me.user.id, type: "SITE_ANNOUNCEMENT", title: "Eid", href: "/announcements" } });

      const data = await jsonOf(await notificationById(apiRequest("/x", { headers: me.headers }), routeParams({ id: note.id })));
      expect(data.notification.title).toBe("Eid");
      expect((await prisma.studentNotification.findUniqueOrThrow({ where: { id: note.id } })).readAt).not.toBeNull();
      expect((await notificationById(apiRequest("/x", { headers: other.headers }), routeParams({ id: note.id }))).status).toBe(404);
    });
  });
});
