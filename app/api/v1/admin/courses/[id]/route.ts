import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteCourse, updateCourse } from "@/app/admin/courses/actions";
import { courseFormOptions, courseFormValues } from "@/services/api-admin-courses";
import { courseHeader } from "@/services/api-course-tools";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import { getCourseById } from "@/services/courses";

type Params = { params: Promise<{ id: string }> };

/** One course: its header (as the course pages show it), the edit form's values and choices. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/courses/[id]", async () => {
    const course = await getCourseById(id);
    if (!course) notFound();
    return {
      course: { ...courseHeader(course), teacherName: course.teacher?.name ?? null },
      values: courseFormValues(course),
      options: await courseFormOptions(),
    };
  });
}

/** Saves the edit form (fields as POST /admin/courses, plus confirmReopen "on" to reopen a completed course). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/courses/[id] PATCH", async () => updateCourse(id, await readActionForm(request)));
}

/** Deletes the course (refused while it has students, payments, attendance, grades or coupons). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/courses/[id] DELETE", () => deleteCourse(id));
}
