import Link from "next/link";
import { AdminListPage } from "@/components/shared/AdminListPage";
import { getAllCoursesPaginated } from "@/services/courses";
import { getEnrollmentCountsByCourse } from "@/services/enrollments";
import { parseSearchQuery } from "@/utils/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import { AdminCoursesTable } from "@/components/admin/AdminCoursesTable";
import { requireAdmin } from "@/services/auth-actions";
import { readFlash } from "@/utils/flash";

type PageParams = {

  deleted?: string;
  created?: string;
  saved?: string;
  err?: string;
  msg?: string;
  page?: string;
  q?: string;
  [key: string]: string | undefined;
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Courses</h1>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
        >
          Add course
        </Link>
      </div>

      <ActionToast trigger={params.created === "1"} paramName="created" message="Course created successfully." variant="success" />
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Course updated successfully." variant="success" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Course deleted successfully." variant="success" />
      
      {readFlash(params) && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          {readFlash(params)}
        </p>
      )}

      <AdminListPage
        basePath="/admin/courses"
        params={params}
        q={q}
        searchPlaceholder="Search by title, category, or instructor"
        emptyText="No courses yet."
        noMatchText="No courses match your search."
        load={async (page, pageSize) => {
          const [{ items, totalCount }, enrollmentCounts] = await Promise.all([
            getAllCoursesPaginated(page, pageSize, q),
            getEnrollmentCountsByCourse(),
          ]);
          return { items, totalCount, enrollmentCounts };
        }}
      >
        {({ items: courses, enrollmentCounts }) => (
          <AdminCoursesTable courses={courses} enrollmentCounts={enrollmentCounts} />
        )}
      </AdminListPage>
    </div>
  );
}
