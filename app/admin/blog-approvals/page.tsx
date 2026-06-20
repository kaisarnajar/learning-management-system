import Link from "next/link";

import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveBlogPost, rejectBlogPost } from "@/app/admin/blog-approvals/actions";

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
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Submitted by</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Images</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendingPosts.map((post) => (
                <tr key={post.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{post.title}</td>
                  <td className="px-4 py-3 text-muted">{post.createdBy?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{post.createdBy?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{post.images.length}</td>
                  <td className="px-4 py-3 text-muted">
                    {post.createdAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/blog-approvals/${post.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/blogs/${post.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <ConfirmationModal title="Approve Blog Post" description="Approve this blog post and publish it on the public blog?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveBlogPost(post.id); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />
                      <ConfirmationModal title="Reject Blog Post" description="Reject this blog post and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectBlogPost(post.id); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
