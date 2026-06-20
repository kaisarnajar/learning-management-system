"use client";

import { deleteStudentReview } from "@/app/profile/reviews/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteStudentReviewButtonProps = {
  id: string;
  onHomepage?: boolean;
};

export function DeleteStudentReviewButton({ id, onHomepage = false }: DeleteStudentReviewButtonProps) {
  const warningMessage = onHomepage
    ? "Are you sure? It will be removed from the homepage. This cannot be undone."
    : undefined;

  return (
    <DeleteActionButton
      action={deleteStudentReview.bind(null, id)}
      itemName="review"
      warningMessage={warningMessage}
      className="text-sm font-medium text-destructive-text hover:underline"
    />
  );
}
