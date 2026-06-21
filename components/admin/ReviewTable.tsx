"use client";

import Link from "next/link";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveStudentReview, rejectStudentReview } from "@/app/admin/review-approvals/actions";
import { StarRating } from "@/components/reviews/StarRating";
import type { StudentReviewWithUser } from "@/lib/student-reviews";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ReviewName({ review }: { review: StudentReviewWithUser }) {
  return review.user.name ?? "—";
}

import { useToast } from "@/components/shared/ToastProvider";

function ReviewActions({
  reviewId,
  pending = false,
}: {
  reviewId: string;
  pending?: boolean;
}) {
  const { addToast } = useToast();
  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/admin/review-approvals/${reviewId}`} className="font-medium text-primary hover:underline">
        View
      </Link>
      <Link
        href={`/admin/review-approvals/${reviewId}/edit`}
        className="font-medium text-primary hover:underline"
      >
        Edit
      </Link>
      {pending && (
        <>
          <ConfirmationModal title="Approve Review" description="Approve this review and display it on the public course page?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveStudentReview(reviewId, false); if (result?.error) addToast(result.error, "error"); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />
          <ConfirmationModal title="Reject Review" description="Reject this review and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectStudentReview(reviewId); if (result?.error) addToast(result.error, "error"); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />
        </>
      )}
    </div>
  );
}

export function ReviewTable({
  reviews,
  showHomepage = false,
  pendingActions = false,
  emptyMessage,
}: {
  reviews: StudentReviewWithUser[];
  showHomepage?: boolean;
  pendingActions?: boolean;
  emptyMessage: string;
}) {
  if (reviews.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Email</th>
          <th className="px-4 py-3 font-medium">Course</th>
          <th className="px-4 py-3 font-medium">Location</th>
          <th className="px-4 py-3 font-medium">Stars</th>
          <th className="px-4 py-3 font-medium">Review</th>
          {showHomepage && <th className="px-4 py-3 font-medium">Homepage</th>}
          <th className="px-4 py-3 font-medium">Submitted</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {reviews.map((review) => (
          <tr key={review.id}>
            <td className="px-4 py-3 font-medium text-foreground">
              <ReviewName review={review} />
            </td>
            <td className="px-4 py-3 text-muted">{review.user.email}</td>
            <td className="px-4 py-3 text-muted">{review.course?.trim() || "Darse Quran Academy"}</td>
            <td className="px-4 py-3 text-muted">{review.location?.trim() || "—"}</td>
            <td className="px-4 py-3">
              <StarRating rating={review.rating} size="sm" />
            </td>
            <td className="max-w-xs px-4 py-3 text-muted">
              <p className="line-clamp-2">&ldquo;{review.quote}&rdquo;</p>
            </td>
            {showHomepage && (
               <td className="px-4 py-3 text-muted">
                 {review.featuredOnHomepage ? "Featured" : "Not featured"}
               </td>
            )}
            <td className="px-4 py-3 text-muted">{formatDate(review.createdAt)}</td>
            <td className="whitespace-nowrap px-4 py-3">
              <ReviewActions reviewId={review.id} pending={pendingActions} />
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}
