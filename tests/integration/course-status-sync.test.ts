import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { updateCourse } from "@/app/admin/courses/actions";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, runAction, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

const sync = vi.hoisted(() => ({ fail: false }));
vi.mock("@/services/completion-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/completion-sync")>();
  return {
    ...actual,
    syncEnrollmentsWithCourseStatusIn: vi.fn(async (...args: Parameters<typeof actual.syncEnrollmentsWithCourseStatusIn>) => {
      if (sync.fail) throw new Error("simulated failure");
      return actual.syncEnrollmentsWithCourseStatusIn(...args);
    }),
  };
});

function courseForm(course: { title: string; teacherId: string | null }, status: string): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: course.title,
    description: "A course used by the tests.",
    startDate: "2026-04-01",
    duration: "6 months",
    level: "Beginner",
    category: "Quran",
    enrollmentFeeInr: "500",
    monthlyFeeInr: "349",
    feeFrequency: "MONTHLY",
    teacherId: course.teacherId ?? "",
    status,
  })) {
    form.set(key, value);
  }
  return form;
}

describe.skipIf(SKIP_WITHOUT_DB)("updateCourse: status and enrollments change together", () => {
  beforeEach(async () => {
    await resetDb();
    sync.fail = false;
    const admin = await createUser({ email: "admin@example.test" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
  });

  it("completing a course completes its active students", async () => {
    const teacher = await createTeacher();
    const course = await createCourse({ teacherId: teacher.id });
    const enrollment = await createEnrollment((await createUser()).id, course.id);

    await runAction(() => updateCourse(course.id, courseForm(course, "COMPLETED")));

    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).status).toBe("COMPLETED");
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).statusEnum).toBe("COMPLETED");
  });

  it("a failed enrollment sync leaves the course status unchanged, so saving again retries it", async () => {
    const teacher = await createTeacher();
    const course = await createCourse({ teacherId: teacher.id });
    const enrollment = await createEnrollment((await createUser()).id, course.id);

    sync.fail = true;
    await runAction(() => updateCourse(course.id, courseForm(course, "COMPLETED")));

    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).status).toBe("ONGOING");
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).statusEnum).toBe("ACTIVE");
  });
});
