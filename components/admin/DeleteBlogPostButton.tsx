"use client";

import { deleteBlogPost } from "@/app/admin/blogs/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

export function DeleteBlogPostButton({ id, title }: { id: string; title: string }) {
  return (
    <DeleteActionButton
      action={deleteBlogPost.bind(null, id)}
      itemName="blog post"
      className="text-sm font-medium text-destructive-text hover:underline"
    />
  );
}
