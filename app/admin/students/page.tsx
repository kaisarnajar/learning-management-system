import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteStudentUser as deleteStudent } from "@/app/admin/students/actions";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { getStudentUsersPaginated } from "@/lib/students";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";


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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{student.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{student.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {student.createdAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                      <DeleteActionButton action={deleteStudent.bind(null, student.id)} itemName={student.name ?? student.email} className="text-sm font-medium text-destructive-text hover:underline" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
