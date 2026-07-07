import Link from "next/link";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteStudentUser as deleteStudent } from "@/app/admin/students/actions";
import { type User } from "@prisma/client";

import { adminActionButtonClassName } from "@/lib/form";

export function AdminStudentsTable({ students }: { students: User[] }) {
  return (
    <table className="w-full min-w-ui-640 text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Registration No</th>
          <th className="px-4 py-3 font-medium">Student</th>
          <th className="px-4 py-3 font-medium">Email</th>
          <th className="px-4 py-3 font-medium">Registered</th>
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
