import { beforeEach, describe, expect, it } from "vitest";
import { encode } from "next-auth/jwt";
import { prisma } from "@/utils/prisma";
import { GET as cartGet, POST as cartPost } from "@/app/api/v1/bookstore/cart/route";
import { GET as ordersGet, POST as ordersPost } from "@/app/api/v1/bookstore/orders/route";
import { GET as enrollmentsGet, POST as enrollmentsPost } from "@/app/api/v1/enrollments/route";
import { GET as notificationsGet, PATCH as notificationsPatch } from "@/app/api/v1/notifications/route";
import { DELETE as deviceDelete, POST as devicePost } from "@/app/api/v1/notifications/device-token/route";
import { GET as historyGet } from "@/app/api/v1/payments/history/route";
import { POST as submitPost } from "@/app/api/v1/payments/submit/route";
import { GET as reviewsGet, POST as reviewsPost } from "@/app/api/v1/reviews/route";
import { GET as attendanceGet } from "@/app/api/v1/student/attendance/route";
import { GET as gradesGet } from "@/app/api/v1/student/grades/route";
import { GET as waiversGet, POST as waiversPost } from "@/app/api/v1/waiver-requests/route";
import { createBook, createCourse, createEnrollment, createUser, resetDb, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf, signedInStudent } from "../helpers/api";

type Handler = (request: ReturnType<typeof apiRequest>) => Promise<Response>;

const PROTECTED: Array<[string, Handler, string, string, unknown?]> = [
  ["bookstore cart", cartGet, "GET", "/api/v1/bookstore/cart"],
  ["bookstore cart", cartPost, "POST", "/api/v1/bookstore/cart", { items: [] }],
  ["bookstore orders", ordersGet, "GET", "/api/v1/bookstore/orders"],
  ["bookstore orders", ordersPost, "POST", "/api/v1/bookstore/orders", {}],
  ["enrollments", enrollmentsGet, "GET", "/api/v1/enrollments"],
  ["enrollments", enrollmentsPost, "POST", "/api/v1/enrollments", { courseId: "x" }],
  ["notifications", notificationsGet, "GET", "/api/v1/notifications"],
  ["notifications", notificationsPatch, "PATCH", "/api/v1/notifications", { markAllRead: true }],
  ["device token", devicePost, "POST", "/api/v1/notifications/device-token", { token: "t" }],
  ["device token", deviceDelete, "DELETE", "/api/v1/notifications/device-token", { token: "t" }],
  ["payment history", historyGet, "GET", "/api/v1/payments/history"],
  ["payment submit", submitPost, "POST", "/api/v1/payments/submit", { courseId: "x" }],
  ["reviews", reviewsGet, "GET", "/api/v1/reviews"],
  ["reviews", reviewsPost, "POST", "/api/v1/reviews", {}],
  ["attendance", attendanceGet, "GET", "/api/v1/student/attendance"],
  ["grades", gradesGet, "GET", "/api/v1/student/grades"],
  ["waiver requests", waiversGet, "GET", "/api/v1/waiver-requests"],
  ["waiver requests", waiversPost, "POST", "/api/v1/waiver-requests", {}],
];

describe.skipIf(SKIP_WITHOUT_DB)("authenticated /api/v1 routes", () => {
  beforeEach(resetDb);

  describe("authentication", () => {
    it.each(PROTECTED)("%s %#: refuses a request without a token", async (_name, handler, method, path, json) => {
      const response = await handler(apiRequest(path, { method, json }));
      expect(response.status).toBe(401);
      expect(await jsonOf(response)).toMatchObject({ success: false });
    });

    it.each(PROTECTED)("%s %#: refuses a browser session cookie", async (_name, handler, method, path, json) => {
      const user = await createUser();
      const cookie = await encode({
        token: { id: user.id, email: user.email, sub: user.id },
        secret: process.env.AUTH_SECRET!,
        salt: "authjs.session-token",
      });
      const response = await handler(apiRequest(path, { method, json, headers: { cookie: `authjs.session-token=${cookie}` } }));
      expect(response.status).toBe(401);
    });
  });

  describe("notifications", () => {
    const note = (userId: string, sourceId: string, extra: Record<string, unknown> = {}) =>
      prisma.studentNotification.create({
        data: { userId, type: "PERSONAL_MESSAGE", title: `Note ${sourceId}`, href: "/profile", sourceId, ...extra },
      });

    it("lists only the caller's notifications with the unread count and an unread filter", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      await note(me.user.id, "a");
      await note(me.user.id, "b", { readAt: new Date() });
      await note(other.user.id, "c");

      const all = await jsonOf(await notificationsGet(apiRequest("/api/v1/notifications", { headers: me.headers })));
      expect(all).toMatchObject({ success: true, totalCount: 2, unreadCount: 1 });

      const unread = await jsonOf(await notificationsGet(apiRequest("/api/v1/notifications?filter=unread", { headers: me.headers })));
      expect(unread.data).toHaveLength(1);
    });

    it("cannot mark another student's notification as read (IDOR)", async () => {
      const me = await signedInStudent();
      const victim = await signedInStudent();
      const theirs = await note(victim.user.id, "secret");

      const response = await notificationsPatch(apiRequest("/api/v1/notifications", { method: "PATCH", headers: me.headers, json: { notificationId: theirs.id } }));

      expect(response.status).toBe(404);
      expect((await prisma.studentNotification.findUniqueOrThrow({ where: { id: theirs.id } })).readAt).toBeNull();
    });

    it("marks one or all of the caller's notifications as read and leaves others alone", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const first = await note(me.user.id, "a");
      await note(me.user.id, "b");
      const theirs = await note(other.user.id, "c");

      const one = await notificationsPatch(apiRequest("/api/v1/notifications", { method: "PATCH", headers: me.headers, json: { notificationId: first.id } }));
      expect(one.status).toBe(200);
      expect(await prisma.studentNotification.count({ where: { userId: me.user.id, readAt: null } })).toBe(1);

      const all = await notificationsPatch(apiRequest("/api/v1/notifications", { method: "PATCH", headers: me.headers, json: { markAllRead: true } }));
      expect(all.status).toBe(200);
      expect(await prisma.studentNotification.count({ where: { userId: me.user.id, readAt: null } })).toBe(0);
      expect((await prisma.studentNotification.findUniqueOrThrow({ where: { id: theirs.id } })).readAt).toBeNull();

      const none = await notificationsPatch(apiRequest("/api/v1/notifications", { method: "PATCH", headers: me.headers, json: {} }));
      expect(none.status).toBe(400);
    });
  });

  describe("enrollments", () => {
    it("lists only the caller's enrollments", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const mine = await createCourse();
      const theirs = await createCourse();
      await createEnrollment(me.user.id, mine.id);
      await createEnrollment(other.user.id, theirs.id);

      const data = await jsonOf(await enrollmentsGet(apiRequest("/api/v1/enrollments", { headers: me.headers })));

      expect(data.data.map((e: { courseId: string }) => e.courseId)).toEqual([mine.id]);
    });

    it("starts a free enrollment as pending approval and a paid one as awaiting the fee", async () => {
      await setPaymentSettings();
      const me = await signedInStudent();
      const free = await createCourse({ priceInrPaise: 0 });
      const paid = await createCourse({ priceInrPaise: 50000 });

      const freeResult = await jsonOf(await enrollmentsPost(apiRequest("/api/v1/enrollments", { method: "POST", headers: me.headers, json: { courseId: free.id } })));
      expect(freeResult).toMatchObject({ success: true, requiresEnrollmentFee: false, enrollment: { statusEnum: "PENDING_APPROVAL" } });

      const paidResult = await jsonOf(await enrollmentsPost(apiRequest("/api/v1/enrollments", { method: "POST", headers: me.headers, json: { courseId: paid.id } })));
      expect(paidResult).toMatchObject({ requiresEnrollmentFee: true, feeAmountPaise: 50000, enrollment: { statusEnum: "AWAITING_ENROLLMENT_FEE" } });
    });

    it("is idempotent for an existing request, and lets a rejected student apply again", async () => {
      const me = await signedInStudent();
      const course = await createCourse({ priceInrPaise: 0 });
      const apply = () => enrollmentsPost(apiRequest("/api/v1/enrollments", { method: "POST", headers: me.headers, json: { courseId: course.id } }));

      await apply();
      expect(await jsonOf(await apply())).toMatchObject({ alreadyEnrolled: true });
      expect(await prisma.enrollment.count()).toBe(1);

      await prisma.enrollment.updateMany({ data: { status: "rejected", statusEnum: "REJECTED", rejectedAt: new Date() } });
      const again = await jsonOf(await apply());
      expect(again).toMatchObject({ success: true, enrollment: { statusEnum: "PENDING_APPROVAL", rejectedAt: null } });
      expect(await prisma.enrollment.count()).toBe(1);
    });

    it("validates the request: course id, open course, complete profile, configured payments", async () => {
      const me = await signedInStudent();
      const post = (json: unknown, headers = me.headers) => enrollmentsPost(apiRequest("/api/v1/enrollments", { method: "POST", headers, json }));

      expect((await post({})).status).toBe(400);
      expect((await post({ courseId: "missing" })).status).toBe(400);
      const closed = await createCourse({ status: "COMPLETED" });
      expect((await post({ courseId: closed.id })).status).toBe(400);

      const open = await createCourse({ priceInrPaise: 0 });
      const incomplete = await signedInStudent({ fatherName: null });
      const refused = await post({ courseId: open.id }, incomplete.headers);
      expect(refused.status).toBe(403);
      expect(await jsonOf(refused)).toMatchObject({ profileIncomplete: true });

      const paid = await createCourse({ priceInrPaise: 10000 });
      expect((await post({ courseId: paid.id })).status).toBe(503); // no UPI id configured yet
    });
  });

  describe("payments", () => {
    it("shows only the caller's payments, without voided records or removed submissions", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const course = await createCourse();
      const submission = (userId: string, label: string, extra: Record<string, unknown> = {}) =>
        prisma.coursePaymentSubmission.create({ data: { userId, courseId: course.id, label, amountInrPaise: 100, ...extra } });
      await submission(me.user.id, "Mine");
      await submission(me.user.id, "Removed", { deletedAt: new Date() });
      await submission(other.user.id, "Theirs");
      await prisma.paymentRecord.create({ data: { userId: me.user.id, amountInrPaise: 100, paidAt: new Date(), description: "Mine" } });
      await prisma.paymentRecord.create({ data: { userId: me.user.id, amountInrPaise: 100, paidAt: new Date(), description: "Voided", voidedAt: new Date() } });
      await prisma.paymentRecord.create({ data: { userId: other.user.id, amountInrPaise: 100, paidAt: new Date(), description: "Theirs" } });

      const data = await jsonOf(await historyGet(apiRequest("/api/v1/payments/history", { headers: me.headers })));

      expect(data.submissions.map((s: { label: string }) => s.label)).toEqual(["Mine"]);
      expect(data.records.map((r: { description: string }) => r.description)).toEqual(["Mine"]);
      expect(data.submissions[0]).not.toHaveProperty("deletedAt");
    });

    it("submits an enrollment fee with the legacy upper-case method name", async () => {
      await setPaymentSettings();
      const me = await signedInStudent();
      const course = await createCourse({ priceInrPaise: 50000 });

      const response = await submitPost(
        apiRequest("/api/v1/payments/submit", {
          method: "POST",
          headers: me.headers,
          json: { courseId: course.id, paymentType: "enrollment", paymentMethod: "UPI", upiTransactionId: "UTR12345" },
        }),
      );

      expect(response.status).toBe(200);
      expect(await prisma.coursePaymentSubmission.findFirstOrThrow({ where: { userId: me.user.id } })).toMatchObject({
        amountInrPaise: 50000,
        statusEnum: "PENDING_VERIFICATION",
        paymentMethodEnum: "UPI",
      });
    });

    it("submits a monthly fee only for an approved enrollment and refuses stale amounts", async () => {
      await setPaymentSettings();
      const me = await signedInStudent();
      const course = await createCourse();
      const body = { courseId: course.id, paymentType: "monthly", paymentMonth: 3, paymentYear: new Date().getFullYear(), upiTransactionId: "UTR55555" };
      const submit = (json: unknown) => submitPost(apiRequest("/api/v1/payments/submit", { method: "POST", headers: me.headers, json }));

      expect((await submit(body)).status).toBe(400); // not enrolled yet
      await createEnrollment(me.user.id, course.id);
      expect((await submit({ ...body, expectedAmountPaise: 1 })).status).toBe(409);
      expect((await submit(body)).status).toBe(200);
    });

    it("validates the submission", async () => {
      await setPaymentSettings();
      const me = await signedInStudent();
      const submit = (json: unknown) => submitPost(apiRequest("/api/v1/payments/submit", { method: "POST", headers: me.headers, json }));

      expect((await submit({})).status).toBe(400);
      expect((await submit({ courseId: "x", paymentType: "other" })).status).toBe(400);
      expect((await submit({ courseId: "x", paymentType: "monthly", paymentMonth: 13 })).status).toBe(400);
      expect((await submit({ courseId: "x", paymentType: "enrollment", upiTransactionId: "not valid!" })).status).toBe(400);
    });

    it("answers 503 until the academy has configured payments", async () => {
      const me = await signedInStudent();
      const response = await submitPost(apiRequest("/api/v1/payments/submit", { method: "POST", headers: me.headers, json: { courseId: "x" } }));
      expect(response.status).toBe(503);
    });
  });

  describe("attendance and grades", () => {
    async function classroom() {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const course = await createCourse();
      const mine = await createEnrollment(me.user.id, course.id, { rollNumber: 1 });
      const theirs = await createEnrollment(other.user.id, course.id, { rollNumber: 2 });
      const day1 = await prisma.courseAttendance.create({ data: { courseId: course.id, date: new Date("2026-03-01") } });
      const day2 = await prisma.courseAttendance.create({ data: { courseId: course.id, date: new Date("2026-03-02") } });
      await prisma.courseAttendanceRecord.createMany({
        data: [
          { attendanceId: day1.id, enrollmentId: mine.id, isPresent: true },
          { attendanceId: day2.id, enrollmentId: mine.id, isPresent: false },
          { attendanceId: day1.id, enrollmentId: theirs.id, isPresent: true },
        ],
      });
      const exam = await prisma.courseGrade.create({ data: { courseId: course.id, title: "Mid-term", date: new Date("2026-03-05"), maxMarks: 50 } });
      await prisma.courseGradeRecord.createMany({
        data: [
          { gradeId: exam.id, enrollmentId: mine.id, marksObtained: 40 },
          { gradeId: exam.id, enrollmentId: theirs.id, marksObtained: 10 },
        ],
      });
      return { me, other, course, mine };
    }

    it("reports attendance for the caller's enrollments only", async () => {
      const { me, mine } = await classroom();

      const data = await jsonOf(await attendanceGet(apiRequest("/api/v1/student/attendance", { headers: me.headers })));

      expect(data.attendance).toHaveLength(1);
      expect(data.attendance[0]).toMatchObject({ enrollmentId: mine.id, totalClasses: 2, presentClasses: 1, absentClasses: 1, percentage: 50 });
    });

    it("reports grades for the caller's enrollments only", async () => {
      const { me, mine } = await classroom();

      const data = await jsonOf(await gradesGet(apiRequest("/api/v1/student/grades", { headers: me.headers })));

      expect(data.grades).toHaveLength(1);
      expect(data.grades[0]).toMatchObject({ enrollmentId: mine.id, totalMaxMarks: 50, totalMarksObtained: 40, overallPercentage: 80 });
    });

    it("returns nothing for a course the caller is not enrolled in", async () => {
      const { me } = await classroom();
      const foreign = await createCourse();

      const attendance = await jsonOf(await attendanceGet(apiRequest(`/api/v1/student/attendance?courseId=${foreign.id}`, { headers: me.headers })));
      const grades = await jsonOf(await gradesGet(apiRequest(`/api/v1/student/grades?courseId=${foreign.id}`, { headers: me.headers })));

      expect(attendance.attendance).toEqual([]);
      expect(grades.grades).toEqual([]);
    });
  });

  describe("bookstore", () => {
    it("syncs the cart: replaces it, skips unavailable books and caps the quantity", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const shown = await createBook();
      const hidden = await createBook({ published: false });
      const soldOut = await createBook({ status: "OUT_OF_STOCK" });
      const otherBook = await createBook();
      await prisma.userCartItem.create({ data: { userId: other.user.id, bookId: otherBook.id, quantity: 1 } });

      const response = await cartPost(
        apiRequest("/api/v1/bookstore/cart", {
          method: "POST",
          headers: me.headers,
          json: { items: [{ bookId: shown.id, quantity: 500 }, { bookId: hidden.id, quantity: 1 }, { bookId: soldOut.id, quantity: 1 }, { bookId: shown.id, quantity: -1 }, { bookId: 5, quantity: 1 }] },
        }),
      );
      const data = await jsonOf(response);

      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toMatchObject({ quantity: 20 });
      expect(await prisma.userCartItem.count({ where: { userId: other.user.id } })).toBe(1);
      expect((await jsonOf(await cartGet(apiRequest("/api/v1/bookstore/cart", { headers: other.headers })))).items).toHaveLength(1);
    });

    it("places an order for the caller (never for a user named in the body) and validates it", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const book = await createBook({ inventoryPurchased: 3, priceInrPaise: 10000 });
      const order = (json: unknown) => ordersPost(apiRequest("/api/v1/bookstore/orders", { method: "POST", headers: me.headers, json }));
      const valid = {
        items: [{ bookId: book.id, quantity: 2 }],
        paymentMethod: "upi",
        upiTransactionId: "UTR9999",
        deliveryAddress: "12 Main Street, Srinagar",
        deliveryPinCode: "190001",
        deliveryPhoneNumber: "9876543210",
      };

      const placed = await order({ ...valid, userId: other.user.id });
      expect(placed.status).toBe(200);
      const row = await prisma.bookOrder.findFirstOrThrow();
      expect(row).toMatchObject({ userId: me.user.id, totalAmountInrPaise: 20000, status: "PENDING_VERIFICATION" });

      expect((await order({ ...valid, upiTransactionId: "UTR10000", items: [{ bookId: book.id, quantity: 5 }] })).status).toBe(409);
      expect((await order({ ...valid, deliveryPinCode: "1" })).status).toBe(400);
      expect((await order({})).status).toBe(400);
      expect((await order({ ...valid, items: "not json" })).status).toBe(400);
    });

    it("lists only the caller's orders", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const book = await createBook();
      const make = (userId: string) =>
        prisma.bookOrder.create({ data: { userId, totalAmountInrPaise: 100, items: { create: [{ bookId: book.id, quantity: 1, priceAtPurchaseInrPaise: 100 }] } } });
      const mine = await make(me.user.id);
      await make(other.user.id);
      await prisma.bookOrder.create({ data: { userId: me.user.id, totalAmountInrPaise: 100, deletedAt: new Date() } });

      const data = await jsonOf(await ordersGet(apiRequest("/api/v1/bookstore/orders", { headers: me.headers })));

      expect(data.orders.map((o: { id: string }) => o.id)).toEqual([mine.id]);
    });
  });

  describe("device tokens", () => {
    it("registers a token and validates input", async () => {
      const me = await signedInStudent();
      const register = (json: unknown) => devicePost(apiRequest("/api/v1/notifications/device-token", { method: "POST", headers: me.headers, json }));

      expect((await register({ token: "fcm-1", platform: "ios" })).status).toBe(200);
      expect(await prisma.deviceToken.findUniqueOrThrow({ where: { token: "fcm-1" } })).toMatchObject({ userId: me.user.id, platformEnum: "IOS" });
      expect((await register({})).status).toBe(400);
      expect((await register({ token: "fcm-2", platform: "symbian" })).status).toBe(400);
    });

    it("only unregisters the caller's own tokens", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      await prisma.deviceToken.create({ data: { userId: other.user.id, token: "theirs", platform: "android" } });

      const response = await deviceDelete(apiRequest("/api/v1/notifications/device-token", { method: "DELETE", headers: me.headers, json: { token: "theirs" } }));

      expect(response.status).toBe(200);
      expect(await prisma.deviceToken.count({ where: { token: "theirs" } })).toBe(1);
      expect((await deviceDelete(apiRequest("/api/v1/notifications/device-token", { method: "DELETE", headers: me.headers, json: {} }))).status).toBe(400);
    });
  });

  describe("reviews", () => {
    it("submits a review for moderation and lists only the caller's reviews", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      await prisma.studentReview.create({ data: { userId: other.user.id, quote: "x".repeat(30), rating: 5 } });

      const created = await reviewsPost(apiRequest("/api/v1/reviews", { method: "POST", headers: me.headers, json: { quote: "A wonderful teacher and course.", rating: 5, course: "Tajweed" } }));
      expect(created.status).toBe(200);
      expect(await prisma.studentReview.findFirstOrThrow({ where: { userId: me.user.id } })).toMatchObject({ status: "PENDING", course: "Tajweed" });

      const data = await jsonOf(await reviewsGet(apiRequest("/api/v1/reviews", { headers: me.headers })));
      expect(data.data).toHaveLength(1);
    });

    it("validates the review", async () => {
      const me = await signedInStudent();
      const post = (json: unknown) => reviewsPost(apiRequest("/api/v1/reviews", { method: "POST", headers: me.headers, json }));

      expect((await post({ quote: "short", rating: 5 })).status).toBe(400);
      expect((await post({ quote: "x".repeat(30), rating: 9 })).status).toBe(400);
      expect((await post({ quote: "x".repeat(30) })).status).toBe(400);
    });
  });

  describe("waiver requests", () => {
    it("files a request once per course and lists only the caller's requests", async () => {
      const me = await signedInStudent();
      const other = await signedInStudent();
      const course = await createCourse();
      const file = (json: unknown, headers = me.headers) => waiversPost(apiRequest("/api/v1/waiver-requests", { method: "POST", headers, json }));
      const valid = { courseId: course.id, feeType: "Both", reason: "I cannot afford the fee right now." };

      const first = await file(valid);
      expect(first.status).toBe(200);
      expect((await file(valid)).status).toBe(409);
      expect((await file(valid, other.headers)).status).toBe(200);

      const data = await jsonOf(await waiversGet(apiRequest("/api/v1/waiver-requests", { headers: me.headers })));
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({ userId: me.user.id, feeType: "BOTH", status: "PENDING" });
    });

    it("validates the request and the course", async () => {
      const me = await signedInStudent();
      const file = (json: unknown) => waiversPost(apiRequest("/api/v1/waiver-requests", { method: "POST", headers: me.headers, json }));
      const closed = await createCourse({ status: "COMPLETED" });

      expect((await file({ courseId: "missing", reason: "I cannot afford the fee." })).status).toBe(404);
      expect((await file({ courseId: closed.id, reason: "I cannot afford the fee." })).status).toBe(400);
      expect((await file({ courseId: closed.id, reason: "short" })).status).toBe(400);
      expect((await file({})).status).toBe(400);
    });
  });
});
