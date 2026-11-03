import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { startEnrollment } from "@/services/enrollments";
import {
  adminEnrollUser,
  approveEnrollmentRequest,
  rejectEnrollmentRequest,
  removeEnrollmentFromCourse,
} from "@/app/admin/enrollments/actions";
import { createCourse, createUser, resetDb, runAction, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

describe.skipIf(SKIP_WITHOUT_DB)("enrollment lifecycle", () => {
  beforeEach(async () => {
    await resetDb();
    const admin = await createUser({ email: "admin@example.test", name: "Admin" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  it("applies, is approved, gets a roll number and a notification", async () => {
    const student = await createUser();
    const course = await createCourse({ priceInrPaise: 0 });

    const enrollment = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");
    expect(enrollment).toMatchObject({ status: "pending_approval", statusEnum: "PENDING_APPROVAL", rollNumber: null });

    const result = await runAction(() => approveEnrollmentRequest(enrollment.id, course.id));
    expect(result.redirectedTo).toBe("/admin/enrollments");

    const row = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(row).toMatchObject({ status: "active", statusEnum: "ACTIVE", rollNumber: 1, rejectedAt: null });
    const notes = await prisma.studentNotification.findMany({ where: { userId: student.id } });
    expect(notes.map((n) => n.type)).toEqual(["ENROLLMENT_APPROVED"]);
  });

  it("approves into COMPLETED for a completed course, without a roll number", async () => {
    const student = await createUser();
    const course = await createCourse({ status: "COMPLETED" });
    const enrollment = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");

    await runAction(() => approveEnrollmentRequest(enrollment.id, course.id));

    const row = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(row.statusEnum).toBe("COMPLETED");
    expect(row.rollNumber).toBeNull();
  });

  it("rejects a request, keeps the row for history and notifies the student", async () => {
    const student = await createUser();
    const course = await createCourse();
    const enrollment = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");

    const result = await runAction(() => rejectEnrollmentRequest(enrollment.id, course.id));
    expect(result.redirectedTo).toBe("/admin/enrollments");

    const row = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(row).toMatchObject({ status: "rejected", statusEnum: "REJECTED" });
    expect(row.rejectedAt).not.toBeNull();
    const notes = await prisma.studentNotification.findMany({ where: { userId: student.id } });
    expect(notes.map((n) => n.type)).toEqual(["ENROLLMENT_REJECTED"]);
  });

  it("lets a rejected student apply again on the same row and be approved", async () => {
    const student = await createUser();
    const course = await createCourse();
    const first = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");
    await runAction(() => rejectEnrollmentRequest(first.id, course.id));

    const again = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");
    expect(again.id).toBe(first.id);
    expect(again).toMatchObject({ statusEnum: "PENDING_APPROVAL", rejectedAt: null });
    expect(await prisma.enrollment.count({ where: { userId: student.id, courseId: course.id } })).toBe(1);

    await runAction(() => approveEnrollmentRequest(again.id, course.id));
    const row = await prisma.enrollment.findUniqueOrThrow({ where: { id: first.id } });
    expect(row).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 1 });
  });

  it("does not reset an enrollment that is not rejected when the student applies again", async () => {
    const student = await createUser();
    const course = await createCourse();
    const first = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");
    await runAction(() => approveEnrollmentRequest(first.id, course.id));

    const again = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");

    expect(again.id).toBe(first.id);
    expect(again.statusEnum).toBe("ACTIVE");
  });

  it("only rejects pending or fee-awaiting requests and only approves pending ones", async () => {
    const student = await createUser();
    const course = await createCourse();
    const enrollment = await startEnrollment(student.id, course.id, "AWAITING_ENROLLMENT_FEE");

    const approve = await approveEnrollmentRequest(enrollment.id, course.id);
    expect(approve.error).toBe("This enrollment cannot be approved.");

    await runAction(() => rejectEnrollmentRequest(enrollment.id, course.id));
    const rejectAgain = await rejectEnrollmentRequest(enrollment.id, course.id);
    expect(rejectAgain.error).toBe("Only pending enrollment requests can be rejected.");
  });

  it("answers 'not found' when the enrollment belongs to another course", async () => {
    const student = await createUser();
    const course = await createCourse();
    const other = await createCourse();
    const enrollment = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");

    expect((await approveEnrollmentRequest(enrollment.id, other.id)).error).toBe("Enrollment not found.");
    expect((await rejectEnrollmentRequest(enrollment.id, other.id)).error).toBe("Enrollment not found.");
  });

  it("enrolls a student directly by email and numbers them", async () => {
    const student = await createUser({ email: "direct@example.test" });
    const course = await createCourse();
    const form = new FormData();
    form.set("email", "direct@example.test");
    form.set("courseId", course.id);

    const result = await adminEnrollUser({}, form);

    expect(result.success).toContain("is now enrolled");
    const row = await prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    expect(row).toMatchObject({ statusEnum: "ACTIVE", rollNumber: 1 });
  });

  it("removes an enrollment without touching the student account", async () => {
    const student = await createUser();
    const course = await createCourse();
    const enrollment = await startEnrollment(student.id, course.id, "PENDING_APPROVAL");

    const result = await removeEnrollmentFromCourse(enrollment.id, course.id);

    expect(result).toEqual({ success: "Enrollment removed successfully." });
    expect(await prisma.enrollment.count()).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: student.id } })).not.toBeNull();
  });
});
