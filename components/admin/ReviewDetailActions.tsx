"use client";

import Link from "next/link";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveStudentReview, rejectStudentReview } from "@/app/admin/review-approvals/actions";
import { useToast } from "@/components/shared/ToastProvider";

export function ReviewDetailActions({
  reviewId,
  isPending,
}: {
  reviewId: string;
  isPending: boolean;
}) {
  const { addToast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/review-approvals/${reviewId}/edit`}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
      >
        Edit
      </Link>
      {isPending && (
        <>
          <ConfirmationModal
            title="Approve Review"
            description="Approve this review and display it on the public course page?"
            actionLabel="Approve"
            variant="primary"
            onConfirm={async () => {
              const result = await approveStudentReview(reviewId, false, "/admin/review-approvals");
              if (result?.error) addToast(result.error, "error");
            }}
            trigger={
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60"
              >
                Approve
              </button>
            }
          />
          <ConfirmationModal
            title="Reject Review"
            description="Reject this review and mark it as declined?"
            actionLabel="Reject"
            variant="destructive"
            onConfirm={async () => {
              const result = await rejectStudentReview(reviewId, "/admin/review-approvals");
              if (result?.error) addToast(result.error, "error");
            }}
            trigger={
              <button
                type="button"
                className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60"
              >
                Reject
              </button>
            }
          />
        </>
      )}
    </div>
  );
}
