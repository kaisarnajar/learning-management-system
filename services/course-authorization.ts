import { prisma } from "@/utils/prisma";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { getTeacherForSession } from "@/services/teacher-auth";

/** Authorizes an admin/developer or the teacher assigned to the course. Throws otherwise. */
export async function authorizeCourseManagement(courseId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (isAdminSession(session)) return true;

  const teacher = await getTeacherForSession(session);
  if (teacher) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (course?.teacherId === teacher.id) {
      return true;
    }
  }

  throw new Error("Forbidden");
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
  if (!session) throw new Error("Unauthorized");

  const record = await load();

  if (!isAdminSession(session)) {
    const teacher = await getTeacherForSession(session);
    if (!teacher || courseTeacherId(record) !== teacher.id) {
      throw new Error("Forbidden");
    }
  }

  return record;
}
