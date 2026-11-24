import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/utils/prisma";
import { GET as adminDashboard } from "@/app/api/v1/admin/dashboard/route";
import { GET as adminPayments } from "@/app/api/v1/admin/payments/route";
import { POST as approvePayment } from "@/app/api/v1/admin/payments/[id]/approve/route";
import { POST as declinePayment } from "@/app/api/v1/admin/payments/[id]/decline/route";
import { POST as approveEnrollment } from "@/app/api/v1/admin/enrollments/[id]/approve/route";
import { GET as teacherCourses } from "@/app/api/v1/teacher/courses/route";
import { GET as teacherCourse } from "@/app/api/v1/teacher/courses/[id]/route";
import { POST as teacherAnnounce } from "@/app/api/v1/teacher/courses/[id]/announcements/route";
import { POST as teacherGrade } from "@/app/api/v1/teacher/courses/[id]/grades/route";
import { GET as adminCourse } from "@/app/api/v1/admin/courses/[id]/route";
import { POST as orderAction } from "@/app/api/v1/admin/bookstore/orders/[id]/[action]/route";
import { getStockLevels } from "@/services/inventory";
import { createBook, createCourse, createEnrollment, createTeacher, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearerFor, jsonOf, routeParams, signedInAdmin, signedInStudent, signedInTeacher } from "../helpers/api";

// The shared setup replaces Auth.js with a mock whose `auth()` returns null.
// Here the real `auth` wrapper is used, so the server actions behind the
// staff routes read the API caller through the actor bridge
// (services/api-actor.ts), exactly as in production. Auth.js's own handler is
// never reached: every call below runs inside runAsApiActor.
vi.unmock("@/services/auth");

describe.skipIf(SKIP_WITHOUT_DB)("staff API (/api/v1/admin, /api/v1/teacher)", () => {
  beforeEach(resetDb);

  describe("roles", () => {
    it("refuses a signed-in student on admin and teacher routes", async () => {
      const { headers } = await signedInStudent();
      const course = await createCourse();

      expect((await adminDashboard(apiRequest("/api/v1/admin/dashboard", { headers }))).status).toBe(403);
      expect((await adminPayments(apiRequest("/api/v1/admin/payments", { headers }))).status).toBe(403);
      expect((await teacherCourses(apiRequest("/api/v1/teacher/courses", { headers }))).status).toBe(403);
      expect((await teacherCourse(apiRequest(`/api/v1/teacher/courses/${course.id}`, { headers }), routeParams({ id: course.id }))).status).toBe(403);
    });

    it("a token issued with a staff role still acts with the role the address has", async () => {
      // The role is re-derived on every request; a forged or stale claim does not count.
      const student = await createUser();
      const headers = await bearerFor(student, "ADMIN");
      expect((await adminDashboard(apiRequest("/api/v1/admin/dashboard", { headers }))).status).toBe(403);
    });

    it("refuses a teacher on admin routes, and an admin on teacher routes", async () => {
      const teacher = await signedInTeacher();
      const admin = await signedInAdmin();

      const asTeacher = await adminDashboard(apiRequest("/api/v1/admin/dashboard", { headers: teacher.headers }));
      expect(asTeacher.status).toBe(403);
      expect(await jsonOf(asTeacher)).toEqual({ success: false, error: expect.any(String) });
      expect((await approvePayment(apiRequest("/api/v1/admin/payments/x/approve", { method: "POST", headers: teacher.headers }), routeParams({ id: "x" }))).status).toBe(403);

      expect((await teacherCourses(apiRequest("/api/v1/teacher/courses", { headers: admin.headers }))).status).toBe(403);
    });

    it("refuses staff addresses that are not verified", async () => {
      const adminUser = await createUser({ email: process.env.ADMIN_EMAIL, emailVerified: null });
      const teacherUser = await createUser({ email: "unverified.teacher@example.test", emailVerified: null });
      await createTeacher({ email: teacherUser.email, userId: teacherUser.id });

      const adminHeaders = await bearerFor(adminUser, "ADMIN");
      const teacherHeaders = await bearerFor(teacherUser, "TEACHER");

      expect((await adminDashboard(apiRequest("/api/v1/admin/dashboard", { headers: adminHeaders }))).status).toBe(403);
      expect((await approvePayment(apiRequest("/api/v1/admin/payments/x/approve", { method: "POST", headers: adminHeaders }), routeParams({ id: "x" }))).status).toBe(403);
      expect((await teacherCourses(apiRequest("/api/v1/teacher/courses", { headers: teacherHeaders }))).status).toBe(403);
    });

    it("needs a Bearer token", async () => {
      expect((await adminDashboard(apiRequest("/api/v1/admin/dashboard"))).status).toBe(401);
      expect((await teacherCourses(apiRequest("/api/v1/teacher/courses"))).status).toBe(401);
    });
  });

  describe("teacher course scope", () => {
    it("answers 404 for another teacher's course on reads and writes", async () => {
      const me = await signedInTeacher();
      const other = await createTeacher();
      const mine = await createCourse({ teacherId: me.teacher.id });
      const theirs = await createCourse({ teacherId: other.id });

      const own = await teacherCourse(apiRequest(`/api/v1/teacher/courses/${mine.id}`, { headers: me.headers }), routeParams({ id: mine.id }));
      expect(own.status).toBe(200);
      expect((await jsonOf(own)).course.id).toBe(mine.id);

      const foreign = await teacherCourse(apiRequest(`/api/v1/teacher/courses/${theirs.id}`, { headers: me.headers }), routeParams({ id: theirs.id }));
      expect(foreign.status).toBe(404);
      expect(await jsonOf(foreign)).toEqual({ success: false, error: "This record no longer exists." });

      const form = new FormData();
      form.set("category", "GENERAL_NOTICE");
      form.set("title", "Not my class");
      form.set("body", "This must not be posted.");
      const write = await teacherAnnounce(
        apiRequest(`/api/v1/teacher/courses/${theirs.id}/announcements`, { method: "POST", headers: me.headers, body: form }),
        routeParams({ id: theirs.id }),
      );
      expect(write.status).toBe(404);
      expect(await prisma.courseAnnouncement.count()).toBe(0);

      const list = await jsonOf(await teacherCourses(apiRequest("/api/v1/teacher/courses", { headers: me.headers })));
      expect(JSON.stringify(list)).toContain(mine.id);
      expect(JSON.stringify(list)).not.toContain(theirs.id);
    });
  });

  describe("action results become HTTP responses", () => {
    it("maps a redirect carrying an error to 400 with its message", async () => {
      const me = await signedInTeacher();
      const course = await createCourse({ teacherId: me.teacher.id });

      // The announcement action redirects to …/new?error=… when the form is invalid.
      const form = new FormData();
      form.set("category", "GENERAL_NOTICE");
      form.set("title", "");
      form.set("body", "");
      const response = await teacherAnnounce(
        apiRequest(`/api/v1/teacher/courses/${course.id}/announcements`, { method: "POST", headers: me.headers, body: form }),
        routeParams({ id: course.id }),
      );
      expect(response.status).toBe(400);
      expect(await jsonOf(response)).toEqual({ success: false, error: expect.stringMatching(/\S/) });
    });

    it("maps an action's { error } to 400 and notFound() to 404", async () => {
      const { headers } = await signedInAdmin();

      const missing = await approvePayment(apiRequest("/api/v1/admin/payments/nope/approve", { method: "POST", headers }), routeParams({ id: "nope" }));
      expect(missing.status).toBe(400);
      expect(await jsonOf(missing)).toEqual({ success: false, error: "Payment submission not found." });

      const noCourse = await adminCourse(apiRequest("/api/v1/admin/courses/nope", { headers }), routeParams({ id: "nope" }));
      expect(noCourse.status).toBe(404);
      expect((await jsonOf(noCourse)).success).toBe(false);
    });
  });

  describe("one write per area returns the documented envelope", () => {
    it("payments: approve records the payment, decline refuses a second decision", async () => {
      const { headers } = await signedInAdmin();
      const student = await createUser();
      const course = await createCourse();
      await createEnrollment(student.id, course.id);
      const submission = await prisma.coursePaymentSubmission.create({
        data: { userId: student.id, courseId: course.id, label: "Monthly fee — January 2026", amountInrPaise: 34900, statusEnum: "PENDING_VERIFICATION" },
      });

      const approved = await approvePayment(
        apiRequest(`/api/v1/admin/payments/${submission.id}/approve`, { method: "POST", headers }),
        routeParams({ id: submission.id }),
      );
      expect(approved.status).toBe(200);
      expect(await jsonOf(approved)).toEqual({ success: true, redirect: expect.stringContaining("/admin/payments") });
      const after = await prisma.coursePaymentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
      expect(after.statusEnum).toBe("APPROVED");
      expect(after.paymentRecordId).not.toBeNull();

      const declined = await declinePayment(
        apiRequest(`/api/v1/admin/payments/${submission.id}/decline`, { method: "POST", headers }),
        routeParams({ id: submission.id }),
      );
      expect(declined.status).toBe(400);
      expect(await jsonOf(declined)).toEqual({ success: false, error: "Only pending payments can be declined." });
    });

    it("bookstore: refunding a shipped order returns its books to stock only with booksReturned", async () => {
      const { headers } = await signedInAdmin();
      const student = await createUser();
      const book = await createBook({ inventoryPurchased: 5, priceInrPaise: 10000 });
      const shippedOrder = () =>
        prisma.bookOrder.create({
          data: {
            userId: student.id,
            status: "SHIPPED",
            totalAmountInrPaise: 10000,
            upiTransactionId: `UTR${Math.random().toString().slice(2, 10)}`,
            deliveryAddress: "1 Test Street, Srinagar",
            deliveryPinCode: "190001",
            deliveryPhoneNumber: "9876543210",
            items: { create: [{ bookId: book.id, quantity: 1, priceAtPurchaseInrPaise: 10000 }] },
          },
        });
      const refund = (id: string, json?: unknown) =>
        orderAction(apiRequest(`/api/v1/admin/bookstore/orders/${id}/refund`, { method: "POST", headers, json }), routeParams({ id, action: "refund" }));
      const available = async () => (await getStockLevels(prisma, [book.id])).get(book.id)!.available;
      const [kept, returned] = [await shippedOrder(), await shippedOrder()];
      expect(await available()).toBe(3);

      expect((await refund(kept.id)).status).toBe(200);
      expect(await available()).toBe(3);
      expect((await refund(returned.id, { booksReturned: true })).status).toBe(200);
      expect(await available()).toBe(4);
    });

    it("enrollments: approve activates a pending request and needs courseId", async () => {
      const { headers } = await signedInAdmin();
      const student = await createUser();
      const course = await createCourse({ priceInrPaise: 0, monthlyFeeInrPaise: 0 });
      const enrollment = await createEnrollment(student.id, course.id, { status: "pending_approval", statusEnum: "PENDING_APPROVAL" });

      const noCourse = await approveEnrollment(
        apiRequest(`/api/v1/admin/enrollments/${enrollment.id}/approve`, { method: "POST", headers, json: {} }),
        routeParams({ id: enrollment.id }),
      );
      expect(noCourse.status).toBe(400);
      expect(await jsonOf(noCourse)).toEqual({ success: false, error: "courseId is required." });

      const response = await approveEnrollment(
        apiRequest(`/api/v1/admin/enrollments/${enrollment.id}/approve`, { method: "POST", headers, json: { courseId: course.id } }),
        routeParams({ id: enrollment.id }),
      );
      expect(response.status).toBe(200);
      expect((await jsonOf(response)).success).toBe(true);
      expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).statusEnum).toBe("ACTIVE");
    });

    it("announcements: a teacher posts to their own course as themselves", async () => {
      const me = await signedInTeacher();
      const course = await createCourse({ teacherId: me.teacher.id });

      const form = new FormData();
      form.set("category", "GENERAL_NOTICE");
      form.set("title", "Class moved");
      form.set("body", "Tomorrow's class starts at 10.");
      const response = await teacherAnnounce(
        apiRequest(`/api/v1/teacher/courses/${course.id}/announcements`, { method: "POST", headers: me.headers, body: form }),
        routeParams({ id: course.id }),
      );
      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toEqual({ success: true, redirect: expect.stringContaining("posted=1") });

      const saved = await prisma.courseAnnouncement.findFirstOrThrow({ where: { courseId: course.id } });
      // The actor bridge made the action see the API caller, not an anonymous or admin session.
      expect(saved).toMatchObject({ title: "Class moved", teacherId: me.teacher.id, postedByAdmin: false });
    });

    it("grades: a teacher saves a grade card for enrolled students only", async () => {
      const me = await signedInTeacher();
      const course = await createCourse({ teacherId: me.teacher.id });
      const student = await createUser();
      const enrollment = await createEnrollment(student.id, course.id);
      const otherCourse = await createCourse();
      const outsider = await createEnrollment((await createUser()).id, otherCourse.id);

      const post = (records: unknown[]) =>
        teacherGrade(
          apiRequest(`/api/v1/teacher/courses/${course.id}/grades`, {
            method: "POST",
            headers: me.headers,
            json: { title: "Unit test 1", date: "2026-05-04", maxMarks: 50, records },
          }),
          routeParams({ id: course.id }),
        );

      const ok = await post([{ enrollmentId: enrollment.id, marksObtained: 42 }]);
      expect(ok.status).toBe(200);
      expect(await jsonOf(ok)).toEqual({ success: true, result: {} });
      expect(await prisma.courseGradeRecord.findFirst({ where: { enrollmentId: enrollment.id } })).toMatchObject({ marksObtained: 42 });

      const foreign = await post([{ enrollmentId: outsider.id, marksObtained: 10 }]);
      expect(foreign.status).toBe(400);
      expect(await prisma.courseGradeRecord.count({ where: { enrollmentId: outsider.id } })).toBe(0);
    });
  });
});
