"use client";

import { deleteTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";

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
  const message = isPublished
    ? `Delete “${title}”? It will be removed from the public blog. This cannot be undone.`
    : `Delete “${title}”? This cannot be undone.`;

  return (
    <form
      action={deleteTeacherBlogPost.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm font-medium text-destructive-text hover:underline">
        Delete
      </button>
    </form>
  );
}
