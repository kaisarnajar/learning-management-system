import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteStudentReview, saveApprovedReviewHomepageSetting } from "@/app/admin/review-approvals/actions";
import { reviewJson } from "@/app/api/v1/admin/review-approvals/review-json";
import { ADMIN_ROLES, readActionForm, staffAction, staffRead } from "@/services/api-staff";
import {
  HOMEPAGE_FEATURED_REVIEWS_MAX,
  getFeaturedHomepageReviewCount,
  getStudentReviewForAdmin,
} from "@/services/student-reviews";

type Params = { params: Promise<{ id: string }> };

/** One review, as on /admin/review-approvals/[id] and its edit page (with the homepage slots in use). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/review-approvals/[id]", async () => {
    const [review, featuredCount] = await Promise.all([getStudentReviewForAdmin(id), getFeaturedHomepageReviewCount()]);
    if (!review) notFound();
    return {
      review: reviewJson(review),
      featuredCount,
      featuredMax: HOMEPAGE_FEATURED_REVIEWS_MAX,
      canFeature: review.featuredOnHomepage || featuredCount < HOMEPAGE_FEATURED_REVIEWS_MAX,
    };
  });
}

/** Edit page "Save changes" for an approved review: featuredOnHomepage ("on" to show it on the homepage). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/review-approvals/[id] PATCH", async () =>
    saveApprovedReviewHomepageSetting(id, await readActionForm(request)),
  );
}

/** Deletes the review. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/review-approvals/[id] DELETE", () => deleteStudentReview(id));
}
