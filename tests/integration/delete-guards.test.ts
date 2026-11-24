import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { deleteCourse } from "@/app/admin/courses/actions";
import { deleteTeacherById } from "@/app/admin/teachers/actions";
import { deleteStudentUser } from "@/app/admin/students/actions";
import { deleteBook } from "@/app/admin/bookstore/actions";
import { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";
import {
  createBook,
  createCourse,
  createEnrollment,
  createTeacher,
  createUser,
  resetDb,
  runAction,
  sessionFor,
  SKIP_WITHOUT_DB,
} from "../helpers/db";

describe.skipIf(SKIP_WITHOUT_DB)("delete guards", () => {
  beforeEach(async () => {
    await resetDb();
    const admin = await createUser({ email: "admin@example.test", name: "Admin" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  describe("courses", () => {
    const flashOf = (url: string | null) => decodeURIComponent(new URL(url ?? "/", "http://x").searchParams.get("msg") ?? "");

    it("refuses to delete a course that has enrolled students", async () => {
      const course = await createCourse();
      const student = await createUser();
      await createEnrollment(student.id, course.id);

      const result = await runAction(() => deleteCourse(course.id));

      expect(flashOf(result.redirectedTo)).toContain("1 student is enrolled");
      expect(await prisma.course.count({ where: { id: course.id } })).toBe(1);
    });

    it("refuses while a fee submission is awaiting verification", async () => {
      const course = await createCourse();
      const student = await createUser();
      await prisma.coursePaymentSubmission.create({
        data: { userId: student.id, courseId: course.id, label: "Fee", amountInrPaise: 100, status: "pending_verification", statusEnum: "PENDING_VERIFICATION" },
      });

      const result = await runAction(() => deleteCourse(course.id));

      expect(flashOf(result.redirectedTo)).toContain("fee payment submission");
      expect(await prisma.course.count()).toBe(1);
    });

    it("refuses when attendance, grade or coupon history exists", async () => {
      const course = await createCourse();
      await prisma.coupon.create({
        data: { code: "KEEP", type: "DEFAULT", percentage: 10, validFrom: new Date(), validUntil: new Date(Date.now() + 86_400_000), courseId: course.id },
      });

      const result = await runAction(() => deleteCourse(course.id));

      expect(flashOf(result.redirectedTo)).toContain("attendance, grade or coupon records");
      expect(await prisma.course.count()).toBe(1);
    });

    it("deletes an unused course together with its inactive enrollments", async () => {
      const course = await createCourse();
      const student = await createUser();
      await createEnrollment(student.id, course.id, { status: "rejected", statusEnum: "REJECTED" });

      const result = await runAction(() => deleteCourse(course.id));

      expect(result.redirectedTo).toBe("/admin/courses?deleted=1");
      expect(await prisma.course.count()).toBe(0);
      expect(await prisma.enrollment.count()).toBe(0);
      expect(await prisma.user.count({ where: { id: student.id } })).toBe(1);
    });

    it("keeps a course that has payment history (restrict) even when nothing is pending", async () => {
      const course = await createCourse();
      const student = await createUser();
      await prisma.paymentRecord.create({ data: { userId: student.id, courseId: course.id, amountInrPaise: 100, paidAt: new Date() } });

      // Payment records only detach (SetNull); the submission FK is RESTRICT, so
      // decided submissions block the delete too, with a readable message
      // instead of a raw foreign-key error.
      await prisma.coursePaymentSubmission.create({
        data: { userId: student.id, courseId: course.id, label: "Fee", amountInrPaise: 100, status: "approved", statusEnum: "APPROVED" },
      });

      const result = await runAction(() => deleteCourse(course.id));

      expect(flashOf(result.redirectedTo)).toContain("1 fee payment submission on record");
      expect(await prisma.course.count()).toBe(1);
    });
  });

  describe("teachers", () => {
    it("refuses while courses are assigned and deletes once they are reassigned", async () => {
      const teacher = await createTeacher({ name: "Ustadh Ali" });
      const course = await createCourse({ teacherId: teacher.id });

      const refused = await deleteTeacherById(teacher.id);
      expect(refused.error).toContain("assigned to 1 course");
      expect(await prisma.teacher.count()).toBe(1);

      await prisma.course.update({ where: { id: course.id }, data: { teacherId: null } });
      expect(await deleteTeacherById(teacher.id)).toEqual({});
      expect(await prisma.teacher.count()).toBe(0);
    });

    it("reports an unknown teacher", async () => {
      expect((await deleteTeacherById("missing")).error).toBe("Teacher not found.");
    });
  });

  describe("students", () => {
    it("refuses a student with an active or pending enrollment", async () => {
      const course = await createCourse();
      const student = await createUser();
      await createEnrollment(student.id, course.id);

      const result = await deleteStudentUser(student.id);

      expect(result.error).toContain("active or pending enrollment");
      expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).deletedAt).toBeNull();
    });

    it("refuses a student with pending fee submissions or unvoided payment records", async () => {
      const course = await createCourse();
      const pending = await createUser();
      await prisma.coursePaymentSubmission.create({
        data: { userId: pending.id, courseId: course.id, label: "Fee", amountInrPaise: 100, status: "pending_verification", statusEnum: "PENDING_VERIFICATION" },
      });
      expect((await deleteStudentUser(pending.id)).error).toContain("awaiting verification");

      const paid = await createUser();
      await prisma.paymentRecord.create({ data: { userId: paid.id, amountInrPaise: 100, paidAt: new Date() } });
      expect((await deleteStudentUser(paid.id)).error).toContain("payment records");
    });

    it("refuses admin and teacher accounts", async () => {
      const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.test" } });
      expect((await deleteStudentUser(admin.id)).error).toContain("cannot be deleted from here");

      const teacherUser = await createUser({ email: "teacher@example.test" });
      await createTeacher({ email: "teacher@example.test" });
      expect((await deleteStudentUser(teacherUser.id)).error).toContain("belongs to a teacher");
    });

    it("soft-deletes a clean student, anonymises the email, drops sessions and writes an audit entry", async () => {
      const student = await createUser({ email: "leaving@example.test", password: "hash" });
      await prisma.session.create({ data: { sessionToken: "tok", userId: student.id, expires: new Date(Date.now() + 86_400_000) } });

      const result = await deleteStudentUser(student.id);

      expect(result.success).toContain("Student account removed");
      const row = await prisma.user.findUniqueOrThrow({ where: { id: student.id } });
      expect(row.deletedAt).not.toBeNull();
      expect(row.email).toBe(`deleted+${student.id}@invalid.local`);
      expect(row.password).toBeNull();
      expect(await prisma.session.count({ where: { userId: student.id } })).toBe(0);
      const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "User", entityId: student.id } });
      expect(audit).toMatchObject({ action: "soft_delete", actorEmail: "admin@example.test" });
      expect(audit.before).toMatchObject({ email: "leaving@example.test" });

      // The address can be registered again.
      await expect(createUser({ email: "leaving@example.test" })).resolves.toBeTruthy();
      expect((await deleteStudentUser(student.id)).error).toBe("Student not found.");
    });
  });

  describe("books", () => {
    it("refuses to delete a book that appears in any order", async () => {
      const student = await createUser();
      const book = await createBook();
      const order = await prisma.bookOrder.create({
        data: {
          userId: student.id,
          totalAmountInrPaise: book.priceInrPaise,
          status: "DECLINED",
          items: { create: [{ bookId: book.id, quantity: 1, priceAtPurchaseInrPaise: book.priceInrPaise }] },
        },
      });

      const result = await deleteBook(book.id);

      expect(result.error).toContain("cannot be deleted");
      expect(await prisma.book.count()).toBe(1);
      expect(await prisma.bookOrderItem.count({ where: { orderId: order.id } })).toBe(1);
    });

    it("deletes a book that was never ordered", async () => {
      const book = await createBook();

      expect(await deleteBook(book.id)).toEqual({});
      expect(await prisma.book.count()).toBe(0);
      expect((await deleteBook(book.id)).error).toBe("Book not found.");
    });
  });

  describe("enrollments", () => {
    const histories = {
      "a certificate": async (enrollmentId: string) => {
        await prisma.enrollment.update({ where: { id: enrollmentId }, data: { certificateNumber: "DQA-CERT/2026-27/00001", certificateGeneratedAt: new Date() } });
      },
      "a payment record": async (_enrollmentId: string, userId: string, courseId: string) => {
        await prisma.paymentRecord.create({ data: { userId, courseId, amountInrPaise: 50000, paidAt: new Date(), paymentType: "enrollment", paymentTypeEnum: "ENROLLMENT" } });
      },
      "a grade": async (enrollmentId: string, _userId: string, courseId: string) => {
        const grade = await prisma.courseGrade.create({ data: { courseId, title: "Test 1", date: new Date(), maxMarks: 10 } });
        await prisma.courseGradeRecord.create({ data: { gradeId: grade.id, enrollmentId, marksObtained: 7 } });
      },
      "attendance": async (enrollmentId: string, _userId: string, courseId: string) => {
        const day = await prisma.courseAttendance.create({ data: { courseId, date: new Date() } });
        await prisma.courseAttendanceRecord.create({ data: { attendanceId: day.id, enrollmentId, isPresent: true } });
      },
    };

    it.each(Object.keys(histories) as (keyof typeof histories)[])("refuses to remove an enrollment with %s", async (history) => {
      const course = await createCourse();
      const student = await createUser();
      const enrollment = await createEnrollment(student.id, course.id);
      await histories[history](enrollment.id, student.id, course.id);

      const result = await removeEnrollmentFromCourse(enrollment.id, course.id);

      expect(result.error).toContain("cannot be removed");
      expect(await prisma.enrollment.count({ where: { id: enrollment.id } })).toBe(1);
      expect(await prisma.auditLog.count()).toBe(0);
    });

    it("removes an enrollment without history and audits it", async () => {
      const course = await createCourse();
      const student = await createUser();
      const enrollment = await createEnrollment(student.id, course.id, { status: "pending_approval", statusEnum: "PENDING_APPROVAL" });

      expect(await removeEnrollmentFromCourse(enrollment.id, course.id)).toEqual({ success: "Enrollment removed successfully." });

      expect(await prisma.enrollment.count({ where: { id: enrollment.id } })).toBe(0);
      const audit = await prisma.auditLog.findFirstOrThrow({ where: { entity: "Enrollment", entityId: enrollment.id } });
      expect(audit).toMatchObject({ action: "delete", actorEmail: "admin@example.test" });
      expect(audit.before).toMatchObject({ userId: student.id, courseId: course.id, status: "PENDING_APPROVAL" });
    });
  });
});
