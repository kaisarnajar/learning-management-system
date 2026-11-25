import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { saveCourseGrade } from "@/app/actions/grades";
import { getOverallGrade } from "@/utils/grade-card-html";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

describe("overall letter grade", () => {
  it("is taken from the exact percentage, not a rounded one", () => {
    expect(getOverallGrade(89.5)).toBe("A");
    expect(getOverallGrade(90)).toBe("A+");
    expect(getOverallGrade(39.5)).toBe("F");
    expect(getOverallGrade(40)).toBe("E");
  });
});

describe.skipIf(SKIP_WITHOUT_DB)("grade cards: maximum marks", () => {
  beforeEach(resetDb);

  it("cannot be lowered below a mark already stored, even one not in the form", async () => {
    const user = await createUser({ email: "teacher@example.test" });
    const teacher = await createTeacher({ email: user.email, userId: user.id });
    const course = await createCourse({ teacherId: teacher.id });
    vi.mocked(auth).mockResolvedValue(sessionFor(user, "TEACHER") as never);

    // A completed student is no longer in the form, but their mark stays.
    const graduate = await createEnrollment((await createUser()).id, course.id, { status: "completed", statusEnum: "COMPLETED" });
    const grade = await prisma.courseGrade.create({ data: { courseId: course.id, title: "Final exam", date: new Date("2026-03-05"), maxMarks: 100 } });
    await prisma.courseGradeRecord.create({ data: { gradeId: grade.id, enrollmentId: graduate.id, marksObtained: 80, marksObtainedDecimal: 80 } });

    const lowered = await saveCourseGrade(grade.id, course.id, "Final exam", new Date("2026-03-05"), 50, []);
    expect(lowered.error).toContain("cannot be lower");
    expect((await prisma.courseGrade.findUniqueOrThrow({ where: { id: grade.id } })).maxMarks).toBe(100);

    expect(await saveCourseGrade(grade.id, course.id, "Final exam", new Date("2026-03-05"), 80, [])).toEqual({});
    expect((await prisma.courseGrade.findUniqueOrThrow({ where: { id: grade.id } })).maxMarks).toBe(80);
  });
});
