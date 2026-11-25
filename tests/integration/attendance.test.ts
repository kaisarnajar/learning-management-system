import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { saveCourseAttendance } from "@/app/actions/attendance";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

describe.skipIf(SKIP_WITHOUT_DB)("saving attendance", () => {
  beforeEach(resetDb);

  it("creates the day's records, then changes only what was changed on a second save", async () => {
    const user = await createUser({ email: "teacher@example.test" });
    const teacher = await createTeacher({ email: user.email, userId: user.id });
    const course = await createCourse({ teacherId: teacher.id });
    vi.mocked(auth).mockResolvedValue(sessionFor(user, "TEACHER") as never);
    const students = [];
    for (let i = 0; i < 3; i++) students.push(await createEnrollment((await createUser()).id, course.id));
    const day = new Date("2026-03-02");
    const presence = async () =>
      Object.fromEntries((await prisma.courseAttendanceRecord.findMany()).map((r) => [r.enrollmentId, r.isPresent]));

    await saveCourseAttendance(course.id, day, students.map((s, i) => ({ enrollmentId: s.id, isPresent: i !== 1 })));
    expect(await presence()).toEqual({ [students[0].id]: true, [students[1].id]: false, [students[2].id]: true });

    await saveCourseAttendance(course.id, day, students.map((s, i) => ({ enrollmentId: s.id, isPresent: i === 1 })));
    expect(await presence()).toEqual({ [students[0].id]: false, [students[1].id]: true, [students[2].id]: false });
    expect(await prisma.courseAttendance.count()).toBe(1);
  });
});
