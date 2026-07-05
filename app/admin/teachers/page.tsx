import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteTeacher } from "@/app/admin/teachers/actions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { getAllTeachersPaginated } from "@/lib/teachers";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import { AdminTeachersTable } from "@/components/admin/AdminTeachersTable";

import { Suspense } from "react";

type PageParams = {
  deleted?: string;
  created?: string;
  saved?: string;
  page?: string;
  q?: string;
};

async function AdminTeachersList({ params, q }: { params: PageParams; q?: string }) {
  const { page: requestedPage, pageSize } = parsePaginationParams(params as any);
  const { items: teachers, totalCount } = await getAllTeachersPaginated(requestedPage, pageSize, q);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Teachers</h1>
          <p className="mt-1 text-sm text-muted">
            {totalCount} total — link registered accounts by email to grant the teacher portal.
          </p>
        </div>
        <Link
          href="/admin/teachers/new"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
        >
          Add teacher
        </Link>
      </div>

      <ActionToast trigger={params.created === "1"} paramName="created" message="Teacher created." variant="info" />
      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Teacher deleted." variant="info" />
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Changes saved." variant="info" />

      <div className="mt-6">
        <ListSearchForm
          action="/admin/teachers"
          query={q}
          placeholder="Search by name, email, or specialization"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q ? "No teachers match your search." : "No teachers yet."}
          </p>
        ) : (
          <AdminTeachersTable teachers={teachers} />
        )}
      </div>

      <Pagination
        basePath="/admin/teachers"
        params={params as any}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Teachers</h1>
          <div className="mt-1 h-4 w-48 rounded bg-border/40 animate-pulse" />
        </div>
        <div className="h-11 w-32 rounded-md bg-border/40 animate-pulse" />
      </div>
      <div className="mt-6 h-10 w-full max-w-sm rounded-md bg-border/40 animate-pulse" />
      <div className="mt-4 h-[400px] w-full rounded-lg bg-border/40 animate-pulse" />
    </>
  );
}

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  return (
    <div>
      <Suspense fallback={<TableSkeleton />}>
        <AdminTeachersList params={params} q={q} />
      </Suspense>
    </div>
  );
}
