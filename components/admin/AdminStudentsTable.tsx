import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteStudentUser as deleteStudent } from "@/app/admin/students/actions";
import { type User } from "@prisma/client";

import { adminActionButtonClassName } from "@/utils/form";

type AdminStudentsTableProps = {
  students: User[];
  currentSort?: string;
  params?: Record<string, string | undefined>;
};

function buildSortHref(
  key: "regNo" | "name" | "email" | "date",
  currentSort: string,
  params: Record<string, string | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [pKey, pVal] of Object.entries(params)) {
    if (pVal !== undefined && pVal !== "" && pKey !== "page" && pKey !== "sort") {
      searchParams.set(pKey, pVal);
    }
  }

  let nextSort: string;
  if (currentSort === `${key}_asc`) {
    nextSort = `${key}_desc`;
  } else if (currentSort === `${key}_desc`) {
    nextSort = `${key}_asc`;
  } else {
    nextSort = `${key}_asc`;
  }

  if (nextSort !== "regNo_asc") {
    searchParams.set("sort", nextSort);
  }

  const qs = searchParams.toString();
  return qs ? `/admin/students?${qs}` : "/admin/students";
}

function SortHeaderLink({
  label,
  sortKey,
  currentSort,
  params,
}: {
  label: string;
  sortKey: "regNo" | "name" | "email" | "date";
  currentSort: string;
  params: Record<string, string | undefined>;
}) {
  const isActive = currentSort.startsWith(`${sortKey}_`);
  const direction = currentSort === `${sortKey}_desc` ? "desc" : "asc";

  return (
    <Link
      href={buildSortHref(sortKey, currentSort, params)}
      className="group inline-flex items-center gap-1 hover:text-foreground focus:outline-none"
      title={`Sort by ${label} (${isActive && direction === "asc" ? "Descending" : "Ascending"})`}
    >
      <span>{label}</span>
      <span className="text-xs">
        {isActive ? (
          <span className="text-primary">{direction === "asc" ? "▲" : "▼"}</span>
        ) : (
          <span className="text-muted/40 group-hover:text-muted">↕</span>
        )}
      </span>
    </Link>
  );
}

export function AdminStudentsTable({
  students,
  currentSort = "regNo_asc",
  params = {},
}: AdminStudentsTableProps) {
  return (
    <table className="w-full min-w-ui-640 text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">
            <SortHeaderLink label="Registration No" sortKey="regNo" currentSort={currentSort} params={params} />
          </th>
          <th className="px-4 py-3 font-medium">
            <SortHeaderLink label="Student" sortKey="name" currentSort={currentSort} params={params} />
          </th>
          <th className="px-4 py-3 font-medium">
            <SortHeaderLink label="Email" sortKey="email" currentSort={currentSort} params={params} />
          </th>
          <th className="px-4 py-3 font-medium">
            <SortHeaderLink label="Registered" sortKey="date" currentSort={currentSort} params={params} />
          </th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {students.map((student) => (
          <tr key={student.id}>
            <td className="px-4 py-3 font-medium text-foreground">{student.registrationNumber ?? "—"}</td>
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
                  className={adminActionButtonClassName}
                >
                  View
                </Link>
                <Link
                  href={`/admin/students/${student.id}/edit`}
                  className={adminActionButtonClassName}
                >
                  Edit
                </Link>
                <DeleteActionButton action={deleteStudent.bind(null, student.id)} itemName={student.name ?? student.email} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
