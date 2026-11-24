import { NextRequest } from "next/server";
import { adminEnrollUser } from "@/app/admin/enrollments/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { isCourseEnrollmentOpen } from "@/services/course-status";
import { getAllCourses } from "@/services/courses";
import {
  getAwaitingEnrollmentFeeEnrollmentsPaginated,
  getPendingFreeEnrollmentApprovalsPaginated,
} from "@/services/enrollments";

type EnrollmentTab = "free_requests" | "paid_awaiting";

/**
 * Pending enrollments, as on /admin/enrollments. `type`: free_requests (default; free courses awaiting
 * approval) or paid_awaiting (paid courses awaiting the student's fee). `q` searches student and course.
 * Also answers both tabs' counts and the courses the "enrol a student" form offers.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/enrollments", async () => {
    const { page, pageSize, q, params } = staffListParams(request);
    const type: EnrollmentTab = params.get("type") === "paid_awaiting" ? "paid_awaiting" : "free_requests";
    const search = q || undefined;
    const [courses, free, paid] = await Promise.all([
      getAllCourses(),
      type === "free_requests"
        ? getPendingFreeEnrollmentApprovalsPaginated(page, pageSize, search)
        : getPendingFreeEnrollmentApprovalsPaginated(1, 1, search),
      type === "paid_awaiting"
        ? getAwaitingEnrollmentFeeEnrollmentsPaginated(page, pageSize, search)
        : getAwaitingEnrollmentFeeEnrollmentsPaginated(1, 1, search),
    ]);
    const active = type === "free_requests" ? free : paid;
    const titleById = new Map(courses.map((c) => [c.id, c.title]));
    return {
      ...pagedBody(
        active.items.map((e) => ({
          id: e.id,
          courseId: e.courseId,
          courseTitle: titleById.get(e.courseId) ?? e.courseId,
          status: e.status,
          createdAt: e.createdAt,
          user: { id: e.user.id, name: e.user.name, email: e.user.email },
        })),
        active.totalCount,
        page,
        pageSize,
      ),
      type,
      freeCount: free.totalCount,
      paidCount: paid.totalCount,
      enrollableCourses: courses.filter((c) => isCourseEnrollmentOpen(c.status)).map((c) => ({ id: c.id, title: c.title })),
    };
  });
}

/** "Enroll a student manually": email (a registered account), courseId. Answers `result.success` with the message. */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/enrollments POST", async () =>
    adminEnrollUser({}, await readActionForm(request)),
  );
}
