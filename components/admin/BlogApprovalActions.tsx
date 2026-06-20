"use client";

import Link from "next/link";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveBlogPost, rejectBlogPost } from "@/app/admin/blog-approvals/actions";

export function BlogApprovalActions({ postId }: { postId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ConfirmationModal 
        title="Approve Blog Post" 
        description="Approve this blog post and publish it on the public blog?" 
        actionLabel="Approve" 
        variant="primary" 
        onConfirm={async () => { 
          const result = await approveBlogPost(postId, "/admin/blog-approvals"); 
          if (result?.error) window.alert(result.error); 
        }} 
        trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} 
      />
      <ConfirmationModal 
        title="Reject Blog Post" 
        description="Reject this blog post and mark it as declined?" 
        actionLabel="Reject" 
        variant="destructive" 
        onConfirm={async () => { 
          const result = await rejectBlogPost(postId, "/admin/blog-approvals"); 
          if (result?.error) window.alert(result.error); 
        }} 
        trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} 
      />
      <Link
        href={`/admin/blogs/${postId}/edit`}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent-muted/50"
      >
        Edit
      </Link>
    </div>
  );
}
