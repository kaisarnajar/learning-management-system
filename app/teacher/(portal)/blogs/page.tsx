import Link from "next/link";
import { DeleteTeacherBlogPostButton } from "@/components/teacher/DeleteTeacherBlogPostButton";
import { Pagination } from "@/components/shared/Pagination";
import { requireTeacher } from "@/lib/auth-actions";
import {
  blogApprovalStatusClass,
  blogApprovalStatusLabel,
  canTeacherDeleteBlogPost,
  canTeacherEditBlogPost,
} from "@/lib/blog-approval";
import { getTeacherBlogPostsPaginated } from "@/lib/blogs";
import { clampPage, parsePaginationParams } from "@/lib/pagination";

export default async function TeacherBlogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    submitted?: string;
    resubmitted?: string;
    deleted?: string;
    error?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { session } = await requireTeacher();
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const { items: posts, totalCount } = await getTeacherBlogPostsPaginated(
    session.user.id,
    requestedPage,
    pageSize,
  );
  const page = clampPage(requestedPage, totalCount, pageSize);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">My blog posts</h1>
          <p className="mt-1 text-sm text-muted">
            Write articles for the academy blog. Posts are reviewed by an admin before they go live.
          </p>
        </div>
        <Link
          href="/teacher/blogs/new"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          New blog post
        </Link>
      </div>

      {params.submitted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Your blog post was submitted for admin approval.
        </p>
      )}
      {params.resubmitted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Your changes were resubmitted for admin approval.
        </p>
      )}
      {params.deleted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">Blog post deleted.</p>
      )}
      {params.error === "notfound" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">Blog post not found.</p>
      )}
      {params.error === "locked" && (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          This post can no longer be edited because it has been approved or is awaiting review.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        {totalCount === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">You have not written any blog posts yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => {
                const editable = canTeacherEditBlogPost(post, session.user.id);
                const deletable = canTeacherDeleteBlogPost(post, session.user.id);
                return (
                  <tr key={post.id} className="hover:bg-background/30">
                    <td className="px-4 py-3 font-medium text-foreground">{post.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${blogApprovalStatusClass(post.approvalStatus, post.published)}`}
                      >
                        {blogApprovalStatusLabel(post.approvalStatus, post.published)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {post.updatedAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-3">
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
                        {editable && (
                          <Link
                            href={`/teacher/blogs/${post.id}/edit`}
                            className="font-medium text-primary hover:underline"
                          >
                            Edit
                          </Link>
                        )}
                        {deletable && (
                          <DeleteTeacherBlogPostButton
                            id={post.id}
                            title={post.title}
                            isPublished={post.published && post.approvalStatus === "APPROVED"}
                          />
                        )}
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
        basePath="/teacher/blogs"
        params={params}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
