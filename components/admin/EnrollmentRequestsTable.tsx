"use client";

import Link from "next/link";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveEnrollmentRequest, rejectEnrollmentRequest } from "@/app/admin/enrollments/actions";
import type { PendingEnrollmentWithUser } from "@/lib/enrollments";

export function EnrollmentRequestsTable({
  enrollments,
  courseTitleById,
  emptyMessage,
  showApprove,
  showReject = true,
}: {
  enrollments: PendingEnrollmentWithUser[];
  courseTitleById: Map<string, string>;
  emptyMessage: string;
  showApprove: boolean;
  showReject?: boolean;
}) {
  if (enrollments.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Student</th>
          <th className="px-4 py-3 font-medium">Course</th>
          <th className="px-4 py-3 font-medium">Requested</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {enrollments.map((enrollment) => (
          <tr key={enrollment.id}>
            <td className="px-4 py-3">
              <p className="font-medium text-foreground">{enrollment.user.name ?? "—"}</p>
              <p className="text-xs text-muted">{enrollment.user.email}</p>
            </td>
            <td className="px-4 py-3 text-foreground">
              {courseTitleById.get(enrollment.courseId) ?? enrollment.courseId}
            </td>
            <td className="px-4 py-3 text-muted">
              {new Date(enrollment.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex flex-wrap justify-end gap-2">
                {showApprove && (
                  <ConfirmationModal 
                    title="Approve Enrollment" 
                    description="Approve this student enrollment and notify them?" 
                    actionLabel="Approve" 
                    variant="primary" 
                    onConfirm={async () => { 
                      const result = await approveEnrollmentRequest(enrollment.id, enrollment.courseId); 
                      if (result?.error) window.alert(result.error); 
                    }} 
                    trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} 
                  />
                )}
                {showReject && (
                  <ConfirmationModal 
                    title="Reject Enrollment" 
                    description="Reject this student enrollment and notify them?" 
                    actionLabel="Reject" 
                    variant="destructive" 
                    onConfirm={async () => { 
                      const result = await rejectEnrollmentRequest(enrollment.id, enrollment.courseId); 
                      if (result?.error) window.alert(result.error); 
                    }} 
                    trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} 
                  />
                )}
                <Link
                  href={`/admin/students/${enrollment.user.id}`}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent-muted/50"
                >
                  Student profile
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}
