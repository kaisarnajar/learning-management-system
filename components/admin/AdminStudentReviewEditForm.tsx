"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { BRAND_CONFIG } from "@/config/brand";
import { useState, useTransition } from "react";
import {
  approveStudentReview,
  rejectStudentReview,
  saveApprovedReviewHomepageSetting,
} from "@/app/admin/review-approvals/actions";
import { StarRating } from "@/components/reviews/StarRating";
import { HOMEPAGE_FEATURED_REVIEWS_MAX } from "@/services/student-reviews";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import type { StudentReviewStatus } from "@prisma/client";
import { useToast } from "@/components/shared/ToastProvider";

type AdminStudentReviewEditFormProps = {
  review: {
    id: string;
    quote: string;
    course: string | null;
    location: string | null;
    rating: number;
    status: StudentReviewStatus;
    featuredOnHomepage: boolean;
    createdAt: Date;
    user: { name: string | null; email: string };
  };
  featuredCount: number;
  canFeature: boolean;
};

export function AdminStudentReviewEditForm({
  review,
  featuredCount,
  canFeature,
}: AdminStudentReviewEditFormProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const isPending = review.status === "PENDING";
  const isCurrentlyFeatured = review.featuredOnHomepage;
  const canFeatureThisReview = isCurrentlyFeatured || canFeature;
  const [featureOnHomepage, setFeatureOnHomepage] = useState(review.featuredOnHomepage);
  const [pending, startTransition] = useTransition();

  function getReturnTo() {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handleSaveHomepage() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (featureOnHomepage) {
          formData.set("featuredOnHomepage", "on");
        }
        const result = await saveApprovedReviewHomepageSetting(review.id, formData);
        if (result?.error) {
          addToast(result.error, "error");
        } else {
          addToast("Homepage settings saved.", "success");
        }
      } catch (error) {
        if (isRedirectError(error)) throw error;
        addToast("An unexpected error occurred.", "error");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
        Review content was submitted by the student and cannot be changed here. You can manage homepage
        visibility below.
      </p>

      <dl className="grid gap-3 text-sm">
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
          <dt className="shrink-0 font-medium text-foreground sm:w-28">Rating</dt>
          <dd>
            <StarRating rating={review.rating} />
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

      <div className="space-y-3 rounded-lg border border-border bg-background/40 px-4 py-4">
        <label
          className={`flex items-start gap-3 text-sm ${canFeatureThisReview ? "cursor-pointer text-foreground" : "text-muted"}`}
        >
          <input
            type="checkbox"
            checked={featureOnHomepage}
            disabled={pending || (!canFeatureThisReview && !featureOnHomepage)}
            onChange={(e) => setFeatureOnHomepage(e.target.checked)}
            className="mt-1 rounded border-border disabled:cursor-not-allowed"
          />
          <span>
            <span className="font-medium">Show on homepage</span>
            <span className="mt-0.5 block text-muted">
              Featured in the student reviews section on the homepage (up to {HOMEPAGE_FEATURED_REVIEWS_MAX};{" "}
              {featuredCount}/{HOMEPAGE_FEATURED_REVIEWS_MAX} slots used).
            </span>
          </span>
        </label>
        {!canFeatureThisReview && (
          <p className="text-xs text-muted">
            The homepage already has {HOMEPAGE_FEATURED_REVIEWS_MAX} reviews. Remove one before featuring this
            review.
          </p>
        )}
      </div>

      {isPending ? (
        <div className="flex flex-wrap gap-2">
          <ConfirmationModal
            title="Approve Review"
            description="Approve this student review?"
            actionLabel="Approve"
            variant="primary"
            onConfirm={async () => {
              const result = await approveStudentReview(review.id, featureOnHomepage, getReturnTo());
              if (result?.error) { addToast(result.error, "error"); }
            }}
            trigger={
              <button
                type="button"
                className="min-h-11 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60"
              >
                Approve
              </button>
            }
          />
          <ConfirmationModal
            title="Reject Review"
            description="Reject this review? The student can edit and resubmit."
            actionLabel="Reject"
            variant="destructive"
            onConfirm={async () => {
              const result = await rejectStudentReview(review.id, getReturnTo());
              if (result?.error) { addToast(result.error, "error"); }
            }}
            trigger={
              <button
                type="button"
                className="min-h-11 rounded-md border border-red-300 px-6 py-2.5 text-sm font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60"
              >
                Reject
              </button>
            }
          />
        </div>
      ) : review.status === "APPROVED" ? (
        <button
          type="button"
          onClick={handleSaveHomepage}
          disabled={pending}
          className="min-h-11 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60"
        >
          {pending ? "…" : "Save changes"}
        </button>
      ) : null}
    </div>
  );
}
