import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteTeacherById, updateTeacher } from "@/app/admin/teachers/actions";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { courseStatusLabel } from "@/services/course-status";
import { getEnrollmentCountsByCourse } from "@/services/enrollments";
import { getCoursesForTeacher } from "@/services/teacher-portal";
import { getTeacherById } from "@/services/teachers";

type Params = { params: Promise<{ id: string }> };

/** One teacher as on /admin/teachers/[id]: profile and the courses they teach. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/teachers/[id]", async () => {
    const teacher = await getTeacherById(id);
    if (!teacher) notFound();
    const courses = await getCoursesForTeacher(id);
    const counts = await getEnrollmentCountsByCourse(courses.map((c) => c.id));
    return {
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        specialization: teacher.specialization,
        bio: teacher.bio,
        initials: teacher.initials,
        imageUrl: teacher.imageUrl,
        published: teacher.published,
        createdAt: teacher.createdAt,
        courses: courses.map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          status: c.status,
          statusLabel: courseStatusLabel(c.status),
          studentCount: counts.get(c.id) ?? c.studentCount,
        })),
      },
    };
  });
}

/** Edit form: the same fields as POST /admin/teachers. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/teachers/[id] PATCH", async () => {
    // The action reports a missing teacher as a bare "notfound" flag; answer a proper 404 instead.
    if (!(await getTeacherById(id))) notFound();
    return updateTeacher(id, await readActionForm(request));
  });
}

/** Deletes the teacher profile (refused while courses are assigned to them); the user account stays. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/teachers/[id] DELETE", () => deleteTeacherById(id));
}
