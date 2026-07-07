import Link from "next/link";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllCoursesPaginated } from "@/lib/courses";
import { getEnrollmentCountsByCourse } from "@/lib/enrollments";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import { AdminCoursesTable } from "@/components/admin/AdminCoursesTable";
import { Suspense } from "react";

type PageParams = {

  deleted?: string;
  created?: string;
  saved?: string;
  deleteError?: string;
  page?: string;
  q?: string;
  [key: string]: string | undefined;
};

async function AdminCoursesList({ params, q }: { params: PageParams; q?: string }) {
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const [{ items: courses, totalCount }, enrollmentCounts] = await Promise.all([
    getAllCoursesPaginated(requestedPage, pageSize, q),
    getEnrollmentCountsByCourse(),
  ]);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
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
          <AdminCoursesTable courses={courses} enrollmentCounts={enrollmentCounts} />
        )}
      </div>

      <Pagination
        basePath="/admin/courses"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </>
  );
}

function TableSkeleton() {
  return (
    <>
      <div className="mt-6 h-10 w-full max-w-sm rounded-md bg-border/40 animate-pulse" />
      <div className="mt-4 h-ui-400 w-full rounded-lg bg-border/40 animate-pulse" />
    </>
  );
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
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
      
      {params.deleteError && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          {decodeURIComponent(params.deleteError)}
        </p>
      )}

      <Suspense fallback={<TableSkeleton />}>
        <AdminCoursesList params={params} q={q} />
      </Suspense>
    </div>
  );
}
