"use server";

import { revalidatePath } from "next/cache";
import { adminReturnUrl } from "@/utils/admin-redirects";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { HOMEPAGE_FEATURED_REVIEWS_MAX, getFeaturedHomepageReviewCount } from "@/services/student-reviews";
import { withDbErrorHandling } from "@/utils/db-error";
import { revalidatePublicContent } from "@/services/public-cache";

function revalidateReviewPaths(reviewId?: string) {
  revalidatePath("/");

  revalidatePublicContent();
  revalidatePath("/profile/reviews");
  revalidatePath("/admin/review-approvals");
  if (reviewId) {
    revalidatePath(`/admin/review-approvals/${reviewId}`);
    revalidatePath(`/admin/review-approvals/${reviewId}/edit`);
  }
}

export async function approveStudentReview(
  reviewId: string,
  featureOnHomepage: boolean,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const review = await withDbErrorHandling(() => prisma.studentReview.findUnique({ where: { id: reviewId } }), "Database operation failed");
  if (!review) return { error: "Review not found." };
  if (review.status !== "PENDING") {
    return { error: "This review is no longer pending approval." };
  }

  let featuredOnHomepage = false;
  let featuredAt: Date | null = null;

  if (featureOnHomepage) {
    const featuredCount = await getFeaturedHomepageReviewCount();
    if (featuredCount >= HOMEPAGE_FEATURED_REVIEWS_MAX) {
      return {
        error: `The homepage already has ${HOMEPAGE_FEATURED_REVIEWS_MAX} reviews. Remove one before adding another.`,
      };
    }
    featuredOnHomepage = true;
    featuredAt = new Date();
  }

  await withDbErrorHandling(() => prisma.studentReview.update({
      where: { id: reviewId },
      data: {
        status: "APPROVED",
        featuredOnHomepage,
        featuredAt,
      },
    }), "Database operation failed");

  revalidateReviewPaths(reviewId);
  redirect(adminReturnUrl(returnTo, "/admin/review-approvals", "approved"));
}

export async function rejectStudentReview(
  reviewId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const review = await withDbErrorHandling(() => prisma.studentReview.findUnique({ where: { id: reviewId } }), "Database operation failed");
  if (!review) return { error: "Review not found." };
  if (review.status !== "PENDING") {
    return { error: "This review is no longer pending approval." };
  }

  await withDbErrorHandling(() => prisma.studentReview.update({
      where: { id: reviewId },
      data: {
        status: "REJECTED",
        featuredOnHomepage: false,
        featuredAt: null,
      },
    }), "Database operation failed");

  revalidateReviewPaths(reviewId);
  redirect(adminReturnUrl(returnTo, "/admin/review-approvals", "rejected"));
}

export async function saveApprovedReviewHomepageSetting(
  reviewId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();

  const review = await withDbErrorHandling(() => prisma.studentReview.findUnique({ where: { id: reviewId } }), "Database operation failed");
  if (!review) return { error: "Review not found." };
  if (review.status !== "APPROVED") {
    return { error: "Only approved reviews can update homepage settings." };
  }

  const featureOnHomepage = formData.get("featuredOnHomepage") === "on";

  if (featureOnHomepage && !review.featuredOnHomepage) {
    const featuredCount = await getFeaturedHomepageReviewCount();
    if (featuredCount >= HOMEPAGE_FEATURED_REVIEWS_MAX) {
      return {
        error: `The homepage already has ${HOMEPAGE_FEATURED_REVIEWS_MAX} reviews. Remove one first.`,
      };
    }

    await withDbErrorHandling(() => prisma.studentReview.update({
          where: { id: reviewId },
          data: { featuredOnHomepage: true, featuredAt: new Date() },
        }), "Database operation failed");

    revalidateReviewPaths(reviewId);
    redirect("/admin/review-approvals?featured=1");
  }

  if (!featureOnHomepage && review.featuredOnHomepage) {
    await withDbErrorHandling(() => prisma.studentReview.update({
          where: { id: reviewId },
          data: { featuredOnHomepage: false, featuredAt: null },
        }), "Database operation failed");

    revalidateReviewPaths(reviewId);
    redirect("/admin/review-approvals?unfeatured=1");
  }

  redirect("/admin/review-approvals?saved=1");
}

export async function deleteStudentReview(
  reviewId: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  try {
    await prisma.studentReview.delete({
      where: { id: reviewId },
    });
    revalidateReviewPaths(reviewId);
    return {};
  } catch (err) {
    console.error("Failed to delete review:", err);
    return { error: "Failed to delete review." };
  }
}
