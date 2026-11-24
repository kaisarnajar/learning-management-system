import { NextRequest } from "next/server";
import { createCourse } from "@/app/admin/courses/actions";
import { adminCourseRow } from "@/services/api-admin-courses";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { getAllCoursesPaginated } from "@/services/courses";
import { getEnrollmentCountsByCourse } from "@/services/enrollments";

/** Courses, as on /admin/courses (`q` searches title, category and instructor). */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/courses", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const { items, totalCount } = await getAllCoursesPaginated(page, pageSize, q || undefined);
    const counts = await getEnrollmentCountsByCourse(items.map((c) => c.id));
    return pagedBody(items.map((c) => adminCourseRow(c, counts.get(c.id) ?? 0)), totalCount, page, pageSize);
  });
}

/**
 * Adds a course. Form fields as on /admin/courses/new: title, description, startDate (YYYY-MM-DD), duration,
 * category, teacherId, level, enrollmentFeeInr, monthlyFeeInr, feeFrequency, status, featuredOnHomepage ("on").
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/courses POST", async () => createCourse(await readActionForm(request)));
}
