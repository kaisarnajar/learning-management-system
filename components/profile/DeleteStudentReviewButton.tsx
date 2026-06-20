"use client";

import { deleteStudentReview } from "@/app/profile/reviews/actions";

type DeleteStudentReviewButtonProps = {
  id: string;
  onHomepage?: boolean;
};

export function DeleteStudentReviewButton({ id, onHomepage = false }: DeleteStudentReviewButtonProps) {
  const message = onHomepage
    ? "Delete this review? It will be removed from the homepage. This cannot be undone."
    : "Delete this review? This cannot be undone.";

  return (
    <form
      className="contents"
      action={deleteStudentReview.bind(null, id)}
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
