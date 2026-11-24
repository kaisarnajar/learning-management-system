import { NextRequest } from "next/server";
import { TEACHER_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { courseStatusLabel } from "@/services/course-status";
import { getTeacherById } from "@/services/teachers";
import { getCoursesForTeacherPaginated, getTeacherDashboardStats } from "@/services/teacher-portal";
import { GRID_PAGE_SIZE } from "@/utils/pagination";

/** The teacher portal home (/teacher): the teacher, their counts and their courses (paged). */
export async function GET(request: NextRequest) {
  return staffRead(request, TEACHER_ROLES, "api/v1/teacher/courses", async (ctx) => {
    const teacherId = ctx.teacherId!;
    const { page, pageSize } = staffListParams(request, GRID_PAGE_SIZE);
    const [teacher, { items, totalCount }, stats] = await Promise.all([
      getTeacherById(teacherId),
      getCoursesForTeacherPaginated(teacherId, page, pageSize),
      getTeacherDashboardStats(teacherId),
    ]);
    return {
      ...pagedBody(
        items.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          statusLabel: courseStatusLabel(c.status),
          level: c.level,
          category: c.category,
          startDate: c.startDate,
          duration: c.duration,
          description: c.description,
          studentCount: c.studentCount,
        })),
        totalCount,
        page,
        pageSize,
      ),
      teacher: { name: teacher?.name ?? ctx.user.name ?? "", specialization: teacher?.specialization ?? "", email: teacher?.email ?? ctx.user.email },
      stats: { totalCourses: stats.totalCourses, totalStudents: stats.totalStudents },
    };
  });
}
