import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveStudentReview, rejectStudentReview } from "@/app/admin/review-approvals/actions";

import { StarRating } from "@/components/reviews/StarRating";
import { reviewStatusClass, reviewStatusLabel, getStudentReviewForAdmin } from "@/lib/student-reviews";

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await getStudentReviewForAdmin(id);

  if (!review) notFound();

  const isPending = review.status === "PENDING";

  return (
    <div>
      <Link href="/admin/review-approvals" className="text-sm text-primary hover:underline">
        ← Back to review approvals
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Student review</h1>
          <p className="mt-1 text-sm text-muted">{review.user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/review-approvals/${id}/edit`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
          >
            Edit
          </Link>
          {isPending && (
            <>
              <ConfirmationModal title="Approve Review" description="Approve this review and display it on the public course page?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveStudentReview(review.id, false, "/admin/review-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />
              <ConfirmationModal title="Reject Review" description="Reject this review and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectStudentReview(review.id, "/admin/review-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />
            </>
          )}
        </div>
      </div>

      <dl className="mt-6 grid max-w-2xl gap-3 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Name</dt>
          <dd className="text-muted">{review.user.name ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Email</dt>
          <dd className="break-all text-muted">{review.user.email}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Course</dt>
          <dd className="text-muted">{review.course?.trim() || "Darse Quran Academy"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Location</dt>
          <dd className="text-muted">{review.location?.trim() || "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Rating</dt>
          <dd>
            <StarRating rating={review.rating} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Status</dt>
          <dd>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${reviewStatusClass(review.status)}`}
            >
              {reviewStatusLabel(review.status)}
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Homepage</dt>
          <dd className="text-muted">
            {review.featuredOnHomepage ? "Featured" : "Not featured"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Review</dt>
          <dd className="whitespace-pre-wrap text-muted">&ldquo;{review.quote}&rdquo;</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Submitted</dt>
          <dd className="text-muted">
            {review.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
