"use client";

import { approveBlogPost } from "@/app/admin/blog-approvals/actions";
import { ActionButton } from "@/components/shared/ActionButton";

export function ApproveBlogPostButton({ postId }: { postId: string }) {
  return (
    <ActionButton
      action={(returnTo) => approveBlogPost(postId, returnTo)}
      confirmMessage="Approve this blog post and publish it on the public blog?"
    >
      Approve
    </ActionButton>
  );
}
