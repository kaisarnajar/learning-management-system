import Link from "next/link";
import { ReviewTable } from "@/components/admin/ReviewTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import {
  HOMEPAGE_FEATURED_REVIEWS_MAX,
  getApprovedStudentReviewsForAdminPaginated,
  getFeaturedHomepageReviewCount,
  getPendingStudentReviewsForAdminPaginated,
} from "@/lib/student-reviews";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminReviewApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    approved?: string;
    rejected?: string;
    unfeatured?: string;
    featured?: string;
    saved?: string;
    page?: string;
    approvedPage?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: pendingPage, pageSize } = parsePaginationParams(params);
  const { page: approvedPage, pageSize: approvedPageSize } = parsePaginationParams(params, {
    pageParam: "approvedPage",
  });

  const [pendingPaginated, approvedPaginated, featuredCount] = await Promise.all([
    getPendingStudentReviewsForAdminPaginated(pendingPage, pageSize, q),
    getApprovedStudentReviewsForAdminPaginated(approvedPage, approvedPageSize, q),
    getFeaturedHomepageReviewCount(),
  ]);

  const pendingReviews = pendingPaginated.items;
  const approvedReviews = approvedPaginated.items;
  const pendingTotalCount = pendingPaginated.totalCount;
  const approvedTotalCount = approvedPaginated.totalCount;
  const safePendingPage = clampPage(pendingPage, pendingTotalCount, pageSize);
  const safeApprovedPage = clampPage(approvedPage, approvedTotalCount, approvedPageSize);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Review approvals</h1>
      <p className="mt-1 text-sm text-muted">
        Approve student reviews before they can appear on the homepage. Removing from the homepage does not
        delete a review — manage all approved reviews below.
      </p>

      {params.approved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Review updated.</p>
      )}
      {params.rejected === "1" && (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Review rejected. The student can edit and resubmit.
        </p>
      )}
      {params.unfeatured === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Review removed from the homepage.
        </p>
      )}
      {params.featured === "1" && (
        <p className="mt-4 rounded-md bg-success-bg px-4 py-3 text-sm text-success-text">
          Review added to the homepage.
        </p>
      )}
      {params.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Changes saved.</p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action="/admin/review-approvals"
          query={q}
          placeholder="Search by name, email, course, or review text"
          preserveParams={{ approvedPage: params.approvedPage }}
          totalCount={q ? pendingTotalCount + approvedTotalCount : undefined}
        />
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Pending approval
          {pendingTotalCount > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-text">
              {pendingTotalCount}
            </span>
          )}
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <ReviewTable
            reviews={pendingReviews}
            pendingActions
            emptyMessage={
              q
                ? "No pending reviews match your search."
                : "No student reviews awaiting approval."
            }
          />
        </div>

        <Pagination
          basePath="/admin/review-approvals"
          params={params}
          page={safePendingPage}
          totalCount={pendingTotalCount}
          pageSize={pageSize}
        />
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          All reviews
          <span className="ml-2 text-sm font-normal text-muted">
            ({approvedTotalCount} approved · {featuredCount}/{HOMEPAGE_FEATURED_REVIEWS_MAX} on homepage)
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted">
          Every approved review stays here. Use Edit to add or remove homepage visibility.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <ReviewTable
            reviews={approvedReviews}
            showHomepage
            emptyMessage={q ? "No approved reviews match your search." : "No approved reviews yet."}
          />
        </div>

        <Pagination
          basePath="/admin/review-approvals"
          params={params}
          page={safeApprovedPage}
          totalCount={approvedTotalCount}
          pageSize={approvedPageSize}
          pageParam="approvedPage"
        />
      </section>
    </div>
  );
}
