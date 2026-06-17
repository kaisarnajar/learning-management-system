import Link from "next/link";
import { DeleteCourseButton } from "@/components/admin/DeleteCourseButton";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getCoursePricingFromCourse } from "@/lib/course-pricing";
import { getAllCoursesPaginated } from "@/lib/courses";
import { getEnrollmentCountsByCourse } from "@/lib/enrollments";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; created?: string; deleteError?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const [{ items: courses, totalCount }, enrollmentCounts] = await Promise.all([
    getAllCoursesPaginated(requestedPage, pageSize, q),
    getEnrollmentCountsByCourse(),
  ]);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Courses</h1>
          <p className="mt-1 text-sm text-muted">{totalCount} total</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
        >
          Add course
        </Link>
      </div>

      {params.created === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Course created.</p>
      )}

      {params.deleted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Course deleted.</p>
      )}
      {params.deleteError && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          {decodeURIComponent(params.deleteError)}
        </p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action="/admin/courses"
          query={q}
          placeholder="Search by title, category, or instructor"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q ? "No courses match your search." : "No courses yet."}
          </p>
        ) : (
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-border bg-background/50 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Instructor</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Registration fee</th>
              <th className="px-4 py-3 font-medium">Monthly fee</th>
              <th className="px-4 py-3 font-medium">Students</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Homepage</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses.map((course) => {
              const studentCount = enrollmentCounts.get(course.id) ?? 0;
              const fees = getCoursePricingFromCourse(course);
              return (
                <tr key={course.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{course.title}</td>
                  <td className="px-4 py-3 text-muted">{course.category}</td>
                  <td className="px-4 py-3 text-muted">
                    {course.teacher?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{course.duration || "—"}</td>
                  <td className="px-4 py-3 text-muted">₹{fees.registrationFeeInr}</td>
                  <td className="px-4 py-3 text-muted">₹{fees.monthlyFeeInr}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/courses/${course.id}/students`}
                      className="font-medium text-primary hover:underline"
                    >
                      {studentCount}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <CourseStatusBadge status={course.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {course.featuredOnHomepage && course.status !== "DRAFT" ? "Featured" : "Not featured"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/courses/${course.id}/announcements`}
                        className="text-primary hover:underline"
                      >
                        Announcements
                      </Link>
                      <Link href={`/admin/courses/${course.id}/edit`} className="font-medium text-primary hover:underline">
                        Edit
                      </Link>
                      <DeleteCourseButton
                        id={course.id}
                        title={course.title}
                        studentCount={studentCount}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      <Pagination
        basePath="/admin/courses"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
