import Link from "next/link";


import { BlogApprovalTable } from "@/components/admin/BlogApprovalTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getPendingBlogPostsForAdminPaginated } from "@/lib/blog-approval";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminBlogApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string; saved?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const { items: pendingPosts, totalCount } = await getPendingBlogPostsForAdminPaginated(
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Blog approvals</h1>
      <p className="mt-1 text-sm text-muted">
        Review blog posts submitted by teachers before they appear on the public blog page. Admin posts are
        published directly from Blogs.
      </p>

      {params.approved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Blog post approved and published.
        </p>
      )}
      {params.rejected === "1" && (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Blog post rejected. The teacher can edit and resubmit.
        </p>
      )}
      {params.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Changes saved.</p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action="/admin/blog-approvals"
          query={q}
          placeholder="Search by title or author"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {q
              ? "No blog posts match your search."
              : "No teacher blog posts awaiting approval."}
          </p>
        ) : (
          <BlogApprovalTable pendingPosts={pendingPosts} />
        )}
      </div>

      <Pagination
        basePath="/admin/blog-approvals"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
