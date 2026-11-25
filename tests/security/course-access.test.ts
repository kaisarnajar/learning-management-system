import { beforeEach, describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { assertCourseAccess, courseAccessFor } from "@/services/course-authorization";
import { createCourse, createEnrollment, createTeacher, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

type Role = NonNullable<Session["user"]["role"]>;
const actor = (user: { id: string; email: string }, role: Role, teacherId?: string): Pick<Session, "user"> => ({
  user: { id: user.id, email: user.email, name: null, role, ...(teacherId ? { teacherId } : {}) },
});

// One rule (services/course-authorization.ts) for the website, the staff API,
// the announcement actions and the private files route.
describe.skipIf(SKIP_WITHOUT_DB)("assertCourseAccess", () => {
  beforeEach(resetDb);

  it("admits admins, the course's own teacher and, for reading, its approved students", async () => {
    const teacherUser = await createUser({ email: "own.teacher@example.test" });
    const teacher = await createTeacher({ email: "own.teacher@example.test", userId: teacherUser.id });
    const otherUser = await createUser({ email: "other.teacher@example.test" });
    const other = await createTeacher({ email: "other.teacher@example.test", userId: otherUser.id });
    // A profile the user-link backfill has not reached: matched by e-mail.
    const unlinkedUser = await createUser({ email: "unlinked.teacher@example.test" });
    const unlinked = await createTeacher({ email: "unlinked.teacher@example.test" });
    const course = await createCourse({ teacherId: teacher.id });
    const unlinkedCourse = await createCourse({ teacherId: unlinked.id });
    const admin = await createUser();
    const student = await createUser();
    await createEnrollment(student.id, course.id);
    const pending = await createUser();
    await createEnrollment(pending.id, course.id, { status: "pending_approval", statusEnum: "PENDING_APPROVAL" });
    const stranger = await createUser();

    const as = async (who: Pick<Session, "user">, write: boolean, courseId = course.id) =>
      (await courseAccessFor(who, courseId, { write }))?.as ?? null;

    for (const write of [true, false]) {
      expect(await as(actor(admin, "ADMIN"), write)).toBe("admin");
      expect(await as(actor(admin, "DEVELOPER"), write)).toBe("admin");
      expect(await as(actor(teacherUser, "TEACHER"), write)).toBe("teacher");
      expect(await as(actor(teacherUser, "TEACHER", teacher.id), write)).toBe("teacher");
      expect(await as(actor(otherUser, "TEACHER"), write)).toBeNull();
      expect(await as(actor(otherUser, "TEACHER", other.id), write)).toBeNull();
      expect(await as(actor(unlinkedUser, "TEACHER"), write, unlinkedCourse.id)).toBe("teacher");
      expect(await as(actor(pending, "USER"), write)).toBeNull();
      expect(await as(actor(stranger, "USER"), write)).toBeNull();
      // A teacher's address on a student account grants nothing.
      expect(await as(actor(teacherUser, "USER"), write)).toBeNull();
    }
    expect(await as(actor(student, "USER"), false)).toBe("student");
    expect(await as(actor(student, "USER"), true)).toBeNull();
    expect(await as(actor(admin, "ADMIN"), true, "no-such-course")).toBeNull();

    await expect(assertCourseAccess(null, course.id, { write: false })).rejects.toThrow("Unauthorized");
    await expect(assertCourseAccess(actor(stranger, "USER"), course.id, { write: false })).rejects.toThrow("Forbidden");
    await expect(assertCourseAccess(actor(teacherUser, "TEACHER"), course.id, { write: true })).resolves.toMatchObject({ as: "teacher", course: { id: course.id } });
  });
});
