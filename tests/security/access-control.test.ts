import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import {
  deleteCourseGrade,
  getGradeRecordsForGradeId,
  getStudentGradeReport,
  saveCourseGrade,
} from "@/app/actions/grades";
import { deleteCourseAttendance, getAttendanceRecordsForDate, saveCourseAttendance } from "@/app/actions/attendance";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

/** Two teachers, each with a course, a student, a grade card and an attendance day. */
async function twoClassrooms() {
  const world = {} as Record<"a" | "b", Awaited<ReturnType<typeof classroom>>>;
  for (const key of ["a", "b"] as const) world[key] = await classroom(key);
  return world;
}

async function classroom(label: string) {
  const user = await createUser({ email: `teacher-${label}@example.test`, name: `Teacher ${label}` });
  const teacher = await createTeacher({ email: user.email, userId: user.id });
  const course = await createCourse({ teacherId: teacher.id });
  const student = await createUser({ name: `Student ${label}` });
  const enrollment = await createEnrollment(student.id, course.id, { rollNumber: 1 });
  const grade = await prisma.courseGrade.create({ data: { courseId: course.id, title: `Exam ${label}`, date: new Date("2026-03-05"), maxMarks: 50 } });
  await prisma.courseGradeRecord.create({ data: { gradeId: grade.id, enrollmentId: enrollment.id, marksObtained: 40 } });
  const day = new Date("2026-03-01");
  const attendance = await prisma.courseAttendance.create({ data: { courseId: course.id, date: day } });
  await prisma.courseAttendanceRecord.create({ data: { attendanceId: attendance.id, enrollmentId: enrollment.id, isPresent: true } });
  return { user, teacher, course, student, enrollment, grade, attendance, day };
}

const actAs = (user: { id: string; email: string }, role: "TEACHER" | "ADMIN" | "STUDENT") =>
  vi.mocked(auth).mockResolvedValue(sessionFor(user, role) as never);

describe.skipIf(SKIP_WITHOUT_DB)("teacher authorisation: grades and attendance stay inside the teacher's own course (GRD-1, GRD-2)", () => {
  beforeEach(resetDb);

  it("refuses unauthenticated and student callers outright", async () => {
    const { a } = await twoClassrooms();

    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(getGradeRecordsForGradeId(a.course.id, a.grade.id)).rejects.toThrow("Unauthorized");

    actAs(a.student, "STUDENT");
    await expect(getGradeRecordsForGradeId(a.course.id, a.grade.id)).rejects.toThrow("Forbidden");
    await expect(deleteCourseGrade(a.course.id, a.grade.id)).rejects.toThrow("Forbidden");
    await expect(saveCourseAttendance(a.course.id, a.day, [])).rejects.toThrow("Forbidden");
    expect(await prisma.courseGrade.count()).toBe(2);
  });

  it("refuses a teacher acting on a course that is not theirs", async () => {
    const { a, b } = await twoClassrooms();
    actAs(a.user, "TEACHER");

    await expect(getGradeRecordsForGradeId(b.course.id, b.grade.id)).rejects.toThrow("Forbidden");
    await expect(saveCourseGrade(b.grade.id, b.course.id, "Hijacked", new Date("2026-03-05"), 10, [])).rejects.toThrow("Forbidden");
    await expect(deleteCourseGrade(b.course.id, b.grade.id)).rejects.toThrow("Forbidden");
    await expect(getAttendanceRecordsForDate(b.course.id, b.day)).rejects.toThrow("Forbidden");
    await expect(saveCourseAttendance(b.course.id, b.day, [])).rejects.toThrow("Forbidden");
    await expect(deleteCourseAttendance(b.course.id, b.day)).rejects.toThrow("Forbidden");
    await expect(getStudentGradeReport(b.enrollment.id)).rejects.toThrow("Forbidden");
  });

  it("cannot read another course's grade card through their own course id", async () => {
    const { a, b } = await twoClassrooms();
    actAs(a.user, "TEACHER");

    expect(await getGradeRecordsForGradeId(a.course.id, b.grade.id)).toBeNull();
    expect(await getGradeRecordsForGradeId(a.course.id, a.grade.id)).toMatchObject({ id: a.grade.id });
  });

  it("cannot overwrite another course's grade card through their own course id", async () => {
    const { a, b } = await twoClassrooms();
    actAs(a.user, "TEACHER");

    const result = await saveCourseGrade(b.grade.id, a.course.id, "Hijacked", new Date("2026-03-09"), 10, [
      { enrollmentId: a.enrollment.id, marksObtained: 1 },
    ]);

    expect(result.error).toBe("Failed to save grades"); // rejected; the cause stays in the server log
    expect(await prisma.courseGrade.findUniqueOrThrow({ where: { id: b.grade.id } })).toMatchObject({ title: "Exam b", maxMarks: 50 });
    expect(await prisma.courseGradeRecord.count({ where: { gradeId: b.grade.id } })).toBe(1);
    expect(await prisma.courseGradeRecord.count({ where: { enrollmentId: a.enrollment.id, gradeId: b.grade.id } })).toBe(0);
  });

  it("cannot delete another course's grade card through their own course id", async () => {
    const { a, b } = await twoClassrooms();
    actAs(a.user, "TEACHER");

    await expect(deleteCourseGrade(a.course.id, b.grade.id)).rejects.toThrow();

    expect(await prisma.courseGrade.count({ where: { id: b.grade.id } })).toBe(1);
  });

  it("cannot write marks for students of another course (new or existing card)", async () => {
    const { a, b } = await twoClassrooms();
    actAs(a.user, "TEACHER");

    const intoNew = await saveCourseGrade(null, a.course.id, "Smuggled", new Date("2026-03-09"), 50, [
      { enrollmentId: a.enrollment.id, marksObtained: 10 },
      { enrollmentId: b.enrollment.id, marksObtained: 0 },
    ]);
    expect(intoNew.error).toBe("Failed to save grades");
    expect(await prisma.courseGrade.count({ where: { title: "Smuggled" } })).toBe(0);

    const intoExisting = await saveCourseGrade(a.grade.id, a.course.id, "Exam a", new Date("2026-03-05"), 50, [
      { enrollmentId: b.enrollment.id, marksObtained: 1 },
    ]);
    expect(intoExisting.error).toBe("Failed to save grades");
    expect(await prisma.courseGradeRecord.findFirstOrThrow({ where: { enrollmentId: b.enrollment.id } })).toMatchObject({ marksObtained: 40 });
  });

  it("cannot mark attendance for students of another course", async () => {
    const { a, b } = await twoClassrooms();
    actAs(a.user, "TEACHER");

    await expect(
      saveCourseAttendance(a.course.id, new Date("2026-03-09"), [
        { enrollmentId: a.enrollment.id, isPresent: true },
        { enrollmentId: b.enrollment.id, isPresent: false },
      ]),
    ).rejects.toThrow("Failed to save attendance");

    expect(await prisma.courseAttendance.count({ where: { courseId: a.course.id } })).toBe(1);
    expect(await prisma.courseAttendanceRecord.findFirstOrThrow({ where: { enrollmentId: b.enrollment.id } })).toMatchObject({ isPresent: true });
  });

  it("validates grade input on the server (negative, above maximum, NaN, duplicates)", async () => {
    const { a } = await twoClassrooms();
    actAs(a.user, "TEACHER");
    const save = (maxMarks: number, records: Array<{ enrollmentId: string; marksObtained: number | null }>) =>
      saveCourseGrade(a.grade.id, a.course.id, "Exam a", new Date("2026-03-05"), maxMarks, records);

    expect((await save(50, [{ enrollmentId: a.enrollment.id, marksObtained: -1 }])).error).toBeTruthy();
    expect((await save(50, [{ enrollmentId: a.enrollment.id, marksObtained: 51 }])).error).toMatch(/cannot exceed/);
    expect((await save(50, [{ enrollmentId: a.enrollment.id, marksObtained: Number.NaN }])).error).toBeTruthy();
    expect((await save(0, [])).error).toBeTruthy();
    expect(
      (await save(50, [{ enrollmentId: a.enrollment.id, marksObtained: 1 }, { enrollmentId: a.enrollment.id, marksObtained: 2 }])).error,
    ).toMatch(/more than once/);
    expect(await prisma.courseGradeRecord.findFirstOrThrow({ where: { enrollmentId: a.enrollment.id } })).toMatchObject({ marksObtained: 40 });
  });

  it("lets the owner teacher and an admin do their job", async () => {
    const { a, b } = await twoClassrooms();

    actAs(a.user, "TEACHER");
    expect((await saveCourseGrade(a.grade.id, a.course.id, "Exam a (revised)", new Date("2026-03-05"), 60, [{ enrollmentId: a.enrollment.id, marksObtained: 55 }])).error).toBeUndefined();
    expect(await prisma.courseGrade.findUniqueOrThrow({ where: { id: a.grade.id } })).toMatchObject({ title: "Exam a (revised)", maxMarks: 60 });

    const admin = await createUser({ email: "admin@example.test" });
    actAs(admin, "ADMIN");
    expect(await getGradeRecordsForGradeId(b.course.id, b.grade.id)).toMatchObject({ id: b.grade.id });
    await deleteCourseGrade(b.course.id, b.grade.id);
    expect(await prisma.courseGrade.count({ where: { id: b.grade.id } })).toBe(0);
  });
});
