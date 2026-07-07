import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";
import { notFound } from "next/navigation";

import { ReviewDetailActions } from "@/components/admin/ReviewDetailActions";

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
        ← Back to review
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Student review</h1>
          <p className="mt-1 text-sm text-muted">{review.user.email}</p>
        </div>
        <ReviewDetailActions reviewId={review.id} isPending={isPending} />
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
          <dd className="text-muted">{review.course?.trim() || `${BRAND_CONFIG.name}`}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Location</dt>
          <dd className="text-muted">{review.location?.trim() || "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Status</dt>
          <dd>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${reviewStatusClass(
                review.status
              )}`}
            >
              {reviewStatusLabel(review.status)}
            </span>
          </dd>
        </div>
        {review.status === "APPROVED" && (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-foreground sm:w-28">Homepage</dt>
            <dd className="text-muted">
              {review.featuredOnHomepage ? (
                <span className="font-medium text-success-text">Featured</span>
              ) : (
                "Not featured"
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6 max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <StarRating rating={review.rating} />
          <time className="text-sm text-muted">
            {new Date(review.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
        </div>
        <div className="mt-4 whitespace-pre-wrap text-foreground">{review.quote}</div>
      </div>
    </div>
  );
}
