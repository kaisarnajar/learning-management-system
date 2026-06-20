"use client";

import { rejectStudentReview } from "@/app/admin/review-approvals/actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

export function RejectStudentReviewButton({ reviewId }: { reviewId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  return (
    <ConfirmationModal
      title="Reject Review"
      description="Reject this review? The student can edit and resubmit."
      actionLabel="Reject"
      variant="destructive"
      onConfirm={async () => {
         const result = await rejectStudentReview(reviewId, returnTo);
         if (result?.error) { window.alert(result.error); }
      }}
      trigger={
        <button type="button" className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">
          Reject
        </button>
      }
    />
  );
}
