import type { Course, CourseStatus } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getEnrollmentsForCoursePaginated } from "@/lib/enrollments";
import { withDbErrorHandling } from "@/lib/db-error";

export type TeacherCourse = Course & {
  studentCount: number;
};

export async function getCoursesForTeacher(teacherId: string): Promise<TeacherCourse[]> {
  const courses = await withDbErrorHandling(() => prisma.course.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
    }), "Database operation failed");

  const counts = await withDbErrorHandling(() => prisma.enrollment.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courses.map((c) => c.id) } },
      _count: { _all: true },
    }), "Database operation failed");
  const countByCourse = new Map(counts.map((row) => [row.courseId, row._count._all]));

  return courses.map((course) => ({
    ...course,
    studentCount: countByCourse.get(course.id) ?? 0,
  }));
}

export async function getCoursesForTeacherPaginated(
  teacherId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<TeacherCourse>> {
  const where = { teacherId };
  const totalCount = await withDbErrorHandling(() => prisma.course.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const courses = await withDbErrorHandling(() => prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");

  const counts = await withDbErrorHandling(() => prisma.enrollment.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courses.map((c) => c.id) } },
      _count: { _all: true },
    }), "Database operation failed");
  const countByCourse = new Map(counts.map((row) => [row.courseId, row._count._all]));

  const items = courses.map((course) => ({
    ...course,
    studentCount: countByCourse.get(course.id) ?? 0,
  }));

  return { items, totalCount };
}

export async function getTeacherCourseForPortal(teacherId: string, courseId: string) {
  return withDbErrorHandling(() => prisma.course.findFirst({
      where: { id: courseId, teacherId },
    }), "Database operation failed");
}

export async function getTeacherCourseStudentsPaginated(
  teacherId: string,
  courseId: string,
  page: number,
  pageSize: number,
) {
  const course = await getTeacherCourseForPortal(teacherId, courseId);
  if (!course) return null;

  const { items, totalCount } = await getEnrollmentsForCoursePaginated(courseId, page, pageSize);
  return { course, enrollments: items, totalCount };
}

export async function getTeacherEnrollmentInCourse(
  teacherId: string,
  courseId: string,
  enrollmentId: string,
) {
  const course = await getTeacherCourseForPortal(teacherId, courseId);
  if (!course) return null;

  const enrollment = await withDbErrorHandling(() => prisma.enrollment.findFirst({
      where: { id: enrollmentId, courseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            fatherName: true,
            dateOfBirth: true,
            occupation: true,
            address: true,
            whatsapp: true,
            createdAt: true,
          },
        },
      },
    }), "Database operation failed");
  if (!enrollment) return null;

  return { course, enrollment };
}

export function teacherDashboardStats(courses: TeacherCourse[]) {
  const byStatus = courses.reduce(
    (acc, course) => {
      acc[course.status] = (acc[course.status] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<CourseStatus, number>>,
  );

  return {
    totalCourses: courses.length,
    totalStudents: courses.reduce((sum, c) => sum + c.studentCount, 0),
    byStatus,
  };
}
