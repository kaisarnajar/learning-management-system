import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteStudentUser as deleteStudent } from "@/app/admin/students/actions";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { getStudentUsersPaginated } from "@/lib/students";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import { AdminStudentsTable } from "@/components/admin/AdminStudentsTable";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const { items: students, totalCount } = await getStudentUsersPaginated(requestedPage, pageSize, q);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary">Students</h1>
        <p className="mt-1 text-sm text-muted">
          Registered student accounts and their course enrollments. You can remove individual enrollments
          on a student&apos;s profile or delete the entire account.
        </p>
      </div>

      <ActionToast trigger={params.deleted === "1"} paramName="deleted" message="Student account deleted." variant="info" />

      <div className="mt-6">
        <ListSearchForm
          action="/admin/students"
          query={q}
          placeholder="Search by name or email"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {q ? "No students match your search." : "No student accounts yet."}
          </p>
        ) : (
          <AdminStudentsTable students={students} />
        )}
      </div>

      <Pagination
        basePath="/admin/students"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
