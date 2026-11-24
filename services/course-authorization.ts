import type { Course } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/utils/prisma";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { APPROVED_ENROLLMENT_STATUSES } from "@/services/enrollments";
import { getTeacherForSession } from "@/services/teacher-auth";
import { withDbErrorHandling } from "@/utils/db-error";

/**
 * The one rule for who may use a course's tools: admins and developers any
 * course; a teacher only the courses they teach now; and, for reading only,
 * a student with an approved enrollment. The website's server actions, the
 * staff API (services/api-course-tools.ts), the announcement actions and the
 * private files route all ask here.
 */

/** Whoever is asking: an Auth.js session, or the session the API built for a Bearer token. */
export type CourseActor = Pick<Session, "user">;

export type CourseAccess = { course: Course; as: "admin" | "teacher" | "student" };

/** Thrown when access is refused; the message is "Unauthorized" (no actor) or "Forbidden". */
export class CourseAccessError extends Error {}

/** The actor's teacher profile id: the one the session carries, else looked up (by user link, then normalised e-mail). */
async function teacherIdOf(actor: CourseActor): Promise<string | null> {
  if (actor.user?.role !== "TEACHER") return null;
  if (actor.user.teacherId) return actor.user.teacherId;
  const teacher = await getTeacherForSession(actor as Session);
  return teacher?.id ?? null;
}

/** How [actor] may manage a course taught by [courseTeacherId]: as an admin, as its teacher, or not at all. */
export async function managesCourseTaughtBy(actor: CourseActor, courseTeacherId: string | null): Promise<"admin" | "teacher" | null> {
  if (isAdminSession(actor as Session)) return "admin";
  const teacherId = await teacherIdOf(actor);
  return teacherId && courseTeacherId === teacherId ? "teacher" : null;
}

/**
 * The course and the capacity [actor] uses it in, or null when they may not
 * (or it does not exist). `write: false` also lets in a student with an
 * approved enrollment.
 */
export async function courseAccessFor(actor: CourseActor | null, courseId: string, { write }: { write: boolean }): Promise<CourseAccess | null> {
  if (!actor?.user?.id) return null;
  const course = await withDbErrorHandling(() => prisma.course.findUnique({ where: { id: courseId } }), "Database operation failed");
  if (!course) return null;

  const as = await managesCourseTaughtBy(actor, course.teacherId);
  if (as) return { course, as };
  if (write) return null;

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findFirst({
      where: { userId: actor.user.id, courseId, status: { in: [...APPROVED_ENROLLMENT_STATUSES] } },
      select: { id: true },
    }), "Database operation failed");
  return enrollment ? { course, as: "student" } : null;
}

/** courseAccessFor, throwing CourseAccessError("Unauthorized" | "Forbidden") instead of returning null. */
export async function assertCourseAccess(actor: CourseActor | null, courseId: string, options: { write: boolean }): Promise<CourseAccess> {
  if (!actor?.user?.id) throw new CourseAccessError("Unauthorized");
  const access = await courseAccessFor(actor, courseId, options);
  if (!access) throw new CourseAccessError("Forbidden");
  return access;
}

/** Authorizes the signed-in admin/developer or the teacher assigned to the course. Throws otherwise. */
export async function authorizeCourseManagement(courseId: string) {
  const session = await auth();
  if (!session) throw new CourseAccessError("Unauthorized");
  // An admin passes before anything is read (the course need not exist yet).
  if (isAdminSession(session)) return true;
  await assertCourseAccess(session, courseId, { write: true });
  return true;
}

/**
 * Loads a record whose course is only known after the load (e.g. a student's
 * enrollment) and returns it only to an admin/developer or that course's teacher.
 * The session is checked before anything is read.
 */
export async function loadForCourseManagement<T>(
  load: () => Promise<T>,
  courseTeacherId: (record: T) => string | null,
): Promise<T> {
  const session = await auth();
  if (!session) throw new CourseAccessError("Unauthorized");

  const record = await load();
  if (!(await managesCourseTaughtBy(session, courseTeacherId(record)))) throw new CourseAccessError("Forbidden");
  return record;
}
