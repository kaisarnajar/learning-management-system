"use client";

import { rejectEnrollmentRequest } from "@/app/admin/enrollments/actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function RejectEnrollmentButton({
  enrollmentId,
  courseId,
}: {
  enrollmentId: string;
  courseId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  return (
    <ConfirmationModal
      title="Reject Enrollment"
      description="Reject this enrollment? The student will be notified."
      actionLabel="Reject"
      variant="destructive"
      onConfirm={async () => {
         const result = await rejectEnrollmentRequest(enrollmentId, courseId, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">
          Reject enrollment
        </button>
      }
    />
  );
}
