import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { assignRollNumber } from "@/services/roll-numbers";
import { createCourse, createEnrollment, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

describe.skipIf(SKIP_WITHOUT_DB)("roll number assignment", () => {
  beforeEach(resetDb);

  it("gives ten concurrent approvals ten distinct, gap-free roll numbers", async () => {
    const course = await createCourse();
    const enrollments = [];
    for (let i = 0; i < 10; i++) {
      const user = await createUser();
      enrollments.push(await createEnrollment(user.id, course.id));
    }

    await Promise.all(enrollments.map((e) => assignRollNumber(e.id, course.id)));

    const rows = await prisma.enrollment.findMany({ where: { courseId: course.id }, select: { rollNumber: true } });
    const numbers = rows.map((r) => r.rollNumber).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("is idempotent for an enrollment that already has a number", async () => {
    const course = await createCourse();
    const user = await createUser();
    const enrollment = await createEnrollment(user.id, course.id);

    await assignRollNumber(enrollment.id, course.id);
    await assignRollNumber(enrollment.id, course.id);

    const row = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(row.rollNumber).toBe(1);
  });

  it("numbers each course independently", async () => {
    const [courseA, courseB] = [await createCourse(), await createCourse()];
    const user = await createUser();
    const a = await createEnrollment(user.id, courseA.id);
    const b = await createEnrollment(user.id, courseB.id);

    await Promise.all([assignRollNumber(a.id, courseA.id), assignRollNumber(b.id, courseB.id)]);

    const rows = await prisma.enrollment.findMany({ where: { userId: user.id } });
    expect(rows.map((r) => r.rollNumber)).toEqual([1, 1]);
  });

  it("continues after the highest existing number", async () => {
    const course = await createCourse();
    const first = await createUser();
    await createEnrollment(first.id, course.id, { rollNumber: 7 });
    const second = await createUser();
    const enrollment = await createEnrollment(second.id, course.id);

    await assignRollNumber(enrollment.id, course.id);

    const row = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(row.rollNumber).toBe(8);
  });
});
