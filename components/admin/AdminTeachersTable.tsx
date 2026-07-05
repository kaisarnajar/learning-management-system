import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteTeacher } from "@/app/admin/teachers/actions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { type Teacher } from "@prisma/client";

import { adminActionButtonClassName } from "@/lib/form";

export function AdminTeachersTable({ teachers }: { teachers: Teacher[] }) {
  return (
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
                  className={adminActionButtonClassName}
                >
                  View
                </Link>
                <Link
                  href={`/admin/teachers/${teacher.id}/edit`}
                  className={adminActionButtonClassName}
                >
                  Edit
                </Link>
                <DeleteActionButton action={deleteTeacher.bind(null, teacher.id)} itemName={teacher.name ?? teacher.email} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
