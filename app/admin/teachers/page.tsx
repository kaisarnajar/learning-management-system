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


export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; created?: string; saved?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const { items: teachers, totalCount } = await getAllTeachersPaginated(requestedPage, pageSize, q);
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Teacher</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{teacher.name}</td>
                  <td className="px-4 py-3 text-muted">{teacher.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {teacher.createdAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge published={teacher.published} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/teachers/${teacher.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/teachers/${teacher.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteActionButton action={deleteTeacher.bind(null, teacher.id)} itemName={teacher.name ?? teacher.email} className="text-sm font-medium text-destructive-text hover:underline" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        basePath="/admin/teachers"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
