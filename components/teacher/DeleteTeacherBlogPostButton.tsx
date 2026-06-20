"use client";

import { deleteTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteTeacherBlogPostButtonProps = {
  id: string;
  title: string;
  /** When true, warn that the live public post will be removed. */
  isPublished?: boolean;
};

export function DeleteTeacherBlogPostButton({
  id,
  title,
  isPublished = false,
}: DeleteTeacherBlogPostButtonProps) {
  const warningMessage = isPublished
    ? `Are you sure? It will be removed from the public blog. This cannot be undone.`
    : undefined;

  return (
    <DeleteActionButton
      action={deleteTeacherBlogPost.bind(null, id)}
      itemName={title}
      warningMessage={warningMessage}
      className="text-sm font-medium text-destructive-text hover:underline"
    />
  );
}
