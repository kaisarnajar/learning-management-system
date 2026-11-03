import Link from "next/link";
import { AdminListPage } from "@/components/shared/AdminListPage";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { getAllTeachersPaginated } from "@/services/teachers";
import { parseSearchQuery } from "@/utils/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import { AdminTeachersTable } from "@/components/admin/AdminTeachersTable";

import { requireAdmin } from "@/services/auth-actions";

type PageParams = {

  deleted?: string;
  created?: string;
  saved?: string;
  page?: string;
  q?: string;
  [key: string]: string | undefined;
};

function TeachersSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Teachers</h1>
          <div className="mt-1 h-4 w-48 rounded bg-border/40 animate-pulse" />
        </div>
        <div className="h-11 w-32 rounded-md bg-border/40 animate-pulse" />
      </div>
      <TableSkeleton />
    </>
  );
}

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  return (
    <div>
      <AdminListPage
        basePath="/admin/teachers"
        params={params}
        q={q}
        searchPlaceholder="Search by name, email, or specialization"
        emptyText="No teachers yet."
        noMatchText="No teachers match your search."
        skeleton={<TeachersSkeleton />}
        load={(page, pageSize) => getAllTeachersPaginated(page, pageSize, q)}
        header={({ totalCount }) => (
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
          </>
        )}
      >
        {({ items: teachers }) => (
          <AdminTeachersTable teachers={teachers} />
        )}
      </AdminListPage>
    </div>
  );
}
