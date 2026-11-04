import { getStudentUsersPaginated } from "@/services/students";
import { AdminListPage } from "@/components/shared/AdminListPage";
import { parseSearchQuery } from "@/utils/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";
import { AdminStudentsTable } from "@/components/admin/AdminStudentsTable";
import { StudentSortSelect } from "@/components/admin/StudentSortSelect";

import { requireAdmin } from "@/services/auth-actions";

type PageParams = {
  deleted?: string;
  page?: string;
  q?: string;
  sort?: string;
  [key: string]: string | undefined;
};

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const sort = params.sort || "regNo_asc";

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

      <AdminListPage
        basePath="/admin/students"
        params={params}
        q={q}
        searchPlaceholder="Search by registration no, name, or email"
        emptyText="No student accounts yet."
        noMatchText="No students match your search."
        preserveParams={{ sort: params.sort }}
        toolbar={<StudentSortSelect currentSort={sort} />}
        load={(page, pageSize) => getStudentUsersPaginated(page, pageSize, q, sort)}
      >
        {({ items: students }) => (
          <AdminStudentsTable students={students} currentSort={sort} params={params} />
        )}
      </AdminListPage>
    </div>
  );
}
