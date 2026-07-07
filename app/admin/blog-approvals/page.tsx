


import { BlogApprovalTable } from "@/components/admin/BlogApprovalTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getPendingBlogPostsForAdminPaginated } from "@/services/blog-approval";
import { clampPage, parsePaginationParams } from "@/utils/pagination";
import { parseSearchQuery } from "@/utils/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";


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

      <ActionToast trigger={params.approved === "1"} paramName="approved" message="Blog post approved and published." variant="info" />
      <ActionToast trigger={params.rejected === "1"} paramName="rejected" message="Blog post rejected. The teacher can edit and resubmit." variant="warning" />
      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Changes saved." variant="info" />

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
