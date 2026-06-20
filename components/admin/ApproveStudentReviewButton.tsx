"use client";

import { approveStudentReview } from "@/app/admin/review-approvals/actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function ApproveStudentReviewButton({ reviewId }: { reviewId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  return (
    <ConfirmationModal
      title="Approve Review"
      description="Approve this student review?"
      actionLabel="Approve"
      variant="primary"
      onConfirm={async () => {
         const result = await approveStudentReview(reviewId, false, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">
          Approve
        </button>
      }
    />
  );
}
