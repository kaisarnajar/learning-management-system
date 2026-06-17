import Link from "next/link";
import { DeleteStudentReviewButton } from "@/components/profile/DeleteStudentReviewButton";
import { StudentReviewForm } from "@/components/profile/StudentReviewForm";
import { StarRating } from "@/components/reviews/StarRating";
import { Pagination } from "@/components/shared/Pagination";
import { createStudentReview, updateStudentReview } from "@/app/profile/reviews/actions";
import { requireUser } from "@/lib/auth-actions";
import { clampPage, GRID_PAGE_SIZE, parsePaginationParams } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import {
  canStudentDeleteReview,
  canStudentEditReview,
  getStudentReviewForUser,
  getStudentReviewsForUserPaginated,
  reviewStatusClass,
  reviewStatusLabel,
} from "@/lib/student-reviews";

export default async function ProfileReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    submitted?: string;
    resubmitted?: string;
    deleted?: string;
    error?: string;
    edit?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireUser();
  const { page: requestedPage, pageSize } = parsePaginationParams(params, {
    pageSize: GRID_PAGE_SIZE,
  });

  const [reviewsPaginated, user, editingReviewFromDb] = await Promise.all([
    getStudentReviewsForUserPaginated(session.user.id, requestedPage, pageSize),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { address: true },
    }),
    params.edit
      ? getStudentReviewForUser(params.edit, session.user.id)
      : Promise.resolve(null),
  ]);

  const reviews = reviewsPaginated.items;
  const totalCount = reviewsPaginated.totalCount;
  const page = clampPage(requestedPage, totalCount, pageSize);

  const editingReview =
    editingReviewFromDb && canStudentEditReview(editingReviewFromDb, session.user.id)
      ? editingReviewFromDb
      : undefined;

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-foreground">My reviews</h2>
      <p className="mt-1 text-sm text-muted">
        Share your learning experience. Approved reviews may appear on the academy homepage. You can
        delete your own reviews anytime from Your submissions below.
      </p>

      {params.submitted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Thank you! Your review was submitted for admin approval.
        </p>
      )}
      {params.resubmitted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Your review was resubmitted for approval.
        </p>
      )}
      {params.deleted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Review deleted.</p>
      )}
      {params.error === "locked" && (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          This review can no longer be edited.
        </p>
      )}
      {params.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">Review not found.</p>
      )}
      {params.error && !["locked", "notfound"].includes(params.error) && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          {decodeURIComponent(params.error)}
        </p>
      )}

      {params.edit && !editingReview && params.error !== "locked" && params.error !== "notfound" && (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          This review cannot be edited. Only pending or rejected reviews can be changed.
        </p>
      )}

      {editingReview ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Edit review</h3>
            <Link href="/profile/reviews" className="text-sm text-primary hover:underline">
              Cancel
            </Link>
          </div>
          <StudentReviewForm
            key={editingReview.id}
            review={editingReview}
            action={updateStudentReview.bind(null, editingReview.id)}
            defaultLocation={user?.address}
          />
        </div>
      ) : (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Write a review</h3>
          <StudentReviewForm action={createStudentReview} defaultLocation={user?.address} />
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-foreground">Your submissions</h3>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => {
              const editable = canStudentEditReview(review, session.user.id);
              const deletable = canStudentDeleteReview(review, session.user.id);
              return (
                <li key={review.id} className="h-full">
                  <article className="card-elevated flex h-full flex-col p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${reviewStatusClass(review.status)}`}
                    >
                      {review.status === "APPROVED" && review.featuredOnHomepage
                        ? "On homepage"
                        : reviewStatusLabel(review.status)}
                    </span>
                    {(editable || deletable) && (
                      <div className="flex items-center gap-3">
                        {editable && (
                          <Link
                            href={`/profile/reviews?edit=${review.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Edit
                          </Link>
                        )}
                        {deletable && (
                          <DeleteStudentReviewButton
                            id={review.id}
                            onHomepage={review.status === "APPROVED" && review.featuredOnHomepage}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <StarRating rating={review.rating} className="mt-2" />
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-foreground">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                  {(review.course || review.location) && (
                    <p className="mt-2 line-clamp-1 text-xs text-muted">
                      {[review.course, review.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    Submitted {review.createdAt.toLocaleDateString("en-IN")}
                  </p>
                  </article>
                </li>
              );
            })}
          </ul>

          <Pagination
            basePath="/profile/reviews"
            params={params}
            page={page}
            totalCount={totalCount}
            pageSize={pageSize}
          />
        </div>
      )}
    </div>
  );
}
