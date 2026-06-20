"use client";

import { deleteLibraryItemById } from "@/app/admin/library/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteLibraryButtonProps = {
  id: string;
  label: string;
};

export function DeleteLibraryButton({ id, label }: DeleteLibraryButtonProps) {
  return (
    <DeleteActionButton
      action={deleteLibraryItemById.bind(null, id)}
      itemName={label}
      onSuccessRedirect="/admin/library?deleted=1"
    />
  );
}
