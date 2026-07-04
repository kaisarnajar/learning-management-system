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
import { ActionToast } from "@/components/shared/ToastProvider";


type TabType = "pending" | "approved";

function tabHref(type: TabType) {
  const params = new URLSearchParams();
  if (type !== "pending") params.set("type", type);
  const qs = params.toString();
  return qs ? `/admin/review-approvals?${qs}` : "/admin/review-approvals";
}

export default async function AdminReviewApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    approved?: string;
    rejected?: string;
    unfeatured?: string;
    featured?: string;
    saved?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  
  const validTypes: TabType[] = ["pending", "approved"];
  const type: TabType = validTypes.includes(params.type as TabType) ? (params.type as TabType) : "pending";

  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  // We only fetch full paginated data for the active tab, and just count/minimal data for inactive ones.
  const [pendingResult, approvedResult, featuredCount] = await Promise.all([
    type === "pending"
      ? getPendingStudentReviewsForAdminPaginated(requestedPage, pageSize, q)
      : getPendingStudentReviewsForAdminPaginated(1, 1, q), // minimal for count
    type === "approved"
      ? getApprovedStudentReviewsForAdminPaginated(requestedPage, pageSize, q)
      : getApprovedStudentReviewsForAdminPaginated(1, 1, q), // minimal for count
    getFeaturedHomepageReviewCount(),
  ]);

  const pendingTotalCount = pendingResult.totalCount;
  const approvedTotalCount = approvedResult.totalCount;

  const activeResult = type === "pending" ? pendingResult : approvedResult;
  const safePage = clampPage(requestedPage, activeResult.totalCount, pageSize);

  const tabs = [
    { label: "Pending Approvals", value: "pending" as TabType, count: pendingTotalCount, showBadge: true },
    { label: "Approved Reviews", value: "approved" as TabType, count: approvedTotalCount, showBadge: true },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Review</h1>
      <p className="mt-1 text-sm text-muted">
        Approve student reviews before they can appear on the homepage. Removing from the homepage does not
        delete a review — manage all approved reviews below.
      </p>

      <ActionToast trigger={params.approved === "1"} paramName="approved" message="Review updated." variant="info" />
      <ActionToast trigger={params.rejected === "1"} paramName="rejected" message="Review rejected. The student can edit and resubmit." variant="warning" />
      <ActionToast trigger={params.unfeatured === "1"} paramName="unfeatured" message="Review removed from the homepage." variant="info" />
      <ActionToast trigger={params.featured === "1"} paramName="featured" message="Review added to the homepage." variant="success" />
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Changes saved." variant="info" />

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Review type">
        {tabs.map((item) => {
          const active = type === item.value;
          const href = tabHref(item.value);
          return (
            <Link
              key={item.value}
              href={href}
              className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "bg-surface text-foreground hover:bg-background/80 border border-border"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
              {item.showBadge && item.count > 0 && (
                <span
                  className={`ml-2 inline-flex h-5 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-warning-bg text-warning-text"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <ListSearchForm
          action="/admin/review-approvals"
          query={q}
          placeholder="Search by name, email, course, or review text"
          preserveParams={{ type: params.type }}
          totalCount={q ? activeResult.totalCount : undefined}
        />
      </div>

      <section className="mt-8">
        {type === "pending" ? (
          <>
            <p className="text-sm text-muted">
              Student reviews awaiting your approval before they can be featured.
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <ReviewTable
                reviews={activeResult.items}
                pendingActions
                emptyMessage={
                  q
                    ? "No pending reviews match your search."
                    : "No student reviews awaiting approval."
                }
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm text-muted">
                Every approved review stays here. Use Edit to add or remove homepage visibility.
              </p>
              <div className="shrink-0 text-sm font-medium text-foreground bg-surface border border-border px-3 py-1.5 rounded-md">
                {featuredCount} / {HOMEPAGE_FEATURED_REVIEWS_MAX} featured on homepage
              </div>
            </div>
            
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <ReviewTable
                reviews={activeResult.items}
                showHomepage
                emptyMessage={q ? "No approved reviews match your search." : "No approved reviews yet."}
              />
            </div>
          </>
        )}

        <Pagination
          basePath="/admin/review-approvals"
          params={params}
          page={safePage}
          totalCount={activeResult.totalCount}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
