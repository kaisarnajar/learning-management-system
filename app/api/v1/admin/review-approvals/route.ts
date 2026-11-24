import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { reviewJson } from "@/app/api/v1/admin/review-approvals/review-json";
import {
  HOMEPAGE_FEATURED_REVIEWS_MAX,
  getApprovedStudentReviewsForAdminPaginated,
  getFeaturedHomepageReviewCount,
  getPendingStudentReviewsForAdminPaginated,
} from "@/services/student-reviews";

/**
 * Student reviews, as on /admin/review-approvals. `type`: pending (default) or approved; `q` searches
 * name, e-mail, course and text. Also answers both tabs' counts and the homepage slots in use.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/review-approvals", async () => {
    const { page, pageSize, q, params } = staffListParams(request);
    const type = params.get("type") === "approved" ? "approved" : "pending";
    const search = q || undefined;
    const [pending, approved, featuredCount] = await Promise.all([
      type === "pending"
        ? getPendingStudentReviewsForAdminPaginated(page, pageSize, search)
        : getPendingStudentReviewsForAdminPaginated(1, 1, search),
      type === "approved"
        ? getApprovedStudentReviewsForAdminPaginated(page, pageSize, search)
        : getApprovedStudentReviewsForAdminPaginated(1, 1, search),
      getFeaturedHomepageReviewCount(),
    ]);
    const active = type === "pending" ? pending : approved;
    return {
      ...pagedBody(active.items.map(reviewJson), active.totalCount, page, pageSize),
      type,
      pendingCount: pending.totalCount,
      approvedCount: approved.totalCount,
      featuredCount,
      featuredMax: HOMEPAGE_FEATURED_REVIEWS_MAX,
    };
  });
}
