import Link from "next/link";
import { DeleteBlogPostButton } from "@/components/admin/DeleteBlogPostButton";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { blogApprovalStatusClass, blogApprovalStatusLabel } from "@/lib/blog-approval";
import { getAllBlogPostsForAdminPaginated, isBlogPubliclyVisible } from "@/lib/blogs";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import type { BlogPost } from "@prisma/client";

function statusBadge(post: Pick<BlogPost, "approvalStatus" | "published">) {
  return {
    label: blogApprovalStatusLabel(post.approvalStatus, post.published),
    className: blogApprovalStatusClass(post.approvalStatus, post.published),
  };
}

export default async function AdminBlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string; saved?: string; deleted?: string; error?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const { items: posts, totalCount } = await getAllBlogPostsForAdminPaginated(
    requestedPage,
    pageSize,
    q,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Blogs</h1>
          <p className="mt-1 text-sm text-muted">
            Write articles or review teacher submissions in Blog approvals.
          </p>
        </div>
        <Link
          href="/admin/blogs/new"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          New blog post
        </Link>
      </div>

      {params.posted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Blog post created.</p>
      )}
      {params.saved === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Blog post updated.</p>
      )}
      {params.deleted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Blog post deleted.</p>
      )}
      {params.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">Blog post not found.</p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action="/admin/blogs"
          query={q}
          placeholder="Search by title or author"
          totalCount={q ? totalCount : undefined}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {q ? "No blog posts match your search." : "No blog posts yet."}
          </p>
        ) : (
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Images</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Homepage</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => {
                const badge = statusBadge(post);
                return (
                  <tr key={post.id} className="hover:bg-background/30">
                    <td className="px-4 py-3 font-medium text-foreground">{post.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{post.images.length}</td>
                    <td className="px-4 py-3 text-muted">{post.createdBy?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {post.featuredOnHomepage && isBlogPubliclyVisible(post) ? "Featured" : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {post.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {post.published && post.approvalStatus === "APPROVED" && (
                          <Link
                            href={`/blog/${post.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted hover:text-primary"
                          >
                            View
                          </Link>
                        )}
                        <Link
                          href={`/admin/blogs/${post.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteBlogPostButton id={post.id} title={post.title} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        basePath="/admin/blogs"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
