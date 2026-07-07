"use client";

import Link from "next/link";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveBlogPost, rejectBlogPost } from "@/app/admin/blog-approvals/actions";
import type { BlogPostWithImages } from "@/services/blogs";
import { useToast } from "@/components/shared/ToastProvider";

import { adminActionButtonClassName, adminDestructiveButtonClassName } from "@/utils/form";

export function BlogApprovalTable({
  pendingPosts,
}: {
  pendingPosts: BlogPostWithImages[];
}) {
  const { addToast } = useToast();
  return (
    <table className="w-full min-w-ui-880 text-left text-sm">
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
            <td className="px-4 py-3 text-muted">{post.images?.length ?? 0}</td>
            <td className="px-4 py-3 text-muted">
              {new Date(post.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <Link
                  href={`/admin/blog-approvals/${post.id}`}
                  className={adminActionButtonClassName}
                >
                  View
                </Link>
                <Link
                  href={`/admin/blogs/${post.id}/edit`}
                  className={adminActionButtonClassName}
                >
                  Edit
                </Link>
                <ConfirmationModal 
                  title="Approve Blog Post" 
                  description="Approve this blog post and publish it on the public blog?" 
                  actionLabel="Approve" 
                  variant="primary" 
                  onConfirm={async () => { 
                    const result = await approveBlogPost(post.id); 
                    if (result?.error) addToast(result.error, "error"); 
                  }} 
                  trigger={<button type="button" className={adminActionButtonClassName}>Approve</button>} 
                />
                <ConfirmationModal 
                  title="Reject Blog Post" 
                  description="Reject this blog post and mark it as declined?" 
                  actionLabel="Reject" 
                  variant="destructive" 
                  onConfirm={async () => { 
                    const result = await rejectBlogPost(post.id); 
                    if (result?.error) addToast(result.error, "error"); 
                  }} 
                  trigger={<button type="button" className={adminDestructiveButtonClassName}>Reject</button>} 
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
