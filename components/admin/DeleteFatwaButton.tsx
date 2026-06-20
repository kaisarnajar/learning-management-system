"use client";

import { deleteFatwaQuestion } from "@/app/admin/fatwa/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteFatwaButtonProps = {
  id: string;
  title: string;
};

export function DeleteFatwaButton({ id, title }: DeleteFatwaButtonProps) {
  return (
    <DeleteActionButton
      action={deleteFatwaQuestion.bind(null, id)}
      itemName={title}
      onSuccessRedirect="/admin/fatwa?deleted=1"
    />
  );
}
