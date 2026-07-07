import Link from "next/link";
import { notFound } from "next/navigation";
import { adminActionButtonClassName, adminDestructiveButtonClassName } from "@/utils/form";



import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { Pagination } from "@/components/shared/Pagination";
import { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";
import { getCourseById } from "@/services/courses";
import { getCourseRosterEnrollmentsPaginated } from "@/services/enrollments";
import { clampPage, parsePaginationParams } from "@/utils/pagination";
import { formatRollNumber } from "@/services/roll-numbers";
import { parseSearchQuery } from "@/utils/text-search";

export default async function CourseStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const q = parseSearchQuery(queryParams.q);
  const course = await getCourseById(id);

  if (!course) notFound();

  const { page: requestedPage, pageSize } = parsePaginationParams(queryParams);
  const { items: enrollments, totalCount } = await getCourseRosterEnrollmentsPaginated(
    course.id,
    course.status,
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  const isCompletedCourse = course.status === "COMPLETED";
  const rosterLabel = isCompletedCourse ? "completed students" : "active students";

  return (
    <div>
      <Link href="/admin/courses" className="text-sm text-primary hover:underline">
        ← Back to courses
      </Link>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-bold text-primary">Students</h1>
          <CourseStatusBadge status={course.status} />
        </div>
        <p className="mt-1 text-sm text-muted">
          <span className="font-medium text-foreground">{course.title}</span>
          {" · "}
          {totalCount} {rosterLabel}
        </p>
      </div>

      <div className="mt-6">
        <ListSearchForm
          action={`/admin/courses/${id}/students`}
          query={q}
          placeholder="Search by name or email"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q
              ? "No students match your search."
              : isCompletedCourse
                ? "No completed students for this course yet."
                : "No active students enrolled in this course yet."}
          </p>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Roll No</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {formatRollNumber(enrollment.rollNumber)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {enrollment.user.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{enrollment.user.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/courses/${id}/attendance/student/${enrollment.id}`}
                        className={adminActionButtonClassName}
                      >
                        Attendance
                      </Link>
                      <Link
                        href={`/admin/courses/${id}/grades/student/${enrollment.id}`}
                        className={adminActionButtonClassName}
                      >
                        Grade Card
                      </Link>

                      <ConfirmationModal 
                        title="Remove Enrollment" 
                        description={`Remove ${enrollment.user.name ?? enrollment.user.email} from this course? Their account will not be deleted; they can enroll again later.`} 
                        actionLabel="Remove" 
                        variant="destructive" 
                        onConfirm={async () => { "use server"; const result = await removeEnrollmentFromCourse(enrollment.id, id); if (result?.error) throw new Error(result.error); }} 
                        trigger={<button type="button" className={adminDestructiveButtonClassName}>Remove</button>} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        basePath={`/admin/courses/${id}/students`}
        params={queryParams}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
