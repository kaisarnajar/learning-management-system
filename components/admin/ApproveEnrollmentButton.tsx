"use client";

import { approveEnrollmentRequest } from "@/app/admin/enrollments/actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function ApproveEnrollmentButton({
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
      title="Approve Enrollment"
      description="Approve this enrollment and grant the student access to the course?"
      actionLabel="Approve"
      variant="primary"
      onConfirm={async () => {
         const result = await approveEnrollmentRequest(enrollmentId, courseId, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">
          Approve enrollment
        </button>
      }
    />
  );
}
